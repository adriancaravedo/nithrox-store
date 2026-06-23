import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function twentyiRequest(path, method = 'GET', body = null) {
  const apiKey = process.env.TWENTYI_API_KEY
  if (!apiKey) throw new Error('TWENTYI_API_KEY not set')
  const encoded = Buffer.from(apiKey).toString('base64')
  const base = process.env.TWENTYI_API_BASE || 'https://api.20i.com'
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${encoded}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `20i ${res.status}`)
  return data
}

async function provisionHosting(sb, orderId, order) {
  const domain = order?.items?.domain?.full || order?.items?.domain || null
  if (!domain) {
    console.log('[20i] No domain in order — skipping provisioning')
    return
  }

  const cleanDomain = String(domain).replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()
  const resellerId = process.env.TWENTYI_RESELLER_ID

  let packageId = null
  let cpanelUrl = 'https://stackcp.com'

  if (resellerId && process.env.TWENTYI_API_KEY) {
    try {
      const result = await twentyiRequest(`/reseller/${resellerId}/addWeb`, 'POST', {
        type: process.env.TWENTYI_PACKAGE_TYPE || 'shared',
        domain_name: cleanDomain,
        label: `Kit Digital - ${order.client_name || cleanDomain}`,
      })
      packageId = result?.result || result?.id || result
      console.log('[20i] Package created:', packageId)
    } catch (err) {
      console.error('[20i] API error:', err.message)
      // Continue — still create the server record as "pending"
    }
  } else {
    console.warn('[20i] TWENTYI_RESELLER_ID or TWENTYI_API_KEY not set — saving server as pending')
  }

  // Always save a server record (even if 20i failed, shows "Configurando..." in portal)
  const serverPayload = {
    name: `Kit Digital — ${cleanDomain}`,
    type: 'Shared',
    ip: 'pendiente',
    plan: 'Kit Digital Hosting',
    provider: '20i',
    domain: cleanDomain,
    cpanel_url: cpanelUrl,
    monthly_cost: 0,
    currency: 'EUR',
    status: packageId ? 'online' : 'pending',
    cpu: 0, ram: 0, disk: 0, sites: 1,
    client_email: order.client_email || null,
    external_id: packageId ? String(packageId) : null,
  }

  let { data: server, error: serverError } = await sb.from('servers').insert(serverPayload).select('id').single()

  // If extra columns don't exist yet, retry without them
  if (serverError && (serverError.message?.includes('client_email') || serverError.message?.includes('external_id'))) {
    console.warn('[servers] retrying without optional columns:', serverError.message)
    const { name, type, ip, plan, provider, domain, cpanel_url, monthly_cost, currency, status, cpu, ram, disk, sites } = serverPayload
    const fallback = await sb.from('servers').insert({ name, type, ip, plan, provider, domain, cpanel_url, monthly_cost, currency, status, cpu, ram, disk, sites }).select('id').single()
    server = fallback.data
    serverError = fallback.error
  }

  if (serverError) {
    console.error('[servers] insert error:', serverError.message)
    return
  }

  if (server?.id) {
    // Link server to order using items JSON (avoids needing server_id column)
    const updatedItems = { ...(order.items || {}), server_id: server.id, hosting_domain: cleanDomain }
    await sb.from('orders').update({ items: updatedItems }).eq('id', orderId)
    console.log('[20i] Server record created:', server.id)
  }
}

export async function POST(request) {
  const body = await request.text()
  const sig  = request.headers.get('stripe-signature')

  let event
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('Stripe webhook signature failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const sb = supabase()

  switch (event.type) {
    case 'payment_intent.succeeded': {
      const pi = event.data.object
      const orderId = pi.metadata?.order_id
      if (orderId) {
        await sb.from('orders').update({
          status: 'active',
          payment_id: pi.id,
          validated_at: new Date().toISOString(),
        }).eq('id', orderId)
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const orderId = sub.metadata?.order_id
      if (orderId) {
        const isActive = sub.status === 'trialing' || sub.status === 'active'
        await sb.from('orders').update({
          status: isActive ? 'active' : 'pending',
          payment_id: sub.id,
          validated_at: new Date().toISOString(),
        }).eq('id', orderId)

        // Provision 20i hosting for Kit Digital on first subscription creation
        if (event.type === 'customer.subscription.created' && isActive) {
          try {
            const { data: order } = await sb
              .from('orders')
              .select('plan_id, client_name, client_email, items')
              .eq('id', orderId)
              .single()

            const isKitDigital = order?.plan_id === 'kit-digital' || order?.plan_id === 'kit_digital'
            const alreadyProvisioned = order?.items?.server_id

            if (isKitDigital && !alreadyProvisioned) {
              await provisionHosting(sb, orderId, order)
            }
          } catch (err) {
            console.error('[20i] provision error (non-blocking):', err.message)
          }
        }
      }
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const orderId = sub.metadata?.order_id
      if (orderId) {
        await sb.from('orders').update({ status: 'cancelled' }).eq('id', orderId)
      }
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object
      if (inv.subscription) {
        await sb.from('orders').update({ status: 'payment_failed' })
          .eq('payment_id', inv.subscription)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// POST /api/orders/validate
// Called by admin to validate a manual payment (transfer/crypto).
// Triggers: order status → 'paid', hosting/domain provisioning, CRM project activation.
// Body: { order_id, admin_key }
export async function POST(request) {
  try {
    const body = await request.json()
    const { order_id, admin_key } = body

    // Basic admin auth check (replace with proper auth in production)
    const expectedKey = process.env.ADMIN_VALIDATION_KEY || 'nithrox-admin-2024'
    if (admin_key !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!order_id) {
      return NextResponse.json({ error: 'order_id is required' }, { status: 400 })
    }

    const supabase = await createServerSupabase()

    // 1. Fetch the order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', order_id)
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 2. Update order status to 'paid'
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    // 3. Activate hosting on 20i (fire-and-forget)
    let hostingProvisioned = false
    const hostingOrder = await supabase
      .from('hosting_orders')
      .select('*')
      .eq('order_id', order_id)
      .maybeSingle()

    if (hostingOrder.data && !hostingOrder.data.twentyi_package_id) {
      try {
        const twentyiApiKey = process.env.TWENTYI_API_KEY
        if (twentyiApiKey) {
          const hostingRes = await fetch('https://api.20i.com/reseller/addWeb', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${twentyiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name:   order.items?.domain?.full || `site-${order_id}`,
              type:   hostingOrder.data.tier || 'starter',
            }),
          })
          const hostingData = await hostingRes.json()
          if (hostingData.id) {
            await supabase
              .from('hosting_orders')
              .update({ status: 'active', twentyi_package_id: hostingData.id })
              .eq('order_id', order_id)
            hostingProvisioned = true
          }
        } else {
          // No API key configured — mark as manually provisioned
          await supabase
            .from('hosting_orders')
            .update({ status: 'pending_manual', notes: 'No 20i API key configured' })
            .eq('order_id', order_id)
        }
      } catch (err) {
        console.error('[validate] 20i hosting error:', err)
      }
    }

    // 4. Register domain with RealTime (fire-and-forget)
    let domainRegistered = false
    const domainOrder = await supabase
      .from('domain_orders')
      .select('*')
      .eq('order_id', order_id)
      .maybeSingle()

    if (domainOrder.data && domainOrder.data.status === 'pending') {
      try {
        const realtimeUser     = process.env.REALTIME_USERNAME
        const realtimePassword = process.env.REALTIME_PASSWORD
        if (realtimeUser && realtimePassword) {
          const domainRes = await fetch('https://api.realtimeregister.com/v2/domains', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${Buffer.from(`${realtimeUser}:${realtimePassword}`).toString('base64')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              domainName: domainOrder.data.domain,
              period: 1,
              registrant: { handle: 'NITHROX-DEFAULT' },
            }),
          })
          if (domainRes.ok) {
            await supabase
              .from('domain_orders')
              .update({ status: 'active' })
              .eq('order_id', order_id)
            domainRegistered = true

            // Also add to admin domains table
            await supabase
              .from('domains')
              .insert({
                name: domainOrder.data.domain,
                status: 'active',
                order_id,
                registered_at: new Date().toISOString(),
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
              })
              .maybeSingle()
          }
        } else {
          await supabase
            .from('domain_orders')
            .update({ status: 'pending_manual', notes: 'No RealTime credentials configured' })
            .eq('order_id', order_id)
        }
      } catch (err) {
        console.error('[validate] domain registration error:', err)
      }
    }

    // 5. Activate CRM project
    if (order.crm_project_id) {
      await supabase
        .from('projects')
        .update({ status: 'Activo' })
        .eq('id', order.crm_project_id)
    }

    // 6. Activate CRM deal
    if (order.crm_deal_id) {
      await supabase
        .from('deals')
        .update({ stage: 'Won' })
        .eq('id', order.crm_deal_id)
    }

    // 7. Notify client via Supabase Realtime (broadcast to client's channel)
    // Client dashboard listens to 'client-{user_id}' channel
    if (order.user_id) {
      await supabase
        .from('client_notifications')
        .insert({
          user_id: order.user_id,
          type: 'payment_validated',
          title: 'Pago validado',
          message: 'Tu pago fue validado. Tus servicios están siendo activados.',
          order_id,
          read: false,
        })
        .maybeSingle()
    }

    return NextResponse.json({
      success: true,
      order_id,
      hosting_provisioned: hostingProvisioned,
      domain_registered: domainRegistered,
      message: 'Order validated and services being activated',
    })
  } catch (err) {
    console.error('[orders/validate] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

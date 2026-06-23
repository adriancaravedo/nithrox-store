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
  if (!apiKey) throw new Error('TWENTYI_API_KEY not configured')

  const encoded = Buffer.from(apiKey).toString('base64')
  const base = process.env.TWENTYI_API_BASE || 'https://api.20i.com'

  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${encoded}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data?.message || `20i API error ${res.status}`)
  return data
}

export async function POST(request) {
  try {
    const { order_id, domain, client_name, client_email } = await request.json()

    if (!domain || !order_id) {
      return NextResponse.json({ error: 'order_id and domain are required' }, { status: 400 })
    }

    const resellerId = process.env.TWENTYI_RESELLER_ID
    if (!resellerId) {
      return NextResponse.json({ error: 'TWENTYI_RESELLER_ID not configured' }, { status: 500 })
    }

    // Create hosting package on 20i
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase()

    const result = await twentyiRequest(`/reseller/${resellerId}/addWeb`, 'POST', {
      type: process.env.TWENTYI_PACKAGE_TYPE || 'shared',
      domain_name: cleanDomain,
      label: `Kit Digital - ${client_name || cleanDomain}`,
    })

    const packageId = result?.result || result?.id || result

    // Get package details for IP
    let ip = null
    try {
      const pkg = await twentyiRequest(`/package/${packageId}`)
      ip = pkg?.ipAddress || pkg?.ip || null
    } catch (_) {}

    const cpanelUrl = `https://stackcp.com`
    const sb = supabase()

    // Save to servers table
    const { data: server, error: serverError } = await sb
      .from('servers')
      .insert({
        name: `Kit Digital — ${cleanDomain}`,
        type: 'Shared',
        ip: ip || 'pendiente',
        plan: 'Kit Digital 20i',
        provider: '20i',
        domain: cleanDomain,
        cpanel_url: cpanelUrl,
        monthly_cost: 0,
        currency: 'EUR',
        status: 'online',
        cpu: 0, ram: 0, disk: 0, sites: 1,
        external_id: String(packageId),
        client_email: client_email || null,
      })
      .select()
      .single()

    if (serverError) {
      console.error('servers insert error:', serverError.message)
    }

    // Link server to order
    if (server?.id) {
      await sb
        .from('orders')
        .update({ server_id: server.id })
        .eq('id', order_id)
    }

    return NextResponse.json({
      success: true,
      package_id: packageId,
      domain: cleanDomain,
      server_id: server?.id,
      cpanel_url: cpanelUrl,
    })
  } catch (err) {
    console.error('20i create-hosting error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

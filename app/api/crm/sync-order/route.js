import { NextResponse } from 'next/server'

// ── POST /api/crm/sync-order ──────────────────────────────────
// Called after a successful payment.
// Creates a Deal + Project in the admin CRM linked to the contact.
//
// Body: {
//   contact_id, company_id,
//   order_id, plan_name, plan_id,
//   addons, hosting, domain,
//   total_pen, currency, payment_method,
//   user_name, user_email,
// }
export async function POST(req) {
  try {
    const body = await req.json()
    const {
      contact_id, company_id,
      order_id, plan_name, plan_id,
      addons = [], hosting, domain,
      total_pen, currency, payment_method,
      user_name, user_email,
    } = body

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // Build deal title
    const dealTitle = `${plan_name} — ${user_name || user_email}`

    // Build addon list for notes
    const addonLines = addons.map(a => `• ${a.name?.es || a.name || a.id}`).join('\n')
    const notes = [
      `Plan: ${plan_name}`,
      hosting ? `Hosting: ${hosting.name?.es || hosting.name || hosting.id}` : null,
      domain ? `Dominio: ${domain.full || domain}` : null,
      addonLines ? `Addons:\n${addonLines}` : null,
      `Total: S/ ${total_pen}`,
      `Método de pago: ${payment_method}`,
      `Order ID: ${order_id}`,
    ].filter(Boolean).join('\n')

    // 1. Create deal in CRM
    const { data: deal, error: dealErr } = await supabase
      .from('deals')
      .insert({
        title: dealTitle,
        company_id: company_id || null,
        contact_id: contact_id || null,
        stage: payment_method === 'transfer' || payment_method === 'nowpayments'
          ? 'Qualified'     // pending validation → Qualified stage
          : 'Proposal Sent', // auto-paid → Proposal Sent
        value: total_pen,
        currency: 'PEN',
        source: 'Tienda Online',
        notes,
        custom_fields: {
          order_id,
          plan_id,
          payment_method,
          store_source: true,
        },
      })
      .select('id')
      .single()

    if (dealErr) console.error('[crm/sync-order] deal error:', dealErr)

    // 2. Create project / website entry
    // Map plan to a project type
    const projectTypeMap = {
      'kit-digital':  'Hosting + Dominio',
      'business':     'Website Corporativa',
      'corporativa':  'Website Corporativa',
      'ecommerce':    'Ecommerce',
    }
    const projectType = projectTypeMap[plan_id] || plan_name

    const startDate = new Date().toISOString().split('T')[0]
    // Estimated end: kit-digital=7d, business=15d, ecommerce=25d
    const daysMap = { 'kit-digital': 7, 'business': 15, 'corporativa': 15, 'ecommerce': 25 }
    const end = new Date()
    end.setDate(end.getDate() + (daysMap[plan_id] || 14))
    const endDate = end.toISOString().split('T')[0]

    const { data: project, error: projectErr } = await supabase
      .from('projects')
      .insert({
        name: dealTitle,
        company_id: company_id || null,
        contact_id: contact_id || null,
        type: projectType,
        status: payment_method === 'transfer' || payment_method === 'nowpayments'
          ? 'En espera'
          : 'Activo',
        start_date: startDate,
        end_date: endDate,
        budget: total_pen,
        paid: payment_method === 'transfer' || payment_method === 'nowpayments'
          ? 0
          : total_pen * 0.25, // 25% deposit for auto-paid
        description: notes,
        custom_fields: {
          order_id,
          plan_id,
          hosting: hosting?.id || null,
          domain: domain?.full || domain || null,
          addons: addons.map(a => a.id),
          payment_method,
          store_source: true,
        },
      })
      .select('id')
      .single()

    if (projectErr) console.error('[crm/sync-order] project error:', projectErr)

    // 3. Update the order with the CRM IDs for cross-reference
    if (order_id) {
      await supabase
        .from('orders')
        .update({
          crm_contact_id: contact_id,
          crm_company_id: company_id,
          crm_deal_id: deal?.id || null,
          crm_project_id: project?.id || null,
        })
        .eq('id', order_id)
    }

    return NextResponse.json({
      deal_id: deal?.id || null,
      project_id: project?.id || null,
      synced: !dealErr && !projectErr,
    })
  } catch (err) {
    console.error('[crm/sync-order]', err)
    // Never block the checkout — just return the error
    return NextResponse.json({ error: err.message, synced: false }, { status: 200 })
  }
}

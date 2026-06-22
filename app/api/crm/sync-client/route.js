import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ── Helpers ───────────────────────────────────────────────────
function randomColor() {
  const colors = ['#7c3aed','#2563eb','#16a34a','#d97706','#dc2626','#0891b2','#64748b','#db2777']
  return colors[Math.floor(Math.random() * colors.length)]
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??'
}

function serverSupabase() {
  // Use service role to bypass RLS for server-side inserts
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// ── POST /api/crm/sync-client ─────────────────────────────────
// Called after successful registration in the store.
// Creates a contact (and optionally a company) in the CRM.
// Body: { user_id, name, email, phone, company, source }
export async function POST(req) {
  try {
    const body = await req.json()
    const { user_id, name, email, phone, company, source = 'Tienda Online' } = body

    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

    const supabase = serverSupabase()
    const avatar_color = randomColor()

    // 1. Check if contact already exists (by email)
    const { data: existing } = await supabase
      .from('contacts')
      .select('id, company_id')
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      // Already in CRM — just return it (don't duplicate)
      return NextResponse.json({ contact_id: existing.id, company_id: existing.company_id, existed: true })
    }

    // 2. Create company if business name provided
    let company_id = null
    if (company && company.trim()) {
      const { data: co } = await supabase
        .from('companies')
        .insert({
          name: company.trim(),
          country: 'Perú',
          lifecycle: 'Lead',
          lead_status: 'New',
          owner: 'Adrian Caravedo',
          avatar_color,
          custom_fields: { source },
        })
        .select('id')
        .single()
      company_id = co?.id || null
    }

    // 3. Create contact
    const { data: contact, error: contactErr } = await supabase
      .from('contacts')
      .insert({
        name: name || email,
        email,
        phone: phone || null,
        company_id,
        lead_status: 'New',
        avatar_color,
        custom_fields: {
          source,
          store_user_id: user_id,
          registered_at: new Date().toISOString(),
        },
      })
      .select('id')
      .single()

    if (contactErr) {
      console.error('[crm/sync-client] contact error:', contactErr)
      return NextResponse.json({ error: contactErr.message }, { status: 500 })
    }

    // 4. Link the Supabase auth profile to the contact (for portal access)
    if (user_id) {
      await supabase
        .from('profiles')
        .update({ contact_id: contact.id })
        .eq('id', user_id)
    }

    return NextResponse.json({ contact_id: contact.id, company_id, existed: false })
  } catch (err) {
    console.error('[crm/sync-client]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

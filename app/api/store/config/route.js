import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { DEFAULT_PLANS, DEFAULT_ADDONS, HOSTING_TIERS } from '@/lib/data'

export async function GET() {
  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.from('store_config').select('*')

    if (error || !data?.length) {
      // Fallback to hardcoded defaults
      return NextResponse.json({ plans: DEFAULT_PLANS, addons: DEFAULT_ADDONS, hosting: HOSTING_TIERS, source: 'defaults' })
    }

    const map = {}
    data.forEach(row => { map[row.id] = row.value })

    return NextResponse.json({
      plans: map.plans || DEFAULT_PLANS,
      addons: map.addons || DEFAULT_ADDONS,
      hosting: map.hosting || HOSTING_TIERS,
      payment_methods: map.payment_methods || null,
      source: 'supabase',
    })
  } catch (err) {
    return NextResponse.json({ plans: DEFAULT_PLANS, addons: DEFAULT_ADDONS, hosting: HOSTING_TIERS, source: 'fallback', error: err.message })
  }
}

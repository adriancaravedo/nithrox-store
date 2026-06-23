import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const { order_id, payment_id } = await request.json()
    if (!order_id || !payment_id) return NextResponse.json({ ok: false })
    const sb = await createServerSupabase()
    await sb.from('orders').update({ payment_id }).eq('id', order_id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ ok: false })
  }
}

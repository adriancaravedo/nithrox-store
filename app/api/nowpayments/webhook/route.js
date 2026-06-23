import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function verifySignature(body, signature) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET
  if (!secret) return true // skip in dev if not set
  const hmac = createHmac('sha512', secret)
    .update(JSON.stringify(JSON.parse(body), Object.keys(JSON.parse(body)).sort()))
    .digest('hex')
  return hmac === signature
}

export async function POST(request) {
  const body = await request.text()
  const signature = request.headers.get('x-nowpayments-sig') || ''

  if (!verifySignature(body, signature)) {
    console.error('NOWPayments: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  let data
  try { data = JSON.parse(body) } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // payment_status: waiting → confirming → confirmed → finished → failed/expired
  const { payment_status, order_id, payment_id } = data

  if (['confirmed', 'finished'].includes(payment_status) && order_id) {
    const sb = supabase()
    await sb.from('orders').update({
      status: 'active',
      payment_id: String(payment_id),
      validated_at: new Date().toISOString(),
    }).eq('id', order_id)
  }

  if (['failed', 'expired'].includes(payment_status) && order_id) {
    const sb = supabase()
    await sb.from('orders').update({ status: 'cancelled' }).eq('id', order_id)
  }

  return NextResponse.json({ ok: true })
}

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
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
        await sb.from('orders').update({
          status: sub.status === 'trialing' || sub.status === 'active' ? 'active' : 'pending',
          payment_id: sub.id,
          validated_at: new Date().toISOString(),
        }).eq('id', orderId)
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
        // Find order by subscription id stored in payment_id
        await sb.from('orders').update({ status: 'payment_failed' })
          .eq('payment_id', inv.subscription)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

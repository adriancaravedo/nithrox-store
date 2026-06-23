import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

function supabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export async function POST(request) {
  try {
    const { customer_id, payment_method_id, amount_pen, order_id, plan_name } = await request.json()

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })

    // Attach payment method to customer
    await stripe.paymentMethods.attach(payment_method_id, { customer: customer_id })
    await stripe.customers.update(customer_id, {
      invoice_settings: { default_payment_method: payment_method_id },
    })

    // Create a price for this subscription (annual, PEN converted to USD cents)
    const PEN_TO_USD = parseFloat(process.env.NEXT_PUBLIC_PEN_TO_USD_RATE || '3.7')
    const amountUsdCents = Math.round((amount_pen / PEN_TO_USD) * 100)

    const price = await stripe.prices.create({
      unit_amount: amountUsdCents,
      currency: 'usd',
      recurring: { interval: 'year' },
      product_data: { name: plan_name || 'Kit Digital Annual' },
    })

    // Create subscription with 31-day trial (1 free month)
    const subscription = await stripe.subscriptions.create({
      customer: customer_id,
      items: [{ price: price.id }],
      trial_period_days: 31,
      default_payment_method: payment_method_id,
      metadata: { order_id: order_id || '' },
    })

    // Update order with subscription info
    if (order_id && !order_id.startsWith('mock') && !order_id.startsWith('fallback')) {
      const sb = supabase()
      // Use payment_id for subscriptionId (always exists), extras are bonus columns
      await sb.from('orders').update({ payment_id: subscription.id, status: 'active' }).eq('id', order_id)
      // Try to update extended columns — silently ignore if they don't exist yet
      await sb.from('orders').update({
        stripe_customer_id: customer_id,
        stripe_subscription_id: subscription.id,
        subscription_status: subscription.status,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      }).eq('id', order_id).then(() => {}).catch(() => {})
    }

    return NextResponse.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      trialEnd: subscription.trial_end,
    })
  } catch (err) {
    console.error('Create subscription error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

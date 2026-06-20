import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount_pen, currency = 'PEN', order_id, customer_email } = body

    const secretKey = process.env.STRIPE_SECRET_KEY

    // No key → return mock
    if (!secretKey) {
      return NextResponse.json({
        clientSecret: `mock_pi_${Date.now()}_secret_mock`,
        amount: amount_pen,
        currency: 'pen',
        mock: true,
      })
    }

    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(secretKey, { apiVersion: '2024-04-10' })

    // Convert to smallest currency unit
    // Stripe doesn't support PEN directly, so we convert to USD
    const PEN_TO_USD = parseFloat(process.env.NEXT_PUBLIC_PEN_TO_USD_RATE || '3.7')
    const amountUsd = Math.round((amount_pen / PEN_TO_USD) * 100) // cents

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountUsd,
      currency: 'usd',
      metadata: {
        order_id: order_id || '',
        original_amount_pen: amount_pen,
        customer_email: customer_email || '',
      },
      receipt_email: customer_email || undefined,
    })

    return NextResponse.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id })
  } catch (err) {
    console.error('Stripe PI error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

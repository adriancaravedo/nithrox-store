import { NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' })

export async function POST(request) {
  try {
    const { customer_email, customer_name } = await request.json()

    // Get or create Stripe customer
    let customer
    const existing = await stripe.customers.list({ email: customer_email, limit: 1 })
    if (existing.data.length > 0) {
      customer = existing.data[0]
    } else {
      customer = await stripe.customers.create({
        email: customer_email,
        name: customer_name || undefined,
      })
    }

    // Create SetupIntent to collect card for future subscription billing
    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ['card'],
      usage: 'off_session',
    })

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId: customer.id,
    })
  } catch (err) {
    console.error('SetupIntent error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

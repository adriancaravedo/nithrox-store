import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { amount_pen, customer_email } = await request.json()

    const shopId     = process.env.IZIPAY_SHOP_ID
    const shopKey    = process.env.IZIPAY_SHOP_KEY
    const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'

    // No credentials → mock
    if (!shopId || !shopKey) {
      return NextResponse.json({
        sessionId: `mock_izipay_${Date.now()}`,
        redirectUrl: null,
        formToken: 'mock_form_token',
        mock: true,
      })
    }

    // Izipay REST API v1
    const credentials = Buffer.from(`${shopId}:${shopKey}`).toString('base64')
    const PEN_TO_USD = parseFloat(process.env.NEXT_PUBLIC_PEN_TO_USD_RATE || '3.7')
    const amountCents = Math.round(amount_pen * 100) // PEN cents

    const res = await fetch('https://api.micuentaweb.pe/api-payment/V4/Charge/CreatePayment', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountCents,
        currency: 'PEN',
        orderId: `ntx_${Date.now()}`,
        customer: { email: customer_email },
        formAction: 'PAYMENT',
        ctx_mode: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
        transactionOptions: { cardOptions: { paymentSource: 'EC' } },
        ipnTargetUrl: `${appUrl}/api/izipay/webhook`,
      }),
    })

    const data = await res.json()
    if (data.status !== 'SUCCESS') {
      throw new Error(data.answer?.errorMessage || 'Izipay error')
    }

    return NextResponse.json({
      formToken: data.answer?.formToken,
      sessionId: data.answer?.orderId,
    })
  } catch (err) {
    console.error('Izipay error:', err)
    return NextResponse.json({ error: err.message, mock: true, sessionId: `err_${Date.now()}` }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

async function getPayPalAccessToken(clientId, clientSecret) {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch('https://api-m.paypal.com/v1/oauth2/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json()
  return data.access_token
}

export async function POST(request) {
  try {
    const { amount_pen, currency = 'PEN' } = await request.json()

    const clientId     = process.env.PAYPAL_CLIENT_ID
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET
    const appUrl       = process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        id: `mock_paypal_${Date.now()}`,
        approvalUrl: null,
        mock: true,
      })
    }

    const PEN_TO_USD = parseFloat(process.env.NEXT_PUBLIC_PEN_TO_USD_RATE || '3.7')
    const amountUsd = (amount_pen / PEN_TO_USD).toFixed(2)

    const accessToken = await getPayPalAccessToken(clientId, clientSecret)

    const res = await fetch('https://api-m.paypal.com/v2/checkout/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'USD', value: amountUsd },
          description: 'Nithrox Digital Services',
        }],
        application_context: {
          return_url: `${appUrl}/checkout/payment?status=success`,
          cancel_url: `${appUrl}/checkout/payment?status=cancel`,
        },
      }),
    })

    const data = await res.json()
    const approvalUrl = data.links?.find(l => l.rel === 'approve')?.href

    return NextResponse.json({ id: data.id, approvalUrl })
  } catch (err) {
    console.error('PayPal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

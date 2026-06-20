import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { amount_pen, currency_code = 'btc', order_id } = body

    const apiKey = process.env.NOWPAYMENTS_API_KEY
    const callbackUrl = process.env.NOWPAYMENTS_CALLBACK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/api/nowpayments/webhook`

    // No key → return mock
    if (!apiKey) {
      const MOCK_ADDRESSES = {
        btc:  '1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf7',
        eth:  '0x742d35Cc6634C0532925a3b844Bc9e7595f62Cc',
        usdt: '0x742d35Cc6634C0532925a3b844Bc9e7595f62Cc',
        sol:  'DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZMkABmmt',
      }
      const MOCK_AMOUNTS = { btc: '0.00042', eth: '0.0091', usdt: String(Math.round(amount_pen / 3.7)), sol: '0.89' }

      return NextResponse.json({
        payment_id: `mock_${Date.now()}`,
        pay_address: MOCK_ADDRESSES[currency_code] || '0xMOCK_ADDRESS',
        pay_amount: MOCK_AMOUNTS[currency_code] || '0.001',
        pay_currency: currency_code,
        price_amount: amount_pen,
        price_currency: 'pen',
        mock: true,
      })
    }

    const res = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount_pen,
        price_currency: 'pen',
        pay_currency: currency_code,
        order_id: order_id || `ntx_${Date.now()}`,
        order_description: 'Nithrox Services',
        ipn_callback_url: callbackUrl,
      }),
    })

    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.message || 'NOWPayments error')
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    console.error('NOWPayments error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const domain = searchParams.get('domain')

  if (!domain) {
    return NextResponse.json({ error: 'domain param required' }, { status: 400 })
  }

  const apiUser = process.env.REALTIME_API_USER
  const apiKey  = process.env.REALTIME_API_KEY
  const apiBase = process.env.REALTIME_API_BASE || 'https://api.realtimeregister.com/v2'

  // No credentials → return mock
  if (!apiUser || !apiKey) {
    // Simulate unavailable for domains containing "taken"
    const available = !domain.toLowerCase().includes('taken')
    // TLD-based price map (PEN)
    const TLD_PRICES = { '.com': 59, '.pe': 79, '.net': 59, '.org': 49, '.store': 89 }
    const tld = '.' + domain.split('.').slice(1).join('.')
    const price_pen = TLD_PRICES[tld] || 59

    return NextResponse.json({ domain, available, price_pen, mock: true })
  }

  try {
    const credentials = Buffer.from(`${apiUser}:${apiKey}`).toString('base64')
    const res = await fetch(
      `${apiBase}/domains/check?domainName=${encodeURIComponent(domain)}`,
      { headers: { Authorization: `Basic ${credentials}` } }
    )
    const data = await res.json()

    // Realtime Register returns availability in data.available or similar
    const available = data?.available ?? data?.status !== 'ACTIVE'
    const price_pen = data?.price ? Math.round(data.price * 3.7) : 59

    return NextResponse.json({ domain, available, price_pen })
  } catch (err) {
    // Fallback to mock on error
    return NextResponse.json({ domain, available: true, price_pen: 59, error: err.message })
  }
}

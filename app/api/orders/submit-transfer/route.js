import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    // FormData with voucher file + amount
    const formData = await request.formData()
    const voucher  = formData.get('voucher')
    const amount   = formData.get('amount')
    const currency = formData.get('currency') || 'PEN'

    if (!voucher) {
      return NextResponse.json({ error: 'No voucher file provided' }, { status: 400 })
    }

    // In production: upload voucher to Supabase Storage
    // For now, we accept it and return success
    // You can add: const supabase = await createServerSupabase()
    // then: await supabase.storage.from('vouchers').upload(`voucher_${Date.now()}`, await voucher.arrayBuffer())

    return NextResponse.json({
      success: true,
      message: 'Voucher received. We will validate your payment within 24 hours.',
      fileName: voucher.name,
      amount,
      currency,
    })
  } catch (err) {
    console.error('Transfer submit error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

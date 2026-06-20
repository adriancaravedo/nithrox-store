import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      plan_id, plan_name, plan_price, addons, hosting, domain,
      user_id, signature_data_url, payment_method,
      total_pen, currency, lang,
    } = body

    const supabase = await createServerSupabase()

    // Build items JSON
    const items = {
      plan: { id: plan_id, name: plan_name, price_pen: plan_price },
      addons: addons || [],
      hosting: hosting || null,
      domain: domain || null,
      currency,
      lang,
    }

    // Insert into orders
    const { data: orderData, error: orderErr } = await supabase
      .from('orders')
      .insert({
        user_id: user_id || null,
        plan_id,
        plan_name,
        items,
        total_pen,
        status: 'pending',
        payment_method,
        signature_url: signature_data_url || null,
      })
      .select('id')
      .single()

    if (orderErr) {
      console.error('Order insert error:', orderErr)
      // Return a mock order id so the UI keeps working without DB
      const mockId = `mock-${Date.now()}`
      return NextResponse.json({ orderId: mockId, mock: true })
    }

    const orderId = orderData.id

    // Also insert into store_orders (admin sync)
    await supabase.from('store_orders').insert({
      order_id: orderId,
      user_id: user_id || null,
      plan_id,
      plan_name,
      total_pen,
      payment_method,
      status: 'pending',
    }).select().maybeSingle()
    // Ignore store_orders errors — not critical

    // Insert domain_order if domain was selected
    if (domain?.full) {
      await supabase.from('domain_orders').insert({
        order_id: orderId,
        domain: domain.name || domain.full,
        tld: domain.tld,
        status: 'pending',
      }).maybeSingle()
    }

    // Insert hosting_order if hosting was selected
    if (hosting?.id) {
      await supabase.from('hosting_orders').insert({
        order_id: orderId,
        tier: hosting.id,
        status: 'pending',
      }).maybeSingle()
    }

    return NextResponse.json({ orderId })
  } catch (err) {
    console.error('Orders API error:', err)
    // Always return a usable order id
    const fallbackId = `fallback-${Date.now()}`
    return NextResponse.json({ orderId: fallbackId, error: err.message, mock: true })
  }
}

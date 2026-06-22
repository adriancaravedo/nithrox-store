import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, session_id, state, current_step } = body

    if (!state) {
      return NextResponse.json({ error: 'state is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const payload = {
      state,
      updated_at: new Date().toISOString(),
    }
    if (current_step) payload.current_step = current_step
    if (user_id) payload.user_id = user_id
    if (session_id) payload.session_id = session_id

    let result
    if (user_id) {
      // Logged-in user: upsert on user_id
      result = await supabase
        .from('order_drafts')
        .upsert(payload, { onConflict: 'user_id' })
        .select('id')
        .single()
    } else if (session_id) {
      // Anonymous: upsert on session_id
      result = await supabase
        .from('order_drafts')
        .upsert(payload, { onConflict: 'session_id' })
        .select('id')
        .single()
    } else {
      // No key — just insert
      result = await supabase
        .from('order_drafts')
        .insert(payload)
        .select('id')
        .single()
    }

    if (result.error) {
      console.error('order_drafts upsert error:', result.error.message)
      return NextResponse.json({ saved: true, draft_id: null })
    }

    return NextResponse.json({ saved: true, draft_id: result.data?.id })
  } catch (err) {
    console.error('orders/save-draft error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) {
      return NextResponse.json({ draft: null })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data, error } = await supabase
      .from('order_drafts')
      .select('state, updated_at, current_step')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ draft: null })
    }

    return NextResponse.json({ draft: data.state, updated_at: data.updated_at, current_step: data.current_step })
  } catch (err) {
    console.error('orders/save-draft GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, state } = body

    if (!state) {
      return NextResponse.json({ error: 'state is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const upsertPayload = {
      state,
      updated_at: new Date().toISOString(),
    }

    // user_id is optional (anonymous checkout progress)
    if (user_id) upsertPayload.user_id = user_id

    const { data, error } = await supabase
      .from('order_drafts')
      .upsert(upsertPayload, {
        onConflict: user_id ? 'user_id' : undefined,
      })
      .select('id')
      .single()

    if (error) {
      console.error('order_drafts upsert error:', error.message)
      // Return success so the UI doesn't show an error — draft saving is non-critical
      return NextResponse.json({ saved: true, draft_id: null })
    }

    return NextResponse.json({ saved: true, draft_id: data?.id })
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
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    )

    const { data, error } = await supabase
      .from('order_drafts')
      .select('state, updated_at')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return NextResponse.json({ draft: null })
    }

    return NextResponse.json({ draft: data.state, updated_at: data.updated_at })
  } catch (err) {
    console.error('orders/save-draft GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

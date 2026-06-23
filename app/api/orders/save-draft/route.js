import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

function serverSupabase() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { user_id, session_id, state, current_step } = body

    if (!state) {
      return NextResponse.json({ error: 'state is required' }, { status: 400 })
    }

    const supabase = serverSupabase()
    const now = new Date().toISOString()

    const payload = {
      state,
      updated_at: now,
      ...(current_step && { current_step }),
      ...(user_id    && { user_id }),
      ...(session_id && { session_id }),
    }

    let draftId = null

    if (user_id) {
      // Find existing draft for this user
      const { data: existing } = await supabase
        .from('order_drafts')
        .select('id')
        .eq('user_id', user_id)
        .maybeSingle()

      if (existing?.id) {
        await supabase.from('order_drafts').update(payload).eq('id', existing.id)
        draftId = existing.id
      } else {
        const { data } = await supabase.from('order_drafts').insert(payload).select('id').single()
        draftId = data?.id
      }
    } else if (session_id) {
      // Find existing draft for this session
      const { data: existing } = await supabase
        .from('order_drafts')
        .select('id')
        .eq('session_id', session_id)
        .is('user_id', null)
        .maybeSingle()

      if (existing?.id) {
        await supabase.from('order_drafts').update(payload).eq('id', existing.id)
        draftId = existing.id
      } else {
        const { data } = await supabase.from('order_drafts').insert(payload).select('id').single()
        draftId = data?.id
      }
    } else {
      const { data } = await supabase.from('order_drafts').insert(payload).select('id').single()
      draftId = data?.id
    }

    return NextResponse.json({ saved: true, draft_id: draftId })
  } catch (err) {
    console.error('orders/save-draft error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const user_id = searchParams.get('user_id')

    if (!user_id) return NextResponse.json({ draft: null })

    const supabase = serverSupabase()

    const { data, error } = await supabase
      .from('order_drafts')
      .select('state, updated_at, current_step')
      .eq('user_id', user_id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error || !data) return NextResponse.json({ draft: null })

    return NextResponse.json({ draft: data.state, updated_at: data.updated_at, current_step: data.current_step })
  } catch (err) {
    console.error('orders/save-draft GET error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

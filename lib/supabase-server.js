import { createClient } from '@supabase/supabase-js'

// Server-side client — uses service role to bypass RLS in API routes
export async function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

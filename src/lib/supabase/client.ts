import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('http')
      ? process.env.NEXT_PUBLIC_SUPABASE_URL
      : 'https://almasar-switchgear.supabase.co'

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 20
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_anon_key'

  return createBrowserClient(url, key)
}

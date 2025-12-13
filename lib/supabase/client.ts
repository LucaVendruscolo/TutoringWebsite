import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  // Only create client in browser environment
  if (typeof window === 'undefined') {
    // During SSR/build, return a placeholder that will be replaced on client
    return null as unknown as ReturnType<typeof createBrowserClient>
  }

  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey)
  return client
}

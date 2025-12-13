/**
 * Browser-side Supabase client.
 *
 * IMPORTANT:
 * - NEXT_PUBLIC_* env vars are inlined at build time for client bundles.
 * - If they're missing in Vercel (or you added them after the last deploy),
 *   `createBrowserClient` will throw and can white-screen the app.
 *
 * We defensively return a "stub" client when the env vars are missing so pages
 * can render and show a helpful message instead of crashing.
 */
'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const MISSING_ENV_MESSAGE =
  'Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy.'

function getSupabaseBrowserEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return { url, anonKey, ok: Boolean(url && anonKey) }
}

export function isSupabaseConfigured(): boolean {
  return getSupabaseBrowserEnv().ok
}

function missingEnvError(): Error {
  return new Error(MISSING_ENV_MESSAGE)
}

function createQueryStub() {
  const promise = Promise.resolve({ data: null as any, error: missingEnvError() })

  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      // Make this object await-able: `await supabase.from(...).select(...)`
      if (prop === 'then') return promise.then.bind(promise)
      if (prop === 'catch') return promise.catch.bind(promise)
      if (prop === 'finally') return promise.finally.bind(promise)

      // Common terminal methods
      if (prop === 'single' || prop === 'maybeSingle') return () => promise

      // Most query builder methods just return the builder for chaining
      return (..._args: any[]) => proxy
    },
  }

  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  const proxy = new Proxy({}, handler)
  return proxy
}

function createMissingEnvClient(): SupabaseClient {
  const err = missingEnvError()

  // Minimal surface area used by this app; everything else falls back to a query stub.
  const client: any = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: err }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: err }),
      resetPasswordForEmail: async () => ({ data: null, error: err }),
      updateUser: async () => ({ data: { user: null }, error: err }),
      signOut: async () => ({ error: err }),
    },
    from: (_table: string) => createQueryStub(),
  }

  return client as SupabaseClient
}

let browserClient: SupabaseClient | null = null

export function createClient() {
  if (browserClient) return browserClient

  const { url, anonKey, ok } = getSupabaseBrowserEnv()
  if (!ok) {
    // Don't crash the UI — allow pages to render and show an actionable message.
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error(MISSING_ENV_MESSAGE)
    }
    browserClient = createMissingEnvClient()
    return browserClient
  }

  browserClient = createBrowserClient(url!, anonKey!)
  return browserClient
}


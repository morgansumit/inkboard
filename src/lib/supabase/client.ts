import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback for build time safety
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            }
        } as any
    }

    if (!browserClient) {
        browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                flowType: 'pkce',
                // Suppress refresh token errors in console
                debug: false,
            },
            global: {
                headers: {
                    'x-client-info': 'purseable-web',
                },
            },
        })

        // Handle auth errors globally to prevent console spam
        browserClient.auth.onAuthStateChange((event, _session) => {
            if (event === 'TOKEN_REFRESHED') {
                // Token successfully refreshed
            }
            // Do NOT null out browserClient on SIGNED_OUT — that causes a race where the
            // next createClient() creates a fresh instance that conflicts with stored cookies.
        })
    }

    return browserClient
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Simple anon client for public data fetching - no cookies needed
export function createAnonClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[anon-client] Missing env vars')
        return null
    }

    return createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    })
}

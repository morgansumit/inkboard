import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

// ── Profile cache helpers ──────────────────────────────────────────────
const PROFILE_CACHE_KEY = 'centsably:user-profile'
const PROFILE_CACHE_TTL = 60 * 60 * 1000 // 1 hour

export type CachedProfile = {
    id: string
    display_name: string
    avatar_url: string
    role: string
    is_business: boolean
    email: string | null
    cached_at: number
}

export function cacheUserProfile(profile: Omit<CachedProfile, 'cached_at'>) {
    try {
        localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify({ ...profile, cached_at: Date.now() }))
    } catch { /* quota exceeded or SSR – ignore */ }
}

export function getCachedUserProfile(): CachedProfile | null {
    try {
        const raw = localStorage.getItem(PROFILE_CACHE_KEY)
        if (!raw) return null
        const parsed: CachedProfile = JSON.parse(raw)
        if (Date.now() - parsed.cached_at > PROFILE_CACHE_TTL) {
            localStorage.removeItem(PROFILE_CACHE_KEY)
            return null
        }
        return parsed
    } catch {
        return null
    }
}

export function clearCachedUserProfile() {
    try { localStorage.removeItem(PROFILE_CACHE_KEY) } catch { /* SSR */ }
}

// ── Resilient navigator lock ───────────────────────────────────────────
async function resilientLock<R>(
    name: string,
    acquireTimeout: number,
    fn: () => Promise<R>,
): Promise<R> {
    if (typeof navigator === 'undefined' || !navigator?.locks?.request) {
        return await fn()
    }

    return new Promise<R>((resolve, reject) => {
        const timer = setTimeout(() => {
            // Lock timed out — run without the lock instead of throwing
            fn().then(resolve, reject)
        }, acquireTimeout)

        navigator.locks.request(name, { mode: 'exclusive' }, async () => {
            clearTimeout(timer)
            try {
                const result = await fn()
                resolve(result)
            } catch (err) {
                reject(err)
            }
            // keep the lock held until fn() finishes
            return undefined as any
        }).catch(() => {
            clearTimeout(timer)
            fn().then(resolve, reject)
        })
    })
}

// ── Supabase browser client singleton ──────────────────────────────────
export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Fallback for build time safety
    if (!supabaseUrl || !supabaseAnonKey) {
        return {
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                signOut: async () => ({ error: null }),
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
                debug: false,
                lock: resilientLock,
            },
            global: {
                headers: {
                    'x-client-info': 'centsably-web',
                },
            },
        })
    }

    return browserClient
}

/**
 * Reset the singleton so the next createClient() starts fresh.
 * Call this after signOut completes, right before hard-navigating away.
 */
export function resetClient() {
    browserClient = null
}

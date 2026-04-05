import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (!code) {
        // No code param — redirect to login
        return NextResponse.redirect(`${origin}/login`)
    }

    const cookieStore = await cookies()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // setAll called from Server Component — fine, middleware handles it
                    }
                },
            },
        }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('[auth/callback] code exchange failed:', error.message)
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    // Check if user has a profile/username to decide redirect
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        const { data: profile } = await supabase
            .from('users')
            .select('username')
            .eq('id', user.id)
            .maybeSingle()

        if (!profile) {
            // Sync user profile for new OAuth users
            try {
                const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || origin
                await fetch(`${siteUrl}/api/users/sync`, {
                    method: 'POST',
                    headers: {
                        'cookie': cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; '),
                    },
                })
            } catch {
                // sync failed, proceed anyway
            }
            return NextResponse.redirect(`${origin}/onboarding`)
        }

        if (!profile.username) {
            return NextResponse.redirect(`${origin}/onboarding`)
        }
    }

    return NextResponse.redirect(`${origin}${next}`)
}

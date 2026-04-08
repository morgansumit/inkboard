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

    const { error, data: sessionData } = await supabase.auth.exchangeCodeForSession(code)

    if (error) {
        console.error('[auth/callback] code exchange failed:', error.message)
        
        // Check if this is a duplicate email error (user already exists with password)
        const isDuplicateEmail = error.message?.toLowerCase().includes('already registered') || 
                                 error.message?.toLowerCase().includes('duplicate') ||
                                 error.message?.toLowerCase().includes('user already exists') ||
                                 error.code === 'email_exists' ||
                                 error.code === 'identity_already_exists'
        
        if (isDuplicateEmail) {
            // Redirect with specific error message about existing account
            return NextResponse.redirect(`${origin}/login?error=account_exists&provider=google`)
        }
        
        return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    // Get the authenticated user to check their identities
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
        // Check if user has both email and OAuth identities (newly linked or existing)
        const identities = user.identities || []
        const hasEmailIdentity = identities.some((identity: any) => identity.provider === 'email')
        const hasOAuthIdentity = identities.some((identity: any) => identity.provider === 'google')

        // If user just signed up with OAuth but has existing email identity
        if (hasOAuthIdentity && !hasEmailIdentity) {
            // Check if there's a separate email/password user with same email
            const { data: existingUsers } = await supabase
                .from('users')
                .select('id, email')
                .eq('email', user.email)
                .neq('id', user.id)

            if (existingUsers && existingUsers.length > 0) {
                // There's another user with this email - this shouldn't happen ideally
                // but we should notify the user about the conflict
                console.warn('[auth/callback] Duplicate user detected:', user.email)
            }
        }
    }

    // Check if user has a profile/username to decide redirect
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

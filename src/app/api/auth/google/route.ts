import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const supabase = await createClient()
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data?.url) {
        return NextResponse.redirect(data.url)
    }

    return NextResponse.json({ error: 'No OAuth URL returned' }, { status: 500 })
}

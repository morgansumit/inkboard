import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { generateUniqueUsername } from '@/lib/admin/setup'

function initialsAvatar(name: string) {
    const seed = encodeURIComponent(name || 'purseable User')
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}`
}

export async function POST() {
    const supabase = await createClient()
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: existing, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

    if (fetchError) {
        console.error('[users.sync] fetch error', fetchError)
        return NextResponse.json({ error: 'Failed to check profile' }, { status: 500 })
    }

    if (existing?.id) {
        return NextResponse.json({ synced: true, id: existing.id })
    }

    const usernameSeed = (user.email?.split('@')[0] || user.user_metadata?.username || 'purseable').toLowerCase()
    const username = await generateUniqueUsername(usernameSeed)

    const displayName = user.user_metadata?.display_name || user.user_metadata?.full_name || usernameSeed
    const avatar_url = user.user_metadata?.avatar_url || initialsAvatar(displayName)

    const profilePayload = {
        id: user.id,
        email: user.email,
        username,
        display_name: displayName,
        avatar_url,
        role: 'USER',
        is_verified: false,
        is_business: false,
        is_suspended: false,
        created_at: new Date().toISOString(),
    }

    const { error: insertError, data } = await supabaseAdmin
        .from('users')
        .insert(profilePayload)
        .select('id')
        .single()

    if (insertError) {
        console.error('[users.sync] insert error', insertError)
        return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 })
    }

    return NextResponse.json({ synced: true, id: data.id }, { status: 201 })
}

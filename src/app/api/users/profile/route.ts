import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: fetchError } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at')
        .eq('id', user.id)
        .maybeSingle()

    if (fetchError) {
        return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
    }

    return NextResponse.json({ profile })
}

export async function PATCH(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    if (!body) {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Only allow updating specific fields
    const allowedFields = ['display_name', 'username', 'bio', 'avatar_url', 'location']
    const updates: Record<string, any> = {}

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            updates[field] = typeof body[field] === 'string' ? body[field].trim() : body[field]
        }
    }

    if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Validate display_name
    if (updates.display_name !== undefined) {
        if (typeof updates.display_name !== 'string' || updates.display_name.length < 1 || updates.display_name.length > 50) {
            return NextResponse.json({ error: 'Display name must be between 1 and 50 characters' }, { status: 400 })
        }
    }

    // Validate username uniqueness if being changed
    if (updates.username !== undefined) {
        const clean = updates.username.toLowerCase().replace(/[^a-z0-9_]/g, '')
        if (clean.length < 2 || clean.length > 30) {
            return NextResponse.json({ error: 'Username must be between 2 and 30 characters (letters, numbers, underscores)' }, { status: 400 })
        }
        updates.username = clean

        const { data: existing } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('username', clean)
            .neq('id', user.id)
            .maybeSingle()

        if (existing) {
            return NextResponse.json({ error: 'Username is already taken' }, { status: 409 })
        }
    }

    // Validate bio length
    if (updates.bio !== undefined && typeof updates.bio === 'string' && updates.bio.length > 200) {
        return NextResponse.json({ error: 'Bio must be 200 characters or less' }, { status: 400 })
    }

    updates.updated_at = new Date().toISOString()

    const { data: updated, error: updateError } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', user.id)
        .select('id, username, display_name, bio, avatar_url, location')
        .single()

    if (updateError) {
        console.error('[users.profile] update error', updateError)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ profile: updated })
}

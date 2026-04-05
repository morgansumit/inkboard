import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/admin/broadcasts — list all broadcasts (admin only)
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile || !['ADMIN', 'MODERATOR'].includes(profile.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { data: broadcasts, error } = await supabaseAdmin
        .from('broadcast_messages')
        .select(`
            *,
            creator:created_by(id, username, display_name),
            delivery_stats:broadcast_deliveries(count)
        `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('[broadcasts] fetch error', error)
        return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
    }

    return NextResponse.json({ broadcasts })
}

// POST /api/admin/broadcasts — create new broadcast (admin only)
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

    if (!profile || !['ADMIN', 'MODERATOR'].includes(profile.role || '')) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json().catch(() => null)
    const { title, body: messageBody, message_type = 'ANNOUNCEMENT', priority = 'NORMAL', scheduled_at, expires_at } = body

    if (!title?.trim() || !messageBody?.trim()) {
        return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    if (title.length > 200 || messageBody.length > 5000) {
        return NextResponse.json({ error: 'Title too long (max 200) or message too long (max 5000)' }, { status: 400 })
    }

    const { data: broadcast, error: insertError } = await supabaseAdmin
        .from('broadcast_messages')
        .insert({
            title: title.trim(),
            body: messageBody.trim(),
            message_type,
            priority,
            scheduled_at: scheduled_at || new Date().toISOString(),
            expires_at,
            created_by: user.id,
        })
        .select('*')
        .single()

    if (insertError) {
        console.error('[broadcasts] create error', insertError)
        return NextResponse.json({ error: 'Failed to create broadcast' }, { status: 500 })
    }

    // If scheduled for now, deliver to all users
    const scheduleTime = new Date(scheduled_at || Date.now())
    if (scheduleTime <= new Date()) {
        try {
            const { data } = await supabaseAdmin.rpc('deliver_broadcast_to_users', { p_broadcast_id: broadcast.id })
            console.log(`[broadcasts] Delivered to ${data} users`)
        } catch (err) {
            console.error('[broadcasts] delivery error', err)
        }
    }

    return NextResponse.json({ broadcast }, { status: 201 })
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/broadcasts/my — get current user's broadcast messages
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get active broadcasts with delivery status
    const { data: broadcasts, error } = await supabaseAdmin
        .from('broadcast_messages')
        .select(`
            *,
            delivery:broadcast_deliveries!inner(
                delivered_at,
                read_at,
                dismissed_at
            )
        `)
        .eq('delivery.user_id', user.id)
        .eq('is_active', true)
        .lte('scheduled_at', new Date().toISOString())
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
        .order('scheduled_at', { ascending: false })

    if (error) {
        console.error('[broadcasts] fetch user broadcasts error', error)
        return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
    }

    // Format the response
    const formatted = broadcasts.map(b => ({
        id: b.id,
        title: b.title,
        body: b.body,
        message_type: b.message_type,
        priority: b.priority,
        scheduled_at: b.scheduled_at,
        expires_at: b.expires_at,
        created_at: b.created_at,
        delivered_at: b.delivery[0]?.delivered_at,
        read_at: b.delivery[0]?.read_at,
        dismissed_at: b.delivery[0]?.dismissed_at,
    }))

    return NextResponse.json({ broadcasts: formatted })
}

// PATCH /api/broadcasts/my — mark broadcast as read/dismissed
export async function PATCH(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const { broadcast_id, action } = body

    if (!broadcast_id || !['read', 'dismiss'].includes(action)) {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const updateData = action === 'read' 
        ? { read_at: new Date().toISOString() }
        : { dismissed_at: new Date().toISOString() }

    const { error } = await supabaseAdmin
        .from('broadcast_deliveries')
        .update(updateData)
        .eq('broadcast_id', broadcast_id)
        .eq('user_id', user.id)

    if (error) {
        console.error('[broadcasts] update delivery error', error)
        return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

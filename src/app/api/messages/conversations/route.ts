import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/messages/conversations — list current user's conversations
export async function GET() {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all conversation IDs the user participates in
    const { data: participations, error: partError } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id)

    if (partError) {
        console.error('[messages] participations error', partError)
        return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
    }

    if (!participations || participations.length === 0) {
        return NextResponse.json({ conversations: [] })
    }

    const convIds = participations.map(p => p.conversation_id)
    const lastReadMap = Object.fromEntries(participations.map(p => [p.conversation_id, p.last_read_at]))

    // Get conversations with their details
    const { data: conversations, error: convError } = await supabaseAdmin
        .from('conversations')
        .select('id, created_at, updated_at, last_message_at, last_message_preview')
        .in('id', convIds)
        .order('last_message_at', { ascending: false })

    if (convError) {
        console.error('[messages] conversations error', convError)
        return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
    }

    // For each conversation, get the other participant(s)
    const { data: allParticipants } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', convIds)

    const otherUserIds = new Set<string>()
    const convParticipantMap: Record<string, string[]> = {}
    for (const p of allParticipants || []) {
        if (!convParticipantMap[p.conversation_id]) convParticipantMap[p.conversation_id] = []
        convParticipantMap[p.conversation_id].push(p.user_id)
        if (p.user_id !== user.id) otherUserIds.add(p.user_id)
    }

    // Fetch user profiles for other participants
    let userProfiles: Record<string, any> = {}
    if (otherUserIds.size > 0) {
        const { data: profiles } = await supabaseAdmin
            .from('users')
            .select('id, username, display_name, avatar_url')
            .in('id', Array.from(otherUserIds))

        if (profiles) {
            userProfiles = Object.fromEntries(profiles.map(p => [p.id, p]))
        }
    }

    // Count unread messages per conversation
    const enriched = (conversations || []).map(conv => {
        const otherIds = (convParticipantMap[conv.id] || []).filter(id => id !== user.id)
        const otherUser = otherIds.length > 0 ? userProfiles[otherIds[0]] : null
        const lastRead = lastReadMap[conv.id]

        return {
            id: conv.id,
            last_message_at: conv.last_message_at,
            last_message_preview: conv.last_message_preview,
            other_user: otherUser ? {
                id: otherUser.id,
                username: otherUser.username,
                display_name: otherUser.display_name,
                avatar_url: otherUser.avatar_url,
            } : null,
            last_read_at: lastRead,
        }
    })

    return NextResponse.json({ conversations: enriched })
}

// POST /api/messages/conversations — create or get existing conversation with a user
export async function POST(req: Request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const recipientId = body?.recipient_id
    if (!recipientId || recipientId === user.id) {
        return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 })
    }

    // Check recipient exists
    const { data: recipient } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .eq('id', recipientId)
        .maybeSingle()

    if (!recipient) {
        return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
    }

    // Check if a conversation already exists between these two users
    const { data: myConvs } = await supabaseAdmin
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id)

    if (myConvs && myConvs.length > 0) {
        const myConvIds = myConvs.map(c => c.conversation_id)
        const { data: sharedConv } = await supabaseAdmin
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', recipientId)
            .in('conversation_id', myConvIds)

        if (sharedConv && sharedConv.length > 0) {
            return NextResponse.json({ conversation_id: sharedConv[0].conversation_id, existing: true })
        }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({ last_message_preview: '' })
        .select('id')
        .single()

    if (convError || !newConv) {
        console.error('[messages] create conversation error', convError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }

    // Add both users as participants
    const { error: partError } = await supabaseAdmin
        .from('conversation_participants')
        .insert([
            { conversation_id: newConv.id, user_id: user.id },
            { conversation_id: newConv.id, user_id: recipientId },
        ])

    if (partError) {
        console.error('[messages] add participants error', partError)
        return NextResponse.json({ error: 'Failed to add participants' }, { status: 500 })
    }

    return NextResponse.json({ conversation_id: newConv.id, existing: false }, { status: 201 })
}

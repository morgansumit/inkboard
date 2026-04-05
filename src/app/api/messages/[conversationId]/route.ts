import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/messages/[conversationId] — get messages for a conversation
export async function GET(
    req: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify user is a participant
    const { data: participant } = await supabaseAdmin
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (!participant) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Get messages
    const { data: messages, error: msgError } = await supabaseAdmin
        .from('direct_messages')
        .select('id, sender_id, body, created_at')
        .eq('conversation_id', conversationId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(200)

    if (msgError) {
        console.error('[messages] fetch error', msgError)
        return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
    }

    // Update last_read_at for this user
    await supabaseAdmin
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

    return NextResponse.json({ messages: messages || [] })
}

// POST /api/messages/[conversationId] — send a message
export async function POST(
    req: Request,
    { params }: { params: Promise<{ conversationId: string }> }
) {
    const { conversationId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => null)
    const messageBody = body?.body?.trim()
    if (!messageBody || messageBody.length > 2000) {
        return NextResponse.json({ error: 'Message must be 1-2000 characters' }, { status: 400 })
    }

    // Verify user is a participant
    const { data: participant } = await supabaseAdmin
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)
        .maybeSingle()

    if (!participant) {
        return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    // Insert message
    const { data: message, error: insertError } = await supabaseAdmin
        .from('direct_messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            body: messageBody,
        })
        .select('id, sender_id, body, created_at')
        .single()

    if (insertError) {
        console.error('[messages] send error', insertError)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    // Update conversation's last_message_at and preview
    const preview = messageBody.length > 100 ? messageBody.slice(0, 100) + '...' : messageBody
    await supabaseAdmin
        .from('conversations')
        .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: preview,
            updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId)

    // Update sender's last_read_at
    await supabaseAdmin
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

    return NextResponse.json({ message }, { status: 201 })
}

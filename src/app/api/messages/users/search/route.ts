import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/messages/users/search?q=term — search users to start a conversation
export async function GET(req: NextRequest) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const query = req.nextUrl.searchParams.get('q')?.trim() || ''
    if (query.length < 1) {
        return NextResponse.json({ users: [] })
    }

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, avatar_url')
        .neq('id', user.id)
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(10)

    if (error) {
        console.error('[messages] user search error', error)
        return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    return NextResponse.json({ users: users || [] })
}

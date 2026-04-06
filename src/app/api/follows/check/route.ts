import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Check if current user follows target user and get follower counts
export async function GET(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { searchParams } = new URL(req.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    try {
        // Get target user's follower/following counts
        const { data: targetUser, error: userError } = await supabaseAdmin
            .from('users')
            .select('follower_count, following_count')
            .eq('id', targetUserId)
            .single()

        if (userError || !targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // If user is not logged in, just return counts
        if (!user) {
            return NextResponse.json({
                success: true,
                isFollowing: false,
                followerCount: targetUser.follower_count || 0,
                followingCount: targetUser.following_count || 0
            })
        }

        // Check if current user follows target
        const { data: followData } = await supabaseAdmin
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle()

        return NextResponse.json({
            success: true,
            isFollowing: !!followData,
            followerCount: targetUser.follower_count || 0,
            followingCount: targetUser.following_count || 0
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to check follow status'
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

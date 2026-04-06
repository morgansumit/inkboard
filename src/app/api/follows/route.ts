import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// Follow a user
export async function POST(req: Request) {
    console.log('[follows] POST request received');
    
    // Check if admin client is properly configured
    const adminClient = getSupabaseAdmin();
    const testResult = await adminClient.from('users').select('id').limit(1);
    if (testResult.error?.code === 'NO_CREDENTIALS') {
        console.error('[follows] Admin client not configured - missing SUPABASE_SERVICE_ROLE_KEY');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }
    
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[follows] User:', user?.id);

    if (!user) {
        console.log('[follows] Unauthorized');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { userIdToFollow } = body

    console.log('[follows] Request body:', { userIdToFollow });

    if (!userIdToFollow) {
        return NextResponse.json({ error: 'userIdToFollow is required' }, { status: 400 })
    }

    if (user.id === userIdToFollow) {
        return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    try {
        console.log('[follows] Starting follow request', { userId: user.id, userIdToFollow });

        // Check if already following — follows table has no 'id' column
        const { data: existing, error: existingError } = await supabaseAdmin
            .from('follows')
            .select('follower_id')
            .eq('follower_id', user.id)
            .eq('following_id', userIdToFollow)
            .maybeSingle()

        if (existingError) {
            console.error('[follows] Error checking existing follow:', JSON.stringify(existingError));
        }

        if (existing) {
            console.log('[follows] Already following');
            return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
        }

        // Create follow relationship
        const { error: followError } = await supabaseAdmin
            .from('follows')
            .insert({
                follower_id: user.id,
                following_id: userIdToFollow
            })

        if (followError) {
            console.error('[follows] Error inserting follow:', JSON.stringify(followError));
            throw followError
        }

        console.log('[follows] Follow inserted');
        console.log('[follows] Follow successful');
        return NextResponse.json({
            success: true,
            message: 'Following user',
            isFollowing: true
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : (err as any)?.message || 'Failed to follow user'
        console.error('[follows] Follow error:', JSON.stringify(err));
        return NextResponse.json({ 
            error: message,
            raw: JSON.stringify(err),
            userId: user.id,
            userIdToFollow
        }, { status: 500 })
    }
}

// Unfollow a user
export async function DELETE(req: Request) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userIdToUnfollow = searchParams.get('userId')

    if (!userIdToUnfollow) {
        return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    try {
        console.log('[follows] Starting unfollow request', { userId: user.id, userIdToUnfollow });

        // Delete follow relationship
        const { error: deleteError } = await supabaseAdmin
            .from('follows')
            .delete()
            .eq('follower_id', user.id)
            .eq('following_id', userIdToUnfollow)

        if (deleteError) {
            console.error('[follows] Error deleting follow:', deleteError);
            throw deleteError
        }

        console.log('[follows] Follow deleted, updating counts');

        // Update follower counts
        await supabaseAdmin.rpc('decrement_following_count', { user_id: user.id });
        await supabaseAdmin.rpc('decrement_follower_count', { user_id: userIdToUnfollow });

        console.log('[follows] Unfollow successful');
        return NextResponse.json({
            success: true,
            message: 'Unfollowed user',
            isFollowing: false
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to unfollow user'
        console.error('[follows] Unfollow error:', err);
        return NextResponse.json({ error: message }, { status: 500 })
    }
}

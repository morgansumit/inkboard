import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    
    // Use anon client for public data (doesn't require cookies)
    const anonClient = createAnonClient();
    if (!anonClient) {
      throw new Error('Failed to create anon client');
    }
    
    // Get like count (public data)
    const { count: likeCount, error: likeError } = await anonClient
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (likeError) {
      console.error('[engagement] Like count error:', likeError);
    }

    // Get comment count (public data)
    const { count: commentCount, error: commentError } = await anonClient
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (commentError) {
      console.error('[engagement] Comment count error:', commentError);
    }

    // Check if current user liked this post (requires auth)
    let isLiked = false;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: userLike, error: userLikeError } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userLikeError) {
          isLiked = !!userLike;
        }
      }
    } catch (authError) {
      // Auth not available, ignore
      console.log('[engagement] Auth check skipped');
    }

    return NextResponse.json({
      success: true,
      engagement: {
        like_count: likeCount || 0,
        comment_count: commentCount || 0,
        is_liked: isLiked,
        share_count: 0
      }
    });

  } catch (error) {
    console.error('Engagement API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch engagement data',
      engagement: {
        like_count: 0,
        comment_count: 0,
        is_liked: false,
        share_count: 0
      }
    }, { status: 500 });
  }
}

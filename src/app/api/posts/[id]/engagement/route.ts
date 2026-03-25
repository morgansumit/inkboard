import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    
    // Get current user (optional - for checking if user liked the post)
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get like count
    const { count: likeCount, error: likeError } = await supabase
      .from('post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (likeError && likeError.code !== 'PGRST116') {
      console.error('Error fetching like count:', likeError);
    }

    // Get comment count
    const { count: commentCount, error: commentError } = await supabase
      .from('post_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    if (commentError && commentError.code !== 'PGRST116') {
      console.error('Error fetching comment count:', commentError);
    }

    // Check if current user liked this post
    let isLiked = false;
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

    return NextResponse.json({
      success: true,
      engagement: {
        like_count: likeCount || 0,
        comment_count: commentCount || 0,
        is_liked: isLiked,
        share_count: 0 // Placeholder for future implementation
      }
    });

  } catch (error) {
    console.error('Engagement API error:', error);
    return NextResponse.json({ 
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

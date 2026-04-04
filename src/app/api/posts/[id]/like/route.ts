import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user already liked this post
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Database error', details: checkError.message }, { status: 500 });
    }

    let isLiked = false;

    if (existingLike) {
      // Unlike the post
      const { error: unlikeError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (unlikeError) {
        return NextResponse.json({ error: 'Failed to unlike', details: unlikeError.message }, { status: 500 });
      }
      
      isLiked = false;
    } else {
      // Like the post
      const { error: likeError } = await supabase
        .from('post_likes')
        .insert({
          post_id: postId,
          user_id: user.id,
          created_at: new Date().toISOString()
        });

      if (likeError) {
        return NextResponse.json({ error: 'Failed to like', details: likeError.message }, { status: 500 });
      }
      
      isLiked = true;
    }

    return NextResponse.json({ 
      success: true, 
      isLiked
    });

  } catch (error) {
    console.error('Like API error:', error);
    return NextResponse.json({ error: 'Failed to process like', details: (error as Error).message }, { status: 500 });
  }
}

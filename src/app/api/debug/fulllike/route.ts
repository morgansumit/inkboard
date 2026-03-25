import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const postId = 'user-91dd6341-30aa-4c3c-851a-be247cb9b6f7';
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ 
        step: 'auth', 
        error: authError?.message || 'No user found',
        user: null 
      });
    }

    // Check if user already liked this post
    const { data: existingLike, error: checkError } = await supabase
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ 
        step: 'check-like', 
        error: 'Database error', 
        details: checkError.message 
      });
    }

    let isLiked = false;
    let likeChange = 0;

    if (existingLike) {
      // Unlike the post
      const { error: unlikeError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (unlikeError) {
        return NextResponse.json({ 
          step: 'unlike', 
          error: 'Failed to unlike', 
          details: unlikeError.message 
        });
      }
      
      isLiked = false;
      likeChange = -1;
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
        return NextResponse.json({ 
          step: 'like', 
          error: 'Failed to like', 
          details: likeError.message 
        });
      }
      
      isLiked = true;
      likeChange = 1;
    }

    return NextResponse.json({ 
      step: 'success',
      success: true, 
      isLiked, 
      likeChange,
      user: { id: user.id, email: user.email }
    });

  } catch (error) {
    console.error('Full like debug error:', error);
    return NextResponse.json({ 
      step: 'catch',
      error: 'Internal error', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

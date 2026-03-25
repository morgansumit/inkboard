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
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to unlike' }, { status: 500 });
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
        return NextResponse.json({ error: 'Failed to like' }, { status: 500 });
      }
      
      isLiked = true;
      likeChange = 1;
    }

    // Update post like count in cache (temporarily disabled for testing)
    /*
    try {
      const fs = require('fs/promises');
      const path = require('path');
      const cacheFile = path.join(process.cwd(), '.inkboard-cache', 'posts.json');
      
      const cacheData = await fs.readFile(cacheFile, 'utf8');
      const posts = JSON.parse(cacheData);
      
      const postIndex = posts.findIndex((p: any) => p.id === postId);
      if (postIndex !== -1) {
        posts[postIndex].like_count = Math.max(0, posts[postIndex].like_count + likeChange);
        posts[postIndex].is_liked = isLiked;
        
        await fs.writeFile(cacheFile, JSON.stringify(posts, null, 2));
      }
    } catch (cacheError) {
      // Cache update failed but like was still recorded
      console.error('Failed to update cache:', cacheError);
    }
    */

    return NextResponse.json({ 
      success: true, 
      isLiked, 
      likeChange 
    });

  } catch (error) {
    console.error('Like API error:', error);
    return NextResponse.json({ error: 'Failed to like', details: (error as Error).message }, { status: 500 });
  }
}

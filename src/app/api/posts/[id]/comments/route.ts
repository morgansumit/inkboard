import { NextRequest, NextResponse } from 'next/server';
import { createAnonClient } from '@/lib/supabase/anon';
import { createClient } from '@/lib/supabase/server';

// GET - Fetch comments for a post (public data)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    
    // Use anon client for public data - doesn't require cookies
    const supabase = createAnonClient();
    if (!supabase) {
      console.error('[comments] Failed to create anon client');
      return NextResponse.json({ comments: [] });
    }

    const { data: comments, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[comments] fetch error:', error);
      return NextResponse.json({ comments: [] });
    }

    // Fetch user data for each comment
    const userIds = [...new Set(comments?.map(c => c.user_id) || [])];
    const { data: users } = userIds.length > 0 ? await supabase
      .from('users')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds) : { data: [] };

    const userMap = (users || []).reduce((acc: Record<string, any>, user) => {
      acc[user.id] = user;
      return acc;
    }, {});

    // Attach user data to comments
    const commentsWithAuthors = (comments || []).map(comment => ({
      ...comment,
      author: userMap[comment.user_id as string] || null
    }));

    return NextResponse.json({ comments: commentsWithAuthors });

  } catch (error) {
    console.error('[comments] API error:', error);
    return NextResponse.json({ comments: [] });
  }
}

// POST - Add a new comment
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

    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 });
    }

    if (content.length > 1000) {
      return NextResponse.json({ error: 'Comment too long (max 1000 characters)' }, { status: 400 });
    }

    // Get user profile (create if doesn't exist)
    const { data: profile, error: profileError } = await (await createClient())
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', user.id)
      .single();

    let finalProfile = profile;
    if (profileError) {
      // Create profile if it doesn't exist
      const { data: newProfile, error: createError } = await (await createClient())
        .from('profiles')
        .insert({
          id: user.id,
          username: user.email?.split('@')[0] || 'user',
          display_name: user.user_metadata?.display_name || user.email?.split('@')[0] || 'User',
          avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${user.email?.split('@')[0] || 'User'}`
        })
        .select('username, display_name, avatar_url')
        .single();
      
      if (createError) {
        return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 });
      }
      finalProfile = newProfile;
    }

    // Insert comment
    const { data: comment, error: insertError } = await (await createClient())
      .from('post_comments')
      .insert({
        post_id: postId,
        user_id: user.id,
        content: content.trim(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Comment insert error:', insertError);
      return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
    }

    // Update post comment count in Supabase
    try {
      await (await createClient())
        .from('posts')
        .update({ comment_count: (await (await createClient()).from('posts').select('comment_count').eq('id', postId).single()).data?.comment_count || 0 + 1 })
        .eq('id', postId);
    } catch (updateError) {
      console.error('Failed to update comment count:', updateError);
    }

    // Return comment with author info
    const responseComment = {
      ...comment,
      author: finalProfile
    };

    return NextResponse.json({ 
      success: true, 
      comment: responseComment 
    });

  } catch (error) {
    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete a comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const commentId = searchParams.get('commentId');
    
    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID is required' }, { status: 400 });
    }
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user owns the comment
    const { data: comment, error: fetchError } = await (await createClient())
      .from('post_comments')
      .select('*')
      .eq('id', commentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 });
    }

    // Delete comment
    const { error: deleteError } = await (await createClient())
      .from('post_comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
    }

    // Update post comment count in Supabase (decrement)
    try {
      const { data: currentPost } = await (await createClient())
        .from('posts')
        .select('comment_count')
        .eq('id', postId)
        .single();
      
      await (await createClient())
        .from('posts')
        .update({ comment_count: Math.max(0, (currentPost?.comment_count || 0) - 1) })
        .eq('id', postId);
    } catch (updateError) {
      console.error('Failed to update comment count:', updateError);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Comment delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

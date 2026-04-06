import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// GET - Fetch single post
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .select(`
        *,
        author:users(id, username, display_name, avatar_url, is_verified, is_business)
      `)
      .eq('id', id)
      .maybeSingle();

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    // Check if user is the author
    const isAuthor = authUser?.id === post.author_id;
    
    // If archived and not author, return 404
    if (post.status === 'ARCHIVED' && !isAuthor) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post, isAuthor });
  } catch (err) {
    console.error('[posts/[id]] Error fetching post:', err);
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 });
  }
}

// PUT - Edit post
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user owns the post
    const { data: existingPost } = await supabaseAdmin
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingPost || existingPost.author_id !== authUser.id) {
      return NextResponse.json({ error: 'Not authorized to edit this post' }, { status: 403 });
    }

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (body.title !== undefined) updates.title = body.title;
    if (body.subtitle !== undefined) updates.subtitle = body.subtitle;
    if (body.content !== undefined) updates.content = { html: body.content };
    if (body.cover_image_url !== undefined) updates.cover_image_url = body.cover_image_url;
    if (body.cover_aspect_ratio !== undefined) updates.cover_aspect_ratio = body.cover_aspect_ratio;
    if (body.video_url !== undefined) updates.video_url = body.video_url || null;
    if (body.status !== undefined) updates.status = body.status;
    if (body.read_time_minutes !== undefined) updates.read_time_minutes = body.read_time_minutes;

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[posts/[id]] Error updating post:', error);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ success: true, post });
  } catch (err) {
    console.error('[posts/[id]] Error updating post:', err);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// DELETE - Delete post
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user owns the post
    const { data: existingPost } = await supabaseAdmin
      .from('posts')
      .select('author_id')
      .eq('id', id)
      .maybeSingle();

    if (!existingPost || existingPost.author_id !== authUser.id) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 });
    }

    // Soft delete by setting status to REMOVED
    const { error } = await supabaseAdmin
      .from('posts')
      .update({ 
        status: 'REMOVED', 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id);

    if (error) {
      console.error('[posts/[id]] Error deleting post:', error);
      return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (err) {
    console.error('[posts/[id]] Error deleting post:', err);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}

// PATCH - Archive/Unarchive post
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await req.json(); // 'archive' or 'unarchive'
    
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify user owns the post
    const { data: existingPost } = await supabaseAdmin
      .from('posts')
      .select('author_id, status')
      .eq('id', id)
      .maybeSingle();

    if (!existingPost || existingPost.author_id !== authUser.id) {
      return NextResponse.json({ error: 'Not authorized to modify this post' }, { status: 403 });
    }

    const newStatus = action === 'archive' ? 'ARCHIVED' : 
                      (existingPost.status === 'ARCHIVED' ? 'PUBLISHED' : existingPost.status);

    const { data: post, error } = await supabaseAdmin
      .from('posts')
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[posts/[id]] Error archiving post:', error);
      return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      post,
      message: action === 'archive' ? 'Post archived' : 'Post unarchived'
    });
  } catch (err) {
    console.error('[posts/[id]] Error archiving post:', err);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const postId = 'user-91dd6341-30aa-4c3c-851a-be247cb9b6f7';
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({ 
        step: 'auth', 
        error: 'Auth error', 
        details: authError.message,
        user: null 
      });
    }

    if (!user) {
      return NextResponse.json({ 
        step: 'auth', 
        error: 'No user found',
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

    return NextResponse.json({ 
      step: 'check-like',
      success: true,
      user: { id: user.id, email: user.email },
      existingLike,
      checkError: checkError?.message
    });

  } catch (error) {
    console.error('Debug like error:', error);
    return NextResponse.json({ 
      step: 'catch',
      error: 'Internal error', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

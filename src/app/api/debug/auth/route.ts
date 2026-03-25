import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      return NextResponse.json({ 
        error: 'Auth error', 
        details: authError.message,
        user: null 
      });
    }

    return NextResponse.json({ 
      success: true,
      user: user ? {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata
      } : null,
      authError: authError?.message
    });

  } catch (error) {
    console.error('Debug auth error:', error);
    return NextResponse.json({ 
      error: 'Internal error', 
      details: (error as Error).message 
    }, { status: 500 });
  }
}

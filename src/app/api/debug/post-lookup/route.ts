import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
    const id = request.nextUrl.searchParams.get('id') || 'test';
    const results: Record<string, any> = {
        id,
        env: {
            NETLIFY: process.env.NETLIFY,
            hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        },
        steps: [],
    };

    // Step 1: Try creating anon client
    try {
        const { createAnonClient } = await import('@/lib/supabase/anon');
        const client = createAnonClient();
        results.steps.push({ step: 'createAnonClient', success: !!client });
        
        if (client) {
            // Step 2: Try fetching all published posts
            const { data: posts, error } = await client
                .from('posts')
                .select('id, title, source_platform')
                .eq('status', 'PUBLISHED')
                .limit(5);
            
            results.steps.push({ 
                step: 'fetchPosts', 
                success: !error, 
                count: posts?.length || 0,
                error: error?.message,
                sampleIds: posts?.map((p: any) => p.id) || []
            });

            // Step 3: Try looking up specific post by ID
            const { data: post, error: lookupError } = await client
                .from('posts')
                .select('id, title')
                .eq('id', id)
                .maybeSingle();
            
            results.steps.push({
                step: 'lookupById',
                success: !lookupError,
                found: !!post,
                error: lookupError?.message,
                post: post ? { id: post.id, title: post.title } : null
            });
        }
    } catch (err) {
        results.steps.push({ step: 'error', message: (err as Error).message, stack: (err as Error).stack?.slice(0, 500) });
    }

    // Step 4: Try postRepository
    try {
        const { postRepository } = await import('@/lib/postRepository');
        const found = await postRepository.findById(id);
        results.steps.push({
            step: 'postRepository.findById',
            found: !!found,
            postTitle: found?.title,
        });
    } catch (err) {
        results.steps.push({ step: 'postRepository error', message: (err as Error).message, stack: (err as Error).stack?.slice(0, 500) });
    }

    return NextResponse.json(results, { status: 200 });
}

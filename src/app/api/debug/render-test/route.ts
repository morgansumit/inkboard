import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    const results: Record<string, any> = { steps: [] };

    // Step 1: Test postRepository
    try {
        const { postRepository } = await import('@/lib/postRepository');
        const all = await postRepository.getAll();
        results.steps.push({ step: 'postRepository', success: true, count: all.length });
    } catch (err) {
        results.steps.push({ step: 'postRepository', error: (err as Error).message });
    }

    // Step 2: Test importing PostDetailClient module
    try {
        await import('@/app/post/[id]/PostDetailClient');
        results.steps.push({ step: 'import PostDetailClient', success: true });
    } catch (err) {
        results.steps.push({ step: 'import PostDetailClient', error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500) });
    }

    // Step 3: Test importing isomorphic-dompurify
    try {
        await import('isomorphic-dompurify');
        results.steps.push({ step: 'import isomorphic-dompurify', success: true });
    } catch (err) {
        results.steps.push({ step: 'import isomorphic-dompurify', error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500) });
    }

    // Step 4: Test importing Comments component
    try {
        await import('@/components/Comments');
        results.steps.push({ step: 'import Comments', success: true });
    } catch (err) {
        results.steps.push({ step: 'import Comments', error: (err as Error).message, stack: (err as Error).stack?.slice(0, 500) });
    }

    // Step 5: Test the page module itself
    try {
        await import('@/app/post/[id]/page');
        results.steps.push({ step: 'import post page', success: true });
    } catch (err) {
        results.steps.push({ step: 'import post page', error: (err as Error).message, stack: (err as Error).stack?.slice(0, 800) });
    }

    return NextResponse.json(results);
}

import { postRepository } from '@/lib/postRepository';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Comment } from '@/types';
import { PostDetailClient } from './PostDetailClient';

export const runtime = 'nodejs';

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    try {
        const { id } = await params;
        const post = await postRepository.findById(id);
        if (!post) return { title: 'Post Not Found | Inkboard' };
        return {
            title: `${post.title} | Inkboard`,
            description: post.subtitle,
            openGraph: {
                title: post.title,
                description: post.subtitle,
                images: [post.cover_image_url],
                type: 'article',
            },
        };
    } catch (error) {
        console.error('[PostPage] Metadata error:', error);
        return { title: 'Post | Inkboard' };
    }
}

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await props.params;
        console.log('[PostPage] Loading post:', id);
        
        const post = await postRepository.findById(id);
        console.log('[PostPage] Found post:', post ? 'yes' : 'no');

        if (!post) {
            return (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                    <h1>Post not found</h1>
                    <p>ID: {id}</p>
                    <Link href="/">← Back to feed</Link>
                </div>
            );
        }
        
        const comments: Comment[] = [];
        const allPosts = await postRepository.getAll();

        const sameAuthorPosts = allPosts.filter(p => p.author_id === post.author_id && p.id !== post.id);
        const fallbackPosts = allPosts.filter(p => p.id !== post.id && p.author_id !== post.author_id);
        const morePosts = [...sameAuthorPosts, ...fallbackPosts].slice(0, 12);

        return <PostDetailClient post={post} comments={comments} morePosts={morePosts} />;
    } catch (error) {
        console.error('[PostPage] Error:', error);
        return (
            <div style={{ padding: '48px', textAlign: 'center' }}>
                <h1>Error loading post</h1>
                <p>Something went wrong. Please try again.</p>
                <Link href="/">← Back to feed</Link>
            </div>
        );
    }
}

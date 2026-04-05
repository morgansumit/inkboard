import { postRepository } from '@/lib/postRepository';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { Comment } from '@/types';
import { PostDetailClient } from './PostDetailClient';
import { getCountryFromRequest } from '@/lib/geo';

export const runtime = 'nodejs';

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    try {
        const { id } = await params;
        const post = await postRepository.findById(id);
        if (!post) return { title: 'Post Not Found | purseable' };
        return {
            title: `${post.title} | purseable`,
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
        return { title: 'Post | purseable' };
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

        // Geoblocking: if post is country-restricted, check viewer's country
        if (post.country_code) {
            const viewerCountry = await getCountryFromRequest();
            if (viewerCountry && post.country_code !== viewerCountry) {
                return (
                    <div style={{ padding: '48px', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
                        <div style={{ fontSize: '72px', marginBottom: '16px' }}>🌍</div>
                        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                            Not available in your region
                        </h1>
                        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px', lineHeight: 1.6 }}>
                            This post is only available to readers in the country where it was published.
                        </p>
                        <Link href="/" style={{ color: 'var(--color-accent)' }}>← Back to feed</Link>
                    </div>
                );
            }
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

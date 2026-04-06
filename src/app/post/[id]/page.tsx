import Link from 'next/link';
import type { Metadata } from 'next';
import type { Comment } from '@/types';
import { PostDetailClient } from './PostDetailClient';
import { getCountryFromRequest } from '@/lib/geo';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function getSupabase() {
    const { createAnonClient } = await import('@/lib/supabase/anon');
    return createAnonClient();
}

function transformPost(p: any) {
    return {
        id: p.id,
        title: p.title,
        subtitle: p.subtitle || '',
        content: typeof p.content === 'string' ? p.content : p.content?.html || '',
        cover_image_url: p.cover_image_url,
        cover_aspect_ratio: p.cover_aspect_ratio || '16:9',
        author_id: p.author_id,
        author: p.author ? {
            id: p.author.id,
            email: '',
            username: p.author.username || 'unknown',
            display_name: p.author.display_name || p.author.username || 'Unknown User',
            bio: p.author.bio || '',
            avatar_url: p.author.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${p.author.username || 'user'}`,
            location: p.author.location || '',
            role: p.author.role || 'USER',
            is_verified: p.author.is_verified || false,
            is_suspended: p.author.is_suspended || false,
            is_business: p.author.is_business || false,
            created_at: p.author.created_at,
            follower_count: p.author.follower_count || 0,
            following_count: p.author.following_count || 0,
            total_likes: p.author.total_likes || 0,
            post_count: p.author.post_count || 0,
        } : undefined,
        status: p.status,
        read_time_minutes: p.read_time_minutes || 1,
        engagement_score: p.engagement_score || 0,
        like_count: p.like_count || 0,
        comment_count: p.comment_count || 0,
        share_count: p.share_count || 0,
        is_trending: p.is_trending || false,
        source_url: p.source_url,
        country_code: p.country_code || null,
        created_at: p.created_at,
        published_at: p.published_at,
        tags: [],
    };
}

export async function generateStaticParams() {
    return [];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    try {
        const { id } = await params;
        const supabase = await getSupabase();
        if (!supabase) return { title: 'Post | purseable' };

        const { data: post } = await supabase
            .from('posts')
            .select('title, subtitle, cover_image_url')
            .eq('id', id)
            .maybeSingle();

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
        const supabase = await getSupabase();

        if (!supabase) {
            return (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                    <h1>Error loading post</h1>
                    <Link href="/">← Back to feed</Link>
                </div>
            );
        }

        const { data: rawPost, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey(id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at, follower_count, following_count)
            `)
            .eq('id', id)
            .maybeSingle();

        if (error || !rawPost) {
            return (
                <div style={{ padding: '48px', textAlign: 'center' }}>
                    <h1>Post not found</h1>
                    <p>ID: {id}</p>
                    <Link href="/">← Back to feed</Link>
                </div>
            );
        }

        const post = transformPost(rawPost);

        // Geoblocking
        if (post.country_code) {
            const viewerCountry = await getCountryFromRequest();
            console.log('[PostPage] Post country:', post.country_code, 'Viewer country:', viewerCountry || 'null');
            // Block if viewer country is null (localhost) OR doesn't match post's country
            if (!viewerCountry || post.country_code !== viewerCountry) {
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

        // Fetch post tags
        const { data: postTags } = await supabase
            .from('post_tags')
            .select('tags(id, name)')
            .eq('post_id', id);

        const tags = (postTags?.map(pt => pt.tags).filter(Boolean) || []) as any[];

        // Fetch related posts by matching tags
        let morePosts: any[] = [];
        if (tags.length > 0) {
            const tagIds = tags.map(t => t.id);
            const { data: relatedPosts } = await supabase
                .from('post_tags')
                .select(`
                    post_id,
                    posts!inner(
                        *,
                        author:users!posts_author_id_fkey(id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at, follower_count, following_count)
                    )
                `)
                .in('tag_id', tagIds)
                .neq('post_id', id)
                .limit(20);

            // Deduplicate and transform
            const uniquePosts = new Map();
            relatedPosts?.forEach((item: any) => {
                if (item.posts && !uniquePosts.has(item.posts.id)) {
                    uniquePosts.set(item.posts.id, item.posts);
                }
            });
            morePosts = Array.from(uniquePosts.values()).slice(0, 12).map(transformPost);
        }
        const comments: Comment[] = [];

        // Check if current user follows the post author
        let isFollowingAuthor = false;
        if (post.author?.id) {
            const supabase = await createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: followData } = await supabase
                    .from('follows')
                    .select('follower_id')
                    .eq('follower_id', user.id)
                    .eq('following_id', post.author.id)
                    .maybeSingle();
                isFollowingAuthor = !!followData;
            }
        }

        return <PostDetailClient post={post} comments={comments} morePosts={morePosts} isFollowingAuthor={isFollowingAuthor} />;
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

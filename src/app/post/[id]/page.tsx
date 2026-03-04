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
}

export default async function PostPage(props: { params: Promise<{ id: string }> }) {
    const { id } = await props.params;
    const post = await postRepository.findById(id);

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
    const morePosts = allPosts.filter(p => p.author_id === post.author_id && p.id !== post.id).slice(0, 4);

    return <PostDetailClient post={post} comments={comments} morePosts={morePosts} />;
}

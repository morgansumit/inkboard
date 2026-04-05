import type { Metadata } from 'next';
import Link from 'next/link';
import { postRepository } from '@/lib/postRepository';
import { PostCard } from '@/components/PostCard';

export const runtime = 'nodejs';

type SourceName = 'devto' | 'hashnode' | 'wikinews';

function normalizeSourceName(name: string): SourceName | null {
    const n = name.toLowerCase();
    if (n === 'devto' || n === 'hashnode' || n === 'wikinews') return n;
    return null;
}

function sourceLabel(name: SourceName): string {
    if (name === 'devto') return 'Dev.to';
    if (name === 'hashnode') return 'Hashnode';
    return 'Wikinews';
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
    const { name } = await params;
    const normalized = normalizeSourceName(name);
    if (!normalized) return { title: 'Source Not Found | purseable' };
    return {
        title: `${sourceLabel(normalized)} | purseable`,
        description: `All posts from ${sourceLabel(normalized)}.`,
    };
}

export default async function SourcePage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const normalized = normalizeSourceName(name);

    if (!normalized) {
        return (
            <div style={{ padding: '48px', textAlign: 'center' }}>
                <h1>Source not found</h1>
                <Link href="/">← Back to feed</Link>
            </div>
        );
    }

    const allPosts = await postRepository.getAll();
    const posts = allPosts.filter(p => p.source === normalized && p.status === 'PUBLISHED' && p.content && p.content.trim().length > 0);

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '28px 24px 18px' }}>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 800, fontSize: '28px', marginBottom: '6px' }}>
                    {sourceLabel(normalized)}
                </h1>
                <p style={{ fontFamily: 'var(--font-ui)', color: 'var(--color-muted)', fontSize: '14px' }}>
                    {posts.length} posts
                </p>
            </div>

            {posts.length > 0 ? (
                <div className="masonry-grid" style={{ paddingTop: 0 }}>
                    {posts.map((post, i) => (
                        <PostCard key={post.id} post={post} index={i} />
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '64px 24px', color: 'var(--color-muted)', fontFamily: 'var(--font-ui)' }}>
                    <p>No posts for this source yet. Refresh the feed to trigger ingestion.</p>
                </div>
            )}
        </div>
    );
}

import { MOCK_POSTS, MOCK_TAGS } from '@/lib/mockData';
import { PostCard } from '@/components/PostCard';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
    const { name } = await params;
    return {
        title: `#${name} — Stories & Articles | purseable`,
        description: `Explore all posts tagged with "${name}" on purseable — Europe's platform for long-form writing.`,
    };
}

export default async function TagPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const decode = decodeURIComponent(name);
    const posts = MOCK_POSTS.filter(p => p.tags.some(t => t.name === decode)).sort((a, b) => b.engagement_score - a.engagement_score);
    const tag = MOCK_TAGS.find(t => t.name === decode);

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
            {/* Tag Header */}
            <div style={{
                background: 'linear-gradient(135deg, #0F3460 0%, #1A1A2E 100%)',
                padding: '48px 24px', textAlign: 'center',
            }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'var(--font-ui)', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Topic</p>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', color: 'white', marginBottom: '12px' }}>
                    #{decode}
                </h1>
                {tag && (
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'var(--font-ui)' }}>
                        {tag.post_count.toLocaleString()} posts
                    </p>
                )}
            </div>

            {/* Posts */}
            <div style={{ padding: '32px 24px 16px', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700 }}>
                        {posts.length > 0 ? `${posts.length} stories` : 'No stories yet'}
                    </h2>
                    <select className="input" style={{ width: 'auto', fontSize: '13px', paddingTop: '7px', paddingBottom: '7px' }}>
                        <option>Most Engaging</option>
                        <option>Most Recent</option>
                        <option>Most Liked</option>
                    </select>
                </div>
            </div>

            {posts.length > 0 ? (
                <div className="masonry-grid">
                    {posts.map((post, i) => <PostCard key={post.id} post={post} index={i} />)}
                </div>
            ) : (
                <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--color-muted)' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📭</div>
                    <p style={{ fontFamily: 'var(--font-ui)', fontSize: '16px' }}>No posts with this tag yet.</p>
                    <a href="/compose" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: '16px' }}>
                        Be the first to write →
                    </a>
                </div>
            )}
        </div>
    );
}

import { PostCard } from '@/components/PostCard';
import type { Metadata } from 'next';
import { getCountryFromRequest } from '@/lib/geo';

export const runtime = 'nodejs';

async function getSupabase() {
    const { createAnonClient } = await import('@/lib/supabase/anon');
    return createAnonClient();
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
    const { name } = await params;
    return {
        title: `#${name} — Stories & Articles | centsably`,
        description: `Explore all posts tagged with "${name}" on centsably — Europe's platform for long-form writing.`,
    };
}

export default async function TagPage({ params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const decode = decodeURIComponent(name);
    const supabase = await getSupabase();
    const viewerCountry = await getCountryFromRequest();

    let posts: any[] = [];
    if (supabase) {
        // First get the tag ID from the tag name
        const { data: tagData } = await supabase
            .from('tags')
            .select('id')
            .eq('name', decode)
            .single();

        if (tagData) {
            // Get posts that have this tag
            const { data: postTags } = await supabase
                .from('post_tags')
                .select('post_id')
                .eq('tag_id', tagData.id);

            if (postTags && postTags.length > 0) {
                const postIds = postTags.map(pt => pt.post_id);
                
                // Build query with geoblocking
                let query = supabase
                    .from('posts')
                    .select(`
                        *,
                        author:users!posts_author_id_fkey(id, username, display_name, avatar_url)
                    `)
                    .eq('status', 'PUBLISHED')
                    .not('author_id', 'is', null)
                    .in('id', postIds);

                // Apply geoblocking: show global posts OR posts from viewer's country
                if (viewerCountry) {
                    query = query.or(`country_code.is.null,country_code.eq.${viewerCountry}`);
                } else {
                    // On localhost, only show global posts
                    query = query.is('country_code', null);
                }

                const { data } = await query
                    .order('engagement_score', { ascending: false })
                    .limit(50);
                posts = data || [];
            }
        }
    }

    return (
        <div style={{ background: 'var(--color-bg)', minHeight: '100vh' }}>
            <div style={{
                background: 'linear-gradient(135deg, #0F3460 0%, #1A1A2E 100%)',
                padding: '48px 24px', textAlign: 'center',
            }}>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', fontFamily: 'var(--font-ui)', marginBottom: '8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Topic</p>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontWeight: 800, fontSize: 'clamp(28px, 4vw, 48px)', color: 'white', marginBottom: '12px' }}>
                    #{decode}
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', fontFamily: 'var(--font-ui)' }}>
                    {posts.length} posts
                </p>
            </div>

            <div style={{ padding: '32px 24px 16px', maxWidth: '1600px', margin: '0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', fontWeight: 700 }}>
                        {posts.length > 0 ? `${posts.length} stories` : 'No stories yet'}
                    </h2>
                </div>
            </div>

            {posts.length > 0 ? (
                <div className="masonry-grid">
                    {posts.map((post: any, i: number) => <PostCard key={post.id} post={post} index={i} />)}
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

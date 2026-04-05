import axios from 'axios';
import { Post, User } from '@/types';
import { supabaseAdmin } from '@/lib/supabase/admin';
import crypto from 'crypto';

// Generate a deterministic user ID per source
function getSourceAuthor(sourceName: string, role: User['role'] = 'USER'): User {
    const slug = sourceName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const id = `source-${slug || 'unknown'}`;
    return {
        id,
        email: `${id}@purseable.eu`,
        username: id,
        display_name: sourceName,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(sourceName)}`,
        bio: `${sourceName} syndication feed`,
        location: '',
        role,
        is_verified: true,
        is_suspended: false,
        is_business: true,
        created_at: new Date().toISOString(),
        follower_count: 0,
        following_count: 0,
        total_likes: 0,
        post_count: 0,
    };
}

function slugify(value: string) {
    return (value || 'external-source')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        || 'external-source';
}

type StoredPost = Post & {
    source_name?: string;
};

export class ContentIngestionService {
    async fetchDevTo(): Promise<Post[]> {
        try {
            const { data } = await axios.get('https://dev.to/api/articles?per_page=30&top=1', { timeout: 10000 });
            return data.map((article: any): Post => ({
                id: `devto-${article.id}`,
                title: article.title,
                content: article.body_html || article.body_markdown || '',
                subtitle: article.description,
                cover_image_url: article.cover_image || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&q=80',
                cover_aspect_ratio: '16:9',
                author_id: `source-devto`,
                author: getSourceAuthor(article.user?.name || 'Dev.to Publisher', 'USER'),
                tags: (article.tag_list || []).map((t: string) => ({ id: t, name: t, post_count: 1 })),
                source_url: article.url,
                published_at: article.published_at,
                created_at: article.published_at,
                read_time_minutes: article.reading_time_minutes || Math.max(1, Math.ceil((article.description?.length || 500) / 200)),
                source: 'devto',
                status: 'PUBLISHED',
                engagement_score: 100,
                like_count: Math.floor(Math.random() * 500),
                comment_count: 0,
                share_count: 0,
                is_trending: Math.random() > 0.8,
            }));
        } catch (err) {
            console.error('Error fetching DevTo:', err);
            return [];
        }
    }

    async fetchWikinews(): Promise<Post[]> {
        try {
            const { data } = await axios.get('https://en.wikinews.org/w/api.php', {
                timeout: 10000,
                headers: {
                    'User-Agent': 'purseableBot/1.0 (+https://localhost; contact: admin@purseable.local)',
                    'Accept': 'application/json,text/plain,*/*',
                },
                params: {
                    action: 'query',
                    list: 'recentchanges',
                    rcnamespace: 0,
                    rctype: 'new',
                    rclimit: 25,
                    rcprop: 'title|timestamp|ids|user',
                    rcshow: '!bot',
                    format: 'json',
                },
            });

            const changes = data?.query?.recentchanges || [];
            type WikinewsRecentItem = { title: string; timestamp: string; pageid?: number; user?: string };

            const titles: WikinewsRecentItem[] = (changes as any[])
                .filter((c: any) => typeof c?.title === 'string')
                .map((c: any): WikinewsRecentItem => ({ title: c.title, timestamp: c.timestamp, pageid: c.pageid, user: c.user }))
                .filter((t: WikinewsRecentItem) => !t.title.includes(':'));

            const limited = titles.slice(0, 12);
            const htmlPagesSettled = await Promise.allSettled(
                limited.map(async (t: WikinewsRecentItem) => {
                    const titleSlug = t.title.replace(/ /g, '_');
                    const htmlRes = await axios.get(`https://en.wikinews.org/api/rest_v1/page/html/${encodeURIComponent(titleSlug)}`, {
                        timeout: 10000,
                        headers: {
                            'User-Agent': 'purseableBot/1.0 (+https://localhost; contact: admin@purseable.local)',
                            'Accept': 'text/html,application/xhtml+xml',
                        },
                    });
                    const html = typeof htmlRes.data === 'string' ? htmlRes.data : '';
                    return { ...t, titleSlug, html };
                })
            );

            const htmlPages = htmlPagesSettled
                .filter((r): r is PromiseFulfilledResult<{ title: string; timestamp: string; pageid?: number; user?: string; titleSlug: string; html: string }> => r.status === 'fulfilled')
                .map(r => r.value);

            return htmlPages
                .filter(p => p.html && p.html.trim().length > 0)
                .map((p): Post => {
                    const firstImage = (p.html.match(/<img[^>]+src="([^"]+)"/i)?.[1]) || '';
                    const cover = firstImage || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&q=80';
                    const canonicalUrl = `https://en.wikinews.org/wiki/${encodeURIComponent(p.titleSlug)}`;
                    const byline = p.user ? `Wikinews contributor: ${p.user}` : 'Wikinews';
                    const author = getSourceAuthor(byline, 'USER');

                    return {
                        id: `wikinews-${p.pageid ?? p.titleSlug}`,
                        title: p.title,
                        content: p.html,
                        subtitle: '',
                        cover_image_url: cover,
                        cover_aspect_ratio: '16:9',
                        author_id: author.id,
                        author,
                        tags: [{ id: 'wikinews', name: 'wikinews', post_count: 1 }],
                        source_url: canonicalUrl,
                        published_at: p.timestamp,
                        created_at: p.timestamp,
                        read_time_minutes: Math.max(2, Math.ceil(p.html.length / 4000)),
                        source: 'wikinews',
                        status: 'PUBLISHED',
                        engagement_score: 100,
                        like_count: Math.floor(Math.random() * 500),
                        comment_count: 0,
                        share_count: 0,
                        is_trending: Math.random() > 0.85,
                    };
                });
        } catch (err) {
            console.error('Error fetching Wikinews:', err);
            return [];
        }
    }

    async fetchHashnode(): Promise<Post[]> {
        try {
            const query = `
            query {
              feed(first: 30, filter: { type: FEATURED }) {
                edges {
                  node {
                    id
                    title
                    brief
                    content { html }
                    coverImage { url }
                    author { name username profilePicture }
                    tags { name }
                    url
                    readTimeInMinutes
                    publishedAt
                  }
                }
              }
            }`;
            const { data } = await axios.post('https://gql.hashnode.com', { query }, { timeout: 10000 });
            const edges = data?.data?.feed?.edges || [];

            return edges.map(({ node }: any): Post => ({
                id: `hashnode-${node.id || Math.random().toString(36).substr(2, 9)}`,
                title: node.title,
                content: node.content?.html || '',
                subtitle: node.brief,
                cover_image_url: node.coverImage?.url || 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=80',
                cover_aspect_ratio: '16:9',
                author_id: `source-hashnode`,
                author: getSourceAuthor(node.author?.name || 'Hashnode Publisher', 'USER'),
                tags: (node.tags || []).map((t: any) => ({ id: t.name, name: t.name, post_count: 1 })),
                source_url: node.url,
                published_at: node.publishedAt,
                created_at: node.publishedAt,
                read_time_minutes: node.readTimeInMinutes || 5,
                source: 'hashnode',
                status: 'PUBLISHED',
                engagement_score: 100,
                like_count: Math.floor(Math.random() * 500),
                comment_count: 0,
                share_count: 0,
                is_trending: Math.random() > 0.8,
            }));
        } catch (err) {
            console.error('Error fetching Hashnode:', err);
            return [];
        }
    }

    async fetchGuardian(): Promise<Post[]> {
        try {
            const { data } = await axios.get('https://content.guardianapis.com/search?show-fields=body,thumbnail,byline,trailText&api-key=test&page-size=30&order-by=newest', { timeout: 10000 });
            const results = data?.response?.results || [];

            return results.map((fields: any): Post => ({
                id: `guardian-${String(fields.id).replace(/\//g, '-')}`,
                title: fields.fields?.headline || fields.webTitle,
                content: fields.fields?.body || '',
                subtitle: fields.fields?.trailText || '',
                cover_image_url: fields.fields?.thumbnail || 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=600&q=80',
                cover_aspect_ratio: '4:3',
                author_id: `source-guardian`,
                author: getSourceAuthor(fields.fields?.byline || 'The Guardian Writer', 'USER'),
                tags: [{ id: fields.sectionName, name: fields.sectionName?.toLowerCase(), post_count: 1 }],
                source_url: fields.webUrl,
                published_at: fields.webPublicationDate,
                created_at: fields.webPublicationDate,
                read_time_minutes: Math.max(2, Math.ceil((fields.fields?.body?.length || 1000) / 1000)),
                source: 'guardian',
                status: 'PUBLISHED',
                engagement_score: 100,
                like_count: Math.floor(Math.random() * 500),
                comment_count: 0,
                share_count: 0,
                is_trending: Math.random() > 0.8,
            }));
        } catch (err) {
            console.error('Error fetching Guardian:', err);
            return [];
        }
    }

    async ingestAll(): Promise<void> {
        console.log('Ingesting content from external sources...');
        const [devto, hashnode, wikinews] = await Promise.all([
            this.fetchDevTo(),
            this.fetchHashnode(),
            this.fetchWikinews()
        ]);

        const allIngested: StoredPost[] = [...devto, ...hashnode, ...wikinews];

        let stored = 0;
        for (const post of allIngested) {
            try {
                await this.storePost(post as StoredPost);
                stored++;
            } catch (err) {
                console.error('Failed to persist post', post.id, err);
            }
        }

        console.log(`Ingestion complete. Stored ${stored} posts in Supabase.`);
    }

    private async storePost(post: StoredPost) {
        if (!post?.source_url) return;

        const sourceName = post.source_name || post.author?.display_name || post.source?.toUpperCase() || 'External Source';
        const sourceSlug = slugify(sourceName);

        const tagNames = (post.tags ?? [])
            .map(tag => (typeof tag?.name === 'string' ? tag.name.trim() : ''))
            .filter(Boolean);

        let tagIds: string[] = [];
        if (tagNames.length) {
            const { data: tagsData, error: tagError } = await supabaseAdmin
                .from('tags')
                .upsert(tagNames.map(name => ({ name })), { onConflict: 'name' })
                .select('id, name');

            if (tagError) throw tagError;
            tagIds = (tagsData ?? []).map(t => t.id);
        }

        const { data: sourceRecord, error: sourceError } = await supabaseAdmin
            .from('external_sources')
            .upsert({
                slug: sourceSlug,
                name: sourceName,
                display_name: sourceName,
                avatar_url: post.author?.avatar_url,
                profile_url: post.source_url,
                metadata: {
                    platform: post.source,
                },
            }, { onConflict: 'slug' })
            .select('id')
            .single();

        if (sourceError) throw sourceError;
        if (!sourceRecord?.id) throw new Error('Failed to resolve external_sources record id');

        const { data: existingPost, error: existingPostError } = await supabaseAdmin
            .from('posts')
            .select('id')
            .eq('source_url', post.source_url)
            .maybeSingle();

        if (existingPostError && existingPostError.code !== 'PGRST116') {
            throw existingPostError;
        }

        const postId = existingPost?.id ?? crypto.randomUUID();

        const payload = {
            id: postId,
            author_id: null,
            title: post.title,
            subtitle: post.subtitle || '',
            content: post.content ? { html: post.content } : null,
            cover_image_url: post.cover_image_url,
            cover_aspect_ratio: post.cover_aspect_ratio,
            status: post.status,
            read_time_minutes: post.read_time_minutes,
            engagement_score: post.engagement_score,
            created_at: post.created_at,
            published_at: post.published_at,
            updated_at: post.published_at || post.created_at,
            source_id: sourceRecord.id,
            source_platform: post.source,
            source_url: post.source_url,
            like_count: post.like_count ?? 0,
            comment_count: post.comment_count ?? 0,
            share_count: post.share_count ?? 0,
            is_trending: post.is_trending ?? false,
        } as const;

        const { error: postError } = await supabaseAdmin
            .from('posts')
            .upsert(payload, { onConflict: 'id' });

        if (postError) throw postError;

        if (tagIds.length) {
            const rows = tagIds.map(tag_id => ({ post_id: postId, tag_id }));
            const { error: postTagsError } = await supabaseAdmin
                .from('post_tags')
                .upsert(rows, { onConflict: 'post_id,tag_id' });
            if (postTagsError) throw postTagsError;
        }
    }
}

export const contentIngestionService = new ContentIngestionService();

import type { Post, Tag, User } from '@/types';
import { supabaseAdmin } from '@/lib/supabase/admin';

const POST_SELECT = `
  id,
  title,
  subtitle,
  content,
  cover_image_url,
  cover_aspect_ratio,
  status,
  read_time_minutes,
  engagement_score,
  created_at,
  published_at,
  updated_at,
  like_count,
  comment_count,
  share_count,
  is_trending,
  source_platform,
  source_url,
  source_id,
  author_id,
  video_url,
  country_code,
  users:author_id ( id, email, username, display_name, bio, avatar_url, location, role, is_verified, is_suspended, is_business, created_at ),
  post_tags ( tags ( id, name, post_count ) )
`;

type DbPost = {
  id: string;
  title: string;
  subtitle?: string;
  content?: any;
  cover_image_url: string;
  cover_aspect_ratio: Post['cover_aspect_ratio'];
  status: Post['status'];
  read_time_minutes: number;
  engagement_score: number;
  created_at: string;
  published_at?: string;
  updated_at?: string;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_trending: boolean;
  source_platform?: string;
  source_url?: string;
  source_id?: string;
  author_id?: string;
  video_url?: string | null;
  country_code?: string | null;
  users?: DbUser | DbUser[] | null;
  post_tags?: { tags?: DbTag | DbTag[] | null }[] | null;
};

type DbUser = {
  id: string;
  email?: string;
  username?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  role?: User['role'];
  is_verified?: boolean;
  is_suspended?: boolean;
  is_business?: boolean;
  created_at?: string;
};

type DbTag = {
  id: string;
  name: string;
  post_count?: number;
};

function toSingle<T>(value?: T | T[] | null): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value.find(Boolean) as T | undefined) ?? null : value;
}

function normalizeTag(tag?: DbTag | DbTag[] | null): DbTag[] {
  if (!tag) return [];
  return Array.isArray(tag) ? (tag.filter(Boolean) as DbTag[]) : [tag];
}

function ensureUser(record?: DbPost['users']): User {
  const normalizedRecord = toSingle(record);
  if (normalizedRecord) {
    return {
      id: normalizedRecord.id,
      email: normalizedRecord.email || `${normalizedRecord.id}@purseable.local`,
      username: normalizedRecord.username || normalizedRecord.id,
      display_name: normalizedRecord.display_name || normalizedRecord.username || 'purseable Author',
      bio: normalizedRecord.bio,
      avatar_url: normalizedRecord.avatar_url,
      location: normalizedRecord.location,
      role: normalizedRecord.role || 'USER',
      is_verified: normalizedRecord.is_verified ?? false,
      is_suspended: normalizedRecord.is_suspended ?? false,
      is_business: normalizedRecord.is_business ?? false,
      created_at: normalizedRecord.created_at || new Date().toISOString(),
      follower_count: 0,
      following_count: 0,
      total_likes: 0,
      post_count: 0,
    };
  }
  return {
    id: 'unknown',
    email: '',
    username: 'unknown',
    display_name: 'Unknown Author',
    created_at: new Date().toISOString(),
    follower_count: 0,
    following_count: 0,
  };
}

function mapTags(rows?: { tags?: DbTag | DbTag[] | null }[] | null): Tag[] {
  if (!rows) return [];
  return rows
    .flatMap(row => normalizeTag(row.tags))
    .filter((tag): tag is DbTag => Boolean(tag))
    .map(tag => ({
      id: tag.id,
      name: tag.name,
      post_count: tag.post_count ?? 0,
    }));
}

function extractContent(content: DbPost['content']): string | undefined {
  if (!content) return undefined;
  if (typeof content === 'string') return content;
  if (typeof content === 'object') {
    if ('html' in content && typeof content.html === 'string') return content.html;
    if ('content' in content && typeof content.content === 'string') return content.content;
  }
  return JSON.stringify(content);
}

function mapDbPost(row: DbPost): Post {
  const author = ensureUser(row.users);
  const authorId = row.author_id || row.source_id || author.id;
  return {
    id: row.id,
    author_id: authorId,
    author,
    title: row.title,
    subtitle: row.subtitle || undefined,
    content: extractContent(row.content),
    cover_image_url: row.cover_image_url,
    cover_aspect_ratio: row.cover_aspect_ratio,
    status: row.status,
    read_time_minutes: row.read_time_minutes,
    engagement_score: row.engagement_score,
    like_count: row.like_count,
    comment_count: row.comment_count,
    share_count: row.share_count,
    is_trending: row.is_trending,
    tags: mapTags(row.post_tags),
    created_at: row.created_at,
    published_at: row.published_at,
    source_url: row.source_url,
    video_url: row.video_url ?? null,
    country_code: row.country_code ?? null,
  };
}

export async function fetchPublishedPosts(page = 1, perPage = 30) {
  const start = (page - 1) * perPage;
  const end = start + perPage - 1;
  const { data, error, count } = await supabaseAdmin
    .from('posts')
    .select(POST_SELECT, { count: 'exact' })
    .eq('status', 'PUBLISHED')
    .order('published_at', { ascending: false, nullsFirst: false })
    .range(start, end);

  if (error) throw error;
  const posts = (data || []).map(mapDbPost);
  const hasMore = typeof count === 'number' ? end + 1 < count : posts.length === perPage;
  return { posts, hasMore };
}

export async function fetchPostById(id: string) {
  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(POST_SELECT)
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data ? mapDbPost(data) : null;
}

export async function fetchMoreByAuthor(authorId: string, excludeId?: string, limit = 4) {
  const query = supabaseAdmin
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'PUBLISHED')
    .eq('author_id', authorId)
    .order('published_at', { ascending: false })
    .limit(limit + (excludeId ? 1 : 0));

  const { data, error } = await query;
  if (error) throw error;
  const mapped = (data || []).map(mapDbPost);
  const filtered = excludeId ? mapped.filter(post => post.id !== excludeId) : mapped;
  return filtered.slice(0, limit);
}

export async function fetchUserPosts(
  authorId: string,
  options?: { countryCode?: string; isOwnProfile?: boolean }
): Promise<Post[]> {
  let query = supabaseAdmin
    .from('posts')
    .select(POST_SELECT)
    .eq('author_id', authorId)
    .eq('status', 'PUBLISHED');

  if (!options?.isOwnProfile) {
    if (options?.countryCode) {
      query = query.or(`country_code.is.null,country_code.eq.${options.countryCode}`);
    } else {
      query = query.is('country_code', null);
    }
  }

  const { data, error } = await query.order('published_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbPost);
}

export async function fetchMoreBySource(sourceId: string, excludeId?: string, limit = 4) {
  const query = supabaseAdmin
    .from('posts')
    .select(POST_SELECT)
    .eq('status', 'PUBLISHED')
    .eq('source_id', sourceId)
    .order('published_at', { ascending: false })
    .limit(limit + (excludeId ? 1 : 0));

  const { data, error } = await query;
  if (error) throw error;
  const mapped = (data || []).map(mapDbPost);
  const filtered = excludeId ? mapped.filter(post => post.id !== excludeId) : mapped;
  return filtered.slice(0, limit);
}

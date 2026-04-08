import { ProfileClient } from '../u/[username]/ProfileClient';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export default async function SelfProfilePage() {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    
    if (!session?.user) {
        return <div>Please log in to view your profile</div>;
    }
    
    const { data: user } = await supabase
        .from('users')
        .select('id, username, display_name, bio, avatar_url, location, follower_count, following_count, is_verified, is_business, created_at')
        .eq('id', session.user.id)
        .single();
    
    if (!user) {
        const email = session.user.email || 'unknown@example.com';
        const username = email.split('@')[0];

        return (
            <ProfileClient
                user={{
                    id: session.user.id,
                    username,
                    display_name: username,
                    bio: '',
                    avatar_url: `https://api.dicebear.com/7.x/thumbs/svg?seed=${encodeURIComponent(username)}`,
                    follower_count: 0,
                    following_count: 0,
                    created_at: new Date().toISOString()
                }}
                posts={[]}
                likedPosts={[]}
                isOwnProfile={true}
            />
        );
    }

    // Fetch posts and liked post IDs in parallel
    const [{ data: posts }, { data: likedPostIds }] = await Promise.all([
        supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey(id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at, follower_count, following_count)
            `)
            .eq('author_id', user.id)
            .eq('status', 'PUBLISHED')
            .order('published_at', { ascending: false }),
        supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id)
            .limit(6),
    ]);

    let likedPosts: any[] = [];
    if (likedPostIds && likedPostIds.length > 0) {
        const { data: liked } = await supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey(id, username, display_name, bio, avatar_url, location, role, is_verified, is_business, created_at, follower_count, following_count)
            `)
            .in('id', likedPostIds.map((l: { post_id: string }) => l.post_id))
            .eq('status', 'PUBLISHED');
        likedPosts = liked || [];
    }
    
    return (
        <ProfileClient 
            user={user} 
            posts={posts || []} 
            likedPosts={likedPosts} 
            isOwnProfile={true}
        />
    );
}

import { MOCK_POSTS } from '@/lib/mockData';
import { postRepository } from '@/lib/postRepository';
import type { Metadata } from 'next';
import { ProfileClient } from './ProfileClient';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
    const { username } = await params;
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('display_name, bio, avatar_url')
        .eq('username', username)
        .single();
    
    if (!user) return { title: 'User Not Found | purseable' };
    
    return {
        title: `${user.display_name} (@${username}) | purseable`,
        description: user.bio,
        openGraph: { images: [user.avatar_url ?? ''] },
    };
}

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
    const { username } = await params;
    
    // Get current user session
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;
    
    // Fetch user from Supabase
    const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, username, display_name, bio, avatar_url, location, follower_count, following_count, is_verified, is_business, created_at')
        .eq('username', username)
        .single();
    
    if (!user) {
        return <div>User not found</div>;
    }
    
    const allPosts = await postRepository.getAll();
    const posts = allPosts.filter(p => p.author_id === user.id && p.status === 'PUBLISHED' && !p.source);
    const likedPosts = MOCK_POSTS.filter(p => p.is_liked).slice(0, 6);
    
    const isOwnProfile = currentUserId === user.id;
    
    return <ProfileClient user={user} posts={posts} likedPosts={likedPosts} isOwnProfile={isOwnProfile} />;
}

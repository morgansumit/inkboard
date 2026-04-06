import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { getCountryFromRequest } from '@/lib/geo';

export async function GET(request: Request) {
    const supabase = await createClient();
    
    // Get current user to determine their city
    const { data: { user } } = await supabase.auth.getUser();
    
    let userCity: string | null = null;
    let userCountry: string | null = null;
    
    if (user) {
        // Get user's location from their profile
        const { data: profile } = await supabase
            .from('users')
            .select('location, city, country')
            .eq('id', user.id)
            .single();
        
        userCity = profile?.city || profile?.location?.split(',')[0] || null;
        userCountry = profile?.country || profile?.location?.split(',')[1]?.trim() || null;
    }
    
    // If no user or no location, try to get from IP geolocation via headers
    if (!userCity) {
        const forwardedFor = request.headers.get('x-forwarded-for');
        const ip = forwardedFor?.split(',')[0]?.trim() || '127.0.0.1';
        
        try {
            const geoRes = await fetch(`https://ipinfo.io/${ip}/json`);
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                userCity = geoData.city || null;
                userCountry = geoData.country || null;
            }
        } catch (err) {
            console.error('Failed to get geolocation:', err);
        }
    }
    
    // Build query to fetch posts from nearby users
    let query = supabase
        .from('posts')
        .select(`
            id,
            title,
            subtitle,
            cover_image_url,
            content,
            status,
            created_at,
            country_code,
            author:users!posts_author_id_fkey(id, username, display_name, avatar_url, city, country, location)
        `)
        .eq('status', 'PUBLISHED')
        .order('created_at', { ascending: false });
    
    // Geoblocking: detect viewer country
    const viewerCountry = await getCountryFromRequest();
    console.log('[nearby] Viewer country:', viewerCountry || 'null (showing global posts only)');
    
    if (viewerCountry) {
        query = query.or(`country_code.is.null,country_code.eq.${viewerCountry}`);
    } else {
        query = query.is('country_code', null);
    }
    
    // If we have a city, filter by users in that city
    if (userCity) {
        query = query.or(`city.ilike.${userCity},location.ilike.%${userCity}%`, { foreignTable: 'users' });
    }
    
    const { data: posts, error } = await query.limit(50);
    
    if (error) {
        console.error('Failed to fetch nearby posts:', error);
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
    }
    
    // Transform posts to match feed format
    const transformedPosts = posts?.map((post: any) => ({
        id: post.id,
        title: post.title,
        subtitle: post.subtitle,
        cover_image_url: post.cover_image_url,
        content: post.content,
        status: post.status,
        created_at: post.created_at,
        author_id: post.author?.id,
        author_username: post.author?.username,
        author_display_name: post.author?.display_name,
        author_avatar_url: post.author?.avatar_url,
        author_city: post.author?.city || post.author?.location?.split(',')[0],
        author_country: post.author?.country || post.author?.location?.split(',')[1]?.trim(),
        is_nearby: true
    })) || [];
    
    return NextResponse.json({ 
        posts: transformedPosts,
        user_city: userCity,
        user_country: userCountry,
        count: transformedPosts.length
    });
}

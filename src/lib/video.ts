/**
 * Video URL parser utility
 * Supports YouTube (regular, shorts, embed), Vimeo, and generic video URLs
 */

export interface VideoInfo {
    type: 'youtube' | 'vimeo' | 'direct' | null;
    embedUrl: string | null;
    thumbnailUrl: string | null;
    videoId: string | null;
}

export function parseVideoUrl(url: string): VideoInfo {
    if (!url || typeof url !== 'string') {
        return { type: null, embedUrl: null, thumbnailUrl: null, videoId: null };
    }

    const trimmed = url.trim();
    
    // YouTube patterns
    const youtubePatterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of youtubePatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const videoId = match[1];
            return {
                type: 'youtube',
                embedUrl: `https://www.youtube.com/embed/${videoId}`,
                thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
                videoId,
            };
        }
    }
    
    // Vimeo patterns
    const vimeoPatterns = [
        /vimeo\.com\/(\d+)/,
        /vimeo\.com\/video\/(\d+)/,
        /player\.vimeo\.com\/video\/(\d+)/,
    ];
    
    for (const pattern of vimeoPatterns) {
        const match = trimmed.match(pattern);
        if (match) {
            const videoId = match[1];
            return {
                type: 'vimeo',
                embedUrl: `https://player.vimeo.com/video/${videoId}`,
                thumbnailUrl: null, // Vimeo requires API for thumbnails
                videoId,
            };
        }
    }
    
    // Direct video URLs (mp4, webm, etc.)
    const directVideoPattern = /\.(mp4|webm|ogg|mov)(\?.*)?$/i;
    if (directVideoPattern.test(trimmed)) {
        return {
            type: 'direct',
            embedUrl: trimmed,
            thumbnailUrl: null,
            videoId: null,
        };
    }
    
    return { type: null, embedUrl: null, thumbnailUrl: null, videoId: null };
}

export function isValidVideoUrl(url: string): boolean {
    const info = parseVideoUrl(url);
    return info.type !== null;
}

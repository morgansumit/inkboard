import { PostCardSkeleton } from '@/components/PostCardSkeleton';

export default function ExploreLoading() {
    return (
        <div style={{ padding: '24px 0' }}>
            <div style={{ padding: '0 24px 24px' }}>
                <div className="skeleton" style={{ height: '36px', borderRadius: '24px', maxWidth: '480px' }} />
            </div>
            <div className="masonry-grid" style={{ paddingTop: 0 }}>
                {Array.from({ length: 10 }).map((_, i) => (
                    <PostCardSkeleton key={i} index={i} />
                ))}
            </div>
        </div>
    );
}

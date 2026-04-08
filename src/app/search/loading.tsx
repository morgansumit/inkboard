import { PostCardSkeleton } from '@/components/PostCardSkeleton';

export default function SearchLoading() {
    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
            <div className="skeleton" style={{ height: '44px', borderRadius: '24px', marginBottom: '24px' }} />
            <div className="masonry-grid" style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                    <PostCardSkeleton key={i} index={i} />
                ))}
            </div>
        </div>
    );
}

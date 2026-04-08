import { PostCardSkeleton } from '@/components/PostCardSkeleton';

export default function HomeLoading() {
    return (
        <div className="masonry-grid" style={{ paddingTop: 0 }}>
            {Array.from({ length: 12 }).map((_, i) => (
                <PostCardSkeleton key={i} index={i} />
            ))}
        </div>
    );
}

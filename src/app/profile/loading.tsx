import { PostCardSkeleton } from '@/components/PostCardSkeleton';

export default function ProfileLoading() {
    return (
        <div>
            {/* Cover */}
            <div className="skeleton" style={{ height: '180px', borderRadius: 0 }} />
            {/* Header */}
            <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', marginTop: '-40px', marginBottom: '24px' }}>
                    <div className="skeleton" style={{ width: '80px', height: '80px', borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1, paddingBottom: '4px' }}>
                        <div className="skeleton" style={{ height: '22px', width: '200px', marginBottom: '8px' }} />
                        <div className="skeleton" style={{ height: '14px', width: '140px' }} />
                    </div>
                </div>
                <div className="masonry-grid" style={{ paddingTop: 0, paddingLeft: 0, paddingRight: 0 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <PostCardSkeleton key={i} index={i} />
                    ))}
                </div>
            </div>
        </div>
    );
}

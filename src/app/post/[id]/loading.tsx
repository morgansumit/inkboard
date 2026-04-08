export default function PostLoading() {
    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            {/* Cover image */}
            <div className="skeleton" style={{ height: '420px', borderRadius: '12px', marginBottom: '32px' }} />
            {/* Title */}
            <div className="skeleton" style={{ height: '40px', width: '80%', marginBottom: '16px' }} />
            <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '24px' }} />
            {/* Author row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                <div className="skeleton" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
                <div>
                    <div className="skeleton" style={{ height: '14px', width: '140px', marginBottom: '6px' }} />
                    <div className="skeleton" style={{ height: '12px', width: '100px' }} />
                </div>
            </div>
            {/* Body */}
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: '16px', width: i % 3 === 2 ? '70%' : '100%', marginBottom: '12px' }} />
            ))}
        </div>
    );
}

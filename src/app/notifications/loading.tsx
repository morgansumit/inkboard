export default function NotificationsLoading() {
    return (
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
            <div className="skeleton" style={{ height: '28px', width: '180px', marginBottom: '24px' }} />
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton" style={{ height: '14px', width: '70%', marginBottom: '8px' }} />
                        <div className="skeleton" style={{ height: '12px', width: '40%' }} />
                    </div>
                </div>
            ))}
        </div>
    );
}

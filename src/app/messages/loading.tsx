export default function MessagesLoading() {
    return (
        <div style={{ display: 'flex', height: 'calc(100vh - 65px)', maxWidth: 900, margin: '0 auto' }}>
            {/* Conversation list */}
            <div style={{ width: '280px', borderRight: '1px solid var(--color-border)', padding: '16px', flexShrink: 0 }}>
                <div className="skeleton" style={{ height: '36px', borderRadius: '8px', marginBottom: '16px' }} />
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div className="skeleton" style={{ width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div className="skeleton" style={{ height: '13px', width: '80%', marginBottom: '6px' }} />
                            <div className="skeleton" style={{ height: '11px', width: '55%' }} />
                        </div>
                    </div>
                ))}
            </div>
            {/* Chat area */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="skeleton" style={{ width: '120px', height: '14px' }} />
            </div>
        </div>
    );
}

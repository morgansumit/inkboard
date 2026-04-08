export default function SettingsLoading() {
    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '40px 24px' }}>
            <div className="skeleton" style={{ height: '28px', width: '120px', marginBottom: '32px' }} />
            {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ marginBottom: '28px' }}>
                    <div className="skeleton" style={{ height: '14px', width: '120px', marginBottom: '10px' }} />
                    <div className="skeleton" style={{ height: '42px', borderRadius: '8px' }} />
                </div>
            ))}
            <div className="skeleton" style={{ height: '42px', borderRadius: '8px', width: '140px', marginTop: '8px' }} />
        </div>
    );
}

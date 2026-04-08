export default function ComposeLoading() {
    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px', display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
            <div>
                <div className="skeleton" style={{ height: '52px', borderRadius: '8px', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '36px', borderRadius: '8px', marginBottom: '24px' }} />
                <div className="skeleton" style={{ height: '400px', borderRadius: '10px' }} />
            </div>
            <div>
                <div className="skeleton" style={{ height: '200px', borderRadius: '10px', marginBottom: '16px' }} />
                <div className="skeleton" style={{ height: '120px', borderRadius: '10px' }} />
            </div>
        </div>
    );
}

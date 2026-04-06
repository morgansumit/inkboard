import Link from 'next/link';

export function Footer() {
    return (
        <footer style={{
            padding: '40px 20px',
            borderTop: '1px solid var(--color-border)',
            marginTop: 'auto',
            background: 'var(--color-surface)'
        }}>
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px'
            }}>
                <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '24px',
                    justifyContent: 'center'
                }}>
                    <Link 
                        href="/policy/privacy-policy" 
                        style={{
                            color: 'var(--color-muted)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'color 0.2s'
                        }}
                    >
                        Privacy Policy
                    </Link>
                    <Link 
                        href="/policy/terms-of-use" 
                        style={{
                            color: 'var(--color-muted)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'color 0.2s'
                        }}
                    >
                        Terms of Use
                    </Link>
                    <Link 
                        href="/policy/cookie-policy" 
                        style={{
                            color: 'var(--color-muted)',
                            textDecoration: 'none',
                            fontSize: '13px',
                            transition: 'color 0.2s'
                        }}
                    >
                        Cookie Policy
                    </Link>
                </div>
                <p style={{
                    color: 'var(--color-muted)',
                    fontSize: '12px',
                    margin: 0
                }}>
                    © {new Date().getFullYear()} Purseable. All rights reserved.
                </p>
            </div>
        </footer>
    );
}

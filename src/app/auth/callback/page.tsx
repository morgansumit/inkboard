'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AuthCallback() {
    const supabase = createClient();
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        let redirected = false;

        const doRedirect = () => {
            if (redirected) return;
            redirected = true;
            // Send to home — the app handles onboarding routing from there
            window.location.href = '/';
        };

        // The browser client has detectSessionInUrl: true + flowType: 'pkce',
        // so it auto-exchanges the ?code= param on initialization.
        // We just need to react to the resulting SIGNED_IN event.

        // Check if auto-exchange already finished before this listener was set up
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) doRedirect();
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('[AuthCallback] auth event:', event);
                if (event === 'SIGNED_IN' && session?.user) {
                    doRedirect();
                } else if (event === 'SIGNED_OUT' && !redirected) {
                    setErrorMsg('Authentication failed. Please try signing in again.');
                }
            }
        );

        const timeout = setTimeout(() => {
            if (!redirected) {
                setErrorMsg('Sign-in timed out. Please try again.');
            }
        }, 10000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeout);
        };
    }, []);

    if (errorMsg) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--color-bg)'
            }}>
                <div style={{ textAlign: 'center', maxWidth: '400px', padding: '20px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
                    <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                        Sign in failed
                    </h1>
                    <p style={{ color: 'var(--color-muted)', marginBottom: '24px' }}>
                        {errorMsg}
                    </p>
                    <button
                        onClick={() => window.location.href = '/login'}
                        style={{
                            padding: '12px 24px',
                            background: 'var(--color-accent)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600
                        }}
                    >
                        Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg)'
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700 }}>
                    Completing sign in...
                </h1>
                <p style={{ color: 'var(--color-muted)', marginTop: '12px' }}>
                    Please wait while we verify your account
                </p>
            </div>
        </div>
    );
}

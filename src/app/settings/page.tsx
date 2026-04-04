'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Bell, Shield } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);
    };
    getUser();
  }, [supabase]);

  const handleSignOut = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/login');
    } catch (err) {
      console.error('Sign out failed', err);
      setLoggingOut(false);
    }
  };

  return (
    <div className="settings-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Settings</h1>
      
      <div className="settings-section" style={{ 
        background: 'var(--color-surface)', 
        borderRadius: '12px', 
        padding: '20px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <User size={20} />
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Account</h2>
        </div>
        <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '16px' }}>
          Signed in as: <strong>{userEmail || 'Loading...'}</strong>
        </p>
      </div>

      <div className="settings-section" style={{ 
        background: 'var(--color-surface)', 
        borderRadius: '12px', 
        padding: '20px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Shield size={20} />
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Security</h2>
        </div>
        
        <button
          onClick={handleSignOut}
          disabled={loggingOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            background: 'var(--color-danger, #dc2626)',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: loggingOut ? 'not-allowed' : 'pointer',
            opacity: loggingOut ? 0.7 : 1,
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <LogOut size={16} />
          {loggingOut ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
}

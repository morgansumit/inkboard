'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LogOut, User, Shield, Pencil, Check, X } from 'lucide-react';

type UserProfile = {
  id: string;
  username: string;
  display_name: string;
  bio: string;
  avatar_url: string;
  location: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Editable fields
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email || null);

      if (user) {
        try {
          const res = await fetch('/api/users/profile');
          const data = await res.json();
          if (data.profile) {
            setProfile(data.profile);
          }
        } catch (err) {
          console.error('Failed to load profile', err);
        }
      }
      setLoadingProfile(false);
    };
    init();
  }, [supabase]);

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || '');
    setSaveMessage(null);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const saveField = async (field: string) => {
    if (saving) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: editValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSaveMessage({ type: 'error', text: data.error || 'Failed to save' });
        return;
      }

      setProfile(prev => prev ? { ...prev, ...data.profile } : prev);
      setEditingField(null);
      setSaveMessage({ type: 'success', text: 'Saved!' });
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

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

  const fieldRow = (label: string, field: keyof UserProfile, placeholder: string, maxLen?: number) => {
    const isEditing = editingField === field;
    const value = profile?.[field] || '';

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--color-border, #eee)' }}>
        <div style={{ width: '120px', fontSize: '13px', fontWeight: 600, color: 'var(--color-muted)', flexShrink: 0 }}>{label}</div>
        {isEditing ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {field === 'bio' ? (
              <textarea
                className="input"
                value={editValue}
                onChange={e => setEditValue(maxLen ? e.target.value.slice(0, maxLen) : e.target.value)}
                rows={2}
                style={{ flex: 1, resize: 'none', fontSize: '14px' }}
                autoFocus
              />
            ) : (
              <input
                className="input"
                value={editValue}
                onChange={e => {
                  let v = maxLen ? e.target.value.slice(0, maxLen) : e.target.value;
                  if (field === 'username') v = v.toLowerCase().replace(/[^a-z0-9_]/g, '');
                  setEditValue(v);
                }}
                style={{ flex: 1, fontSize: '14px' }}
                placeholder={placeholder}
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') saveField(field); if (e.key === 'Escape') cancelEdit(); }}
              />
            )}
            <button onClick={() => saveField(field)} disabled={saving}
              style={{ background: 'var(--color-accent, #e94560)', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <Check size={14} />
            </button>
            <button onClick={cancelEdit}
              style={{ background: 'transparent', border: '1px solid var(--color-border, #ddd)', borderRadius: '6px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px', color: value ? 'var(--color-primary)' : 'var(--color-muted)' }}>
              {value || placeholder}
            </span>
            <button onClick={() => startEdit(field, String(value))}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', color: 'var(--color-muted)' }}>
              <Pencil size={14} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="settings-page" style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Settings</h1>

      {/* Profile Section */}
      <div className="settings-section" style={{ 
        background: 'var(--color-surface)', 
        borderRadius: '12px', 
        padding: '20px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <User size={20} />
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Profile</h2>
        </div>

        {saveMessage && (
          <div style={{
            padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', fontSize: '13px',
            background: saveMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            color: saveMessage.type === 'success' ? '#16a34a' : '#dc2626',
          }}>
            {saveMessage.text}
          </div>
        )}

        {loadingProfile ? (
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>Loading profile...</p>
        ) : profile ? (
          <div>
            {/* Avatar preview */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', padding: '12px 0', borderBottom: '1px solid var(--color-border, #eee)' }}>
              <img
                src={profile.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.display_name || 'User')}`}
                alt={profile.display_name}
                style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: 600 }}>{profile.display_name || profile.username}</div>
                <div style={{ fontSize: '13px', color: 'var(--color-muted)' }}>@{profile.username}</div>
              </div>
            </div>

            {fieldRow('Display Name', 'display_name', 'Your display name', 50)}
            {fieldRow('Username', 'username', 'your_username', 30)}
            {fieldRow('Bio', 'bio', 'Tell others about yourself...', 200)}
            {fieldRow('Location', 'location', 'City, Country', 100)}
          </div>
        ) : (
          <p style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
            Signed in as: <strong>{userEmail || 'Loading...'}</strong>
          </p>
        )}
      </div>

      {/* Security Section */}
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

        <p style={{ color: 'var(--color-muted)', fontSize: '14px', marginBottom: '16px' }}>
          Signed in as: <strong>{userEmail || 'Loading...'}</strong>
        </p>
        
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

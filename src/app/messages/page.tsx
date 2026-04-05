'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MailPlus, Search, Send, ArrowLeft, MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OtherUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
};

type Conversation = {
  id: string;
  last_message_at: string;
  last_message_preview: string;
  other_user: OtherUser | null;
  last_read_at: string;
};

type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

function Avatar({ user, size = 42 }: { user: OtherUser | null; size?: number }) {
  const name = user?.display_name || user?.username || '?';
  const src = user?.avatar_url;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#eee', display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0 }}>
      {src ? (
        <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span style={{ fontWeight: 700, color: '#777', fontSize: size * 0.4 }}>{name.charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

export default function MessagesPage() {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // New message modal
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<OtherUser[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeConv = conversations.find(c => c.id === activeConvId);

  // Init: get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, [supabase]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/conversations');
      const data = await res.json();
      if (data.conversations) setConversations(data.conversations);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/messages/${convId}`);
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, []);

  useEffect(() => {
    if (!activeConvId) return;
    setLoadingMsgs(true);
    loadMessages(activeConvId).finally(() => setLoadingMsgs(false));

    // Poll for new messages every 3s
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      loadMessages(activeConvId);
      loadConversations();
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeConvId, loadMessages, loadConversations]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = async () => {
    if (!activeConvId || !draft.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/messages/${activeConvId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft.trim() }),
      });
      if (res.ok) {
        setDraft('');
        await loadMessages(activeConvId);
        await loadConversations();
      }
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setSending(false);
    }
  };

  // Search users for new message
  useEffect(() => {
    if (!showNewMessage || searchQuery.length < 1) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/messages/users/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.users || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, showNewMessage]);

  // Start conversation with a user
  const startConversation = async (recipientId: string) => {
    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_id: recipientId }),
      });
      const data = await res.json();
      if (data.conversation_id) {
        setShowNewMessage(false);
        setSearchQuery('');
        await loadConversations();
        setActiveConvId(data.conversation_id);
      }
    } catch (err) {
      console.error('Failed to start conversation', err);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8', display: 'grid', gridTemplateColumns: '360px 1fr' }}>
      {/* Left Sidebar - Conversations List */}
      <div style={{ borderRight: '1px solid #e5e5e5', background: '#fff', height: '100vh', position: 'sticky', top: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '18px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800 }}>Messages</h2>
        </div>

        <div style={{ padding: '0 16px 12px' }}>
          <button
            onClick={() => setShowNewMessage(true)}
            className="btn btn-secondary"
            style={{ width: '100%', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'flex-start' }}
          >
            <div style={{ width: 40, height: 40, borderRadius: '10px', background: '#fbe9ef', display: 'grid', placeItems: 'center' }}>
              <MailPlus size={18} color="#c00" />
            </div>
            <span style={{ fontWeight: 700 }}>New message</span>
          </button>
        </div>

        <div style={{ padding: '0 16px 8px', color: '#888', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
          Conversations
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0 8px 16px' }}>
          {loadingConvs ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>Loading...</div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
              No conversations yet. Click "New message" to start one.
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.id === activeConvId;
              const hasUnread = conv.last_message_at && conv.last_read_at && new Date(conv.last_message_at) > new Date(conv.last_read_at);
              return (
                <div key={conv.id} style={{ padding: '4px 0' }}>
                  <button
                    onClick={() => setActiveConvId(conv.id)}
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      padding: '10px',
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '12px',
                      alignItems: 'center',
                      background: isActive ? '#fef2f2' : hasUnread ? '#fefce8' : 'transparent',
                      border: isActive ? '1px solid #f5d5d5' : '1px solid transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <Avatar user={conv.other_user} />
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.other_user?.display_name || conv.other_user?.username || 'Unknown'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#777', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {conv.last_message_preview || 'No messages yet'}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#999' }}>
                      {conv.last_message_at ? timeAgo(conv.last_message_at) : ''}
                    </div>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane - Chat */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff' }}>
        {showNewMessage ? (
          /* New Message Search Panel */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button onClick={() => { setShowNewMessage(false); setSearchQuery(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <ArrowLeft size={20} />
              </button>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>New Message</h3>
            </div>
            <div style={{ padding: '12px 20px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  placeholder="Search by username or display name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', borderRadius: '28px', padding: '12px 16px 12px 40px', border: '1px solid #e0e0e0' }}
                  autoFocus
                />
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
              {searching && <div style={{ padding: '12px 20px', color: '#999', fontSize: '13px' }}>Searching...</div>}
              {searchResults.map(u => (
                <button
                  key={u.id}
                  onClick={() => startConversation(u.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                    borderRadius: '10px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <Avatar user={u} size={40} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.display_name || u.username}</div>
                    <div style={{ fontSize: '12px', color: '#777' }}>@{u.username}</div>
                  </div>
                </button>
              ))}
              {searchQuery.length > 0 && !searching && searchResults.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>No users found</div>
              )}
            </div>
          </div>
        ) : activeConvId && activeConv ? (
          /* Active Chat View */
          <>
            {/* Chat Header */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Avatar user={activeConv.other_user} size={36} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>
                  {activeConv.other_user?.display_name || activeConv.other_user?.username || 'Unknown'}
                </div>
                {activeConv.other_user?.username && (
                  <div style={{ fontSize: '12px', color: '#777' }}>@{activeConv.other_user.username}</div>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px', fontSize: '13px' }}>Loading messages...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#999', padding: '40px', fontSize: '13px' }}>
                  No messages yet. Say hello!
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === currentUserId;
                  return (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                      <div style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isMine ? 'var(--color-accent, #e94560)' : '#f0f0f0',
                        color: isMine ? '#fff' : '#111',
                        fontSize: '14px',
                        lineHeight: 1.5,
                        wordBreak: 'break-word',
                      }}>
                        {msg.body}
                        <div style={{ fontSize: '10px', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input
                className="input"
                placeholder="Type a message..."
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                style={{ flex: 1, borderRadius: '24px', padding: '12px 16px', border: '1px solid #e0e0e0' }}
              />
              <button
                onClick={handleSend}
                disabled={!draft.trim() || sending}
                style={{
                  width: 42, height: 42, borderRadius: '50%',
                  background: draft.trim() ? 'var(--color-accent, #e94560)' : '#eee',
                  color: draft.trim() ? '#fff' : '#999',
                  border: 'none', cursor: draft.trim() ? 'pointer' : 'not-allowed',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </>
        ) : (
          /* Empty State */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', color: '#999' }}>
            <MessageCircle size={48} strokeWidth={1.5} />
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#333' }}>Your messages</div>
            <p style={{ fontSize: '14px', maxWidth: '320px', textAlign: 'center', lineHeight: 1.5 }}>
              Send private messages to other writers and readers on the platform.
            </p>
            <button
              onClick={() => setShowNewMessage(true)}
              className="btn btn-primary"
              style={{ borderRadius: '24px', padding: '12px 24px', fontWeight: 600 }}
            >
              Start a conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

-- Direct Messages Schema Migration

-- 1. Conversations table (supports 1-on-1 DMs)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT DEFAULT ''
);

-- 2. Conversation participants (who is in each conversation)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON public.conversation_participants(conversation_id);

-- 3. Direct messages table
CREATE TABLE IF NOT EXISTS public.direct_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 2000),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dm_conversation ON public.direct_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages(sender_id);

-- 4. Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - users can only see conversations they participate in
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT USING (
        id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can view their participations" ON public.conversation_participants
    FOR SELECT USING (user_id = auth.uid() OR conversation_id IN (
        SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can view messages in their conversations" ON public.direct_messages
    FOR SELECT USING (
        conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can send messages in their conversations" ON public.direct_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        conversation_id IN (SELECT conversation_id FROM public.conversation_participants WHERE user_id = auth.uid())
    );

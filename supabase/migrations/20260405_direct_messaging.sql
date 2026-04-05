-- Direct Messaging Schema
-- Creates tables for conversations and messages between users

-- Conversations table (one conversation between two users)
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    
    -- For group chats (optional, for now just 1:1)
    is_group BOOLEAN DEFAULT FALSE,
    group_name TEXT,
    
    UNIQUE(id)
);

-- Conversation participants (junction table)
CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    -- For 1:1 conversations, track if user has muted notifications
    is_muted BOOLEAN DEFAULT FALSE,
    
    -- Last read message timestamp
    last_read_at TIMESTAMPTZ,
    
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Message content
    content TEXT NOT NULL,
    
    -- Message metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Status
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- For replies/threads
    reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    
    -- For media attachments (optional)
    attachments JSONB DEFAULT '[]'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id 
    ON public.conversation_participants(user_id);
    
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id 
    ON public.conversation_participants(conversation_id);
    
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id 
    ON public.messages(conversation_id);
    
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
    ON public.messages(conversation_id, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
    ON public.messages(sender_id);
    
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at 
    ON public.conversations(last_message_at DESC);

-- RLS Policies

-- Enable RLS on all tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Conversations: Users can only see conversations they're part of
CREATE POLICY "Users can view their conversations" ON public.conversations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = conversations.id 
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );

-- Conversation participants: Users can see other participants in their conversations
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants cp
            WHERE cp.conversation_id = conversation_participants.conversation_id
            AND cp.user_id = auth.uid()
            AND cp.left_at IS NULL
        )
    );

-- Messages: Users can only see messages in conversations they're part of
CREATE POLICY "Users can view messages in their conversations" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );

-- Messages: Users can only insert messages in conversations they're part of
CREATE POLICY "Users can send messages to their conversations" ON public.messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.conversation_participants 
            WHERE conversation_id = messages.conversation_id 
            AND user_id = auth.uid()
            AND left_at IS NULL
        )
    );

-- Messages: Users can only update their own messages
CREATE POLICY "Users can edit their own messages" ON public.messages
    FOR UPDATE USING (sender_id = auth.uid());

-- Function to create a conversation between two users
CREATE OR REPLACE FUNCTION public.create_or_get_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- Check if conversation already exists between these two users
    SELECT c.id INTO existing_conversation_id
    FROM public.conversations c
    JOIN public.conversation_participants cp1 ON c.id = cp1.conversation_id
    JOIN public.conversation_participants cp2 ON c.id = cp2.conversation_id
    WHERE c.is_group = FALSE
    AND cp1.user_id = user1_id
    AND cp2.user_id = user2_id
    AND cp1.left_at IS NULL
    AND cp2.left_at IS NULL;
    
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- Create new conversation
    INSERT INTO public.conversations DEFAULT VALUES
    RETURNING id INTO new_conversation_id;
    
    -- Add both participants
    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES 
        (new_conversation_id, user1_id),
        (new_conversation_id, user2_id);
    
    RETURN new_conversation_id;
END;
$$;

-- Function to send a message (handles conversation updates)
CREATE OR REPLACE FUNCTION public.send_message(
    p_conversation_id UUID,
    p_sender_id UUID,
    p_content TEXT,
    p_reply_to_message_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_message_id UUID;
BEGIN
    -- Insert the message
    INSERT INTO public.messages (
        conversation_id,
        sender_id,
        content,
        reply_to_message_id
    ) VALUES (
        p_conversation_id,
        p_sender_id,
        p_content,
        p_reply_to_message_id
    )
    RETURNING id INTO new_message_id;
    
    -- Update conversation with last message info
    UPDATE public.conversations
    SET 
        last_message_at = NOW(),
        last_message_preview = LEFT(p_content, 100),
        updated_at = NOW()
    WHERE id = p_conversation_id;
    
    RETURN new_message_id;
END;
$$;

-- Function to get unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_message_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    unread_count INTEGER;
BEGIN
    SELECT COUNT(*)::INTEGER INTO unread_count
    FROM public.messages m
    JOIN public.conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = user_uuid
    AND cp.left_at IS NULL
    AND m.sender_id != user_uuid
    AND (cp.last_read_at IS NULL OR m.created_at > cp.last_read_at);
    
    RETURN unread_count;
END;
$$;

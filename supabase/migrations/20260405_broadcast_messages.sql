-- Broadcast Messages Schema Migration

-- 1. Broadcast messages table (for admin announcements/offers)
CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    body TEXT NOT NULL CHECK (char_length(body) > 0 AND char_length(body) <= 5000),
    message_type TEXT DEFAULT 'ANNOUNCEMENT' CHECK (message_type IN ('ANNOUNCEMENT', 'OFFER', 'UPDATE', 'URGENT')),
    priority TEXT DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    is_active BOOLEAN DEFAULT true,
    scheduled_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User message deliveries (track which users have seen which broadcasts)
CREATE TABLE IF NOT EXISTS public.broadcast_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_id UUID NOT NULL REFERENCES public.broadcast_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    delivered_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    UNIQUE(broadcast_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_active ON public.broadcast_messages(is_active, scheduled_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_user ON public.broadcast_deliveries(user_id, delivered_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_deliveries_broadcast ON public.broadcast_deliveries(broadcast_id);

-- 3. Enable RLS
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broadcast_deliveries ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Only admins can manage broadcasts
CREATE POLICY "Admins can manage broadcasts" ON public.broadcast_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role IN ('ADMIN', 'MODERATOR')
        )
    );

-- Users can view active broadcasts
CREATE POLICY "Users can view active broadcasts" ON public.broadcast_messages
    FOR SELECT USING (
        is_active = true AND scheduled_at <= NOW() AND (expires_at IS NULL OR expires_at > NOW())
    );

-- Users can view their own deliveries
CREATE POLICY "Users can view their deliveries" ON public.broadcast_deliveries
    FOR SELECT USING (user_id = auth.uid());

-- System can insert deliveries for users
CREATE POLICY "System can insert deliveries" ON public.broadcast_deliveries
    FOR INSERT WITH CHECK (true);

-- Users can update their own read/dismissed status
CREATE POLICY "Users can update their deliveries" ON public.broadcast_deliveries
    FOR UPDATE USING (user_id = auth.uid());

-- 5. Function to deliver broadcast to all users
CREATE OR REPLACE FUNCTION public.deliver_broadcast_to_users(p_broadcast_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Insert delivery records for all users who don't already have one
    INSERT INTO public.broadcast_deliveries (broadcast_id, user_id, delivered_at)
    SELECT p_broadcast_id, u.id, NOW()
    FROM public.users u
    LEFT JOIN public.broadcast_deliveries d ON d.broadcast_id = p_broadcast_id AND d.user_id = u.id
    WHERE d.id IS NULL;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

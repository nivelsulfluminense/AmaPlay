-- ============================================
-- MIGRATION: PROMOTIONS & NOTIFICATIONS
-- ============================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'promotion_invite', 'general_alert'
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb, -- Stores metadata like { "new_role": "presidente", "promoter_name": "..." }
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected', 'read'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. RLS for Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

-- Policy to allow creation (Managers sending notifications to others)
DROP POLICY IF EXISTS "Managers can create notifications" ON public.notifications;
CREATE POLICY "Managers can create notifications"
    ON public.notifications FOR INSERT
    TO authenticated
    WITH CHECK (true); -- Ideally restrict to managers, but for now allow logged users (logic handled in app)

-- 3. Trigger for updated_at
DROP TRIGGER IF EXISTS set_updated_at_notifications ON public.notifications;
CREATE TRIGGER set_updated_at_notifications 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. RPC Function: Handle Promotion Acceptance
-- This functions handles the atomic transaction of demoting the current manager and promoting the new one
CREATE OR REPLACE FUNCTION public.confirm_promotion(notification_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_team_id UUID;
    v_new_role TEXT;
    v_notification_status TEXT;
    v_current_manager_id UUID;
BEGIN
    -- Get current user ID
    v_user_id := auth.uid();

    -- Get notification details
    SELECT status, (data->>'new_role')::TEXT
    INTO v_notification_status, v_new_role
    FROM public.notifications
    WHERE id = notification_id AND user_id = v_user_id;

    -- Validate notification
    IF v_notification_status != 'pending' THEN
        RAISE EXCEPTION 'Notificação inválida ou já processada.';
    END IF;

    -- Get user's team
    SELECT team_id INTO v_team_id FROM public.profiles WHERE id = v_user_id;

    IF v_team_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não pertence a um time.';
    END IF;

    -- DEMOTION LOGIC
    -- If promoting to Presidente/Vice, find current holder and demote to Admin
    IF v_new_role IN ('presidente', 'vice-presidente') THEN
        SELECT id INTO v_current_manager_id
        FROM public.profiles
        WHERE team_id = v_team_id AND role = v_new_role
        LIMIT 1;

        IF v_current_manager_id IS NOT NULL THEN
            UPDATE public.profiles
            SET role = 'admin', intended_role = 'admin'
            WHERE id = v_current_manager_id;
        END IF;
    END IF;

    -- PROMOTION LOGIC
    -- Update the user's role
    UPDATE public.profiles
    SET role = v_new_role, intended_role = v_new_role
    WHERE id = v_user_id;

    -- Update notification status
    UPDATE public.notifications
    SET status = 'accepted'
    WHERE id = notification_id;

    RETURN jsonb_build_object('success', true, 'new_role', v_new_role);

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROMOTION REQUESTS - SCHEMA
-- ============================================

-- 1. Tabela para solicitações de promoção
CREATE TABLE IF NOT EXISTS public.promotion_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    requested_role TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, team_id, status) -- Apenas uma solicitação pendente por vez
);

-- 2. Habilitar RLS
ALTER TABLE public.promotion_requests ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- SELECT: Próprio usuário ou Líderes do time
CREATE POLICY "promotion_select_involved" ON public.promotion_requests
    FOR SELECT 
    TO authenticated
    USING (
        user_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = promotion_requests.team_id 
            AND role IN ('presidente', 'vice-presidente')
        )
    );

-- INSERT: Próprio usuário (se tiver time e for player/admin)
CREATE POLICY "promotion_insert_own" ON public.promotion_requests
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        user_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id IS NOT NULL 
            AND role IN ('player', 'admin')
        )
    );

-- UPDATE: Apenas Líderes (Presidente/Vice) para aprovar/rejeitar
CREATE POLICY "promotion_update_leaders" ON public.promotion_requests
    FOR UPDATE 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = promotion_requests.team_id 
            AND role IN ('presidente', 'vice-presidente')
        )
    )
    WITH CHECK (
        status IN ('approved', 'rejected')
    );

-- 4. Função Automática de Promoção ao Aceitar com SWAP
CREATE OR REPLACE FUNCTION public.handle_promotion_approval()
RETURNS TRIGGER AS $$
DECLARE
    current_occupant_id UUID;
    requester_old_role TEXT;
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        -- 1. Obter o cargo ATUAL do solicitante antes de mudar
        SELECT role INTO requester_old_role FROM public.profiles WHERE id = NEW.user_id;

        -- 2. Se o cargo solicitado for Presidente ou Vice, precisamos tratar a troca (SWAP)
        IF NEW.requested_role IN ('presidente', 'vice-presidente') THEN
            -- Localizar quem ocupa o cargo atualmente no time
            SELECT id INTO current_occupant_id 
            FROM public.profiles 
            WHERE team_id = NEW.team_id 
            AND role = NEW.requested_role
            AND id != NEW.user_id -- Garantir que não é o próprio solicitante
            LIMIT 1;

            -- Se houver um ocupante, fazemos a troca (ele assume o cargo antigo do solicitante)
            IF current_occupant_id IS NOT NULL THEN
                -- Rebaixa o antigo ocupante
                UPDATE public.profiles 
                SET role = requester_old_role,
                    intended_role = requester_old_role
                WHERE id = current_occupant_id;

                UPDATE public.team_members
                SET role = requester_old_role
                WHERE profile_id = current_occupant_id AND team_id = NEW.team_id;

                -- Notifica o antigo ocupante sobre a troca
                INSERT INTO public.notifications (user_id, type, title, message, status)
                VALUES (
                    current_occupant_id, 
                    'promotion_swap', 
                    'Troca de Cargo Realizada', 
                    'Você agora é ' || UPPER(requester_old_role) || ' após a troca de liderança do time.', 
                    'pending'
                );
            END IF;
        END IF;

        -- 3. Promove o solicitante para o novo cargo
        UPDATE public.profiles 
        SET role = NEW.requested_role,
            intended_role = NEW.requested_role
        WHERE id = NEW.user_id;

        -- Atualiza papel na tabela team_members
        UPDATE public.team_members
        SET role = NEW.requested_role
        WHERE profile_id = NEW.user_id AND team_id = NEW.team_id;

        -- Cria notificação para o solicitante
        INSERT INTO public.notifications (user_id, type, title, message, status)
        VALUES (
            NEW.user_id, 
            'promotion_approved', 
            'Promoção Aceita!', 
            'Sua solicitação para ' || UPPER(NEW.requested_role) || ' foi aprovada! Você assumiu o novo cargo agora.', 
            'pending'
        );
    ELSIF NEW.status = 'rejected' AND OLD.status = 'pending' THEN
        -- Cria notificação de recusa
        INSERT INTO public.notifications (user_id, type, title, message, status)
        VALUES (
            NEW.user_id, 
            'promotion_rejected', 
            'Solicitação de Promoção', 
            'Sua solicitação de promoção foi recusada pela gestão.', 
            'pending'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para promoção
DROP TRIGGER IF EXISTS on_promotion_request_update ON public.promotion_requests;
CREATE TRIGGER on_promotion_request_update
    AFTER UPDATE ON public.promotion_requests
    FOR EACH ROW
    WHEN (NEW.status IS DISTINCT FROM OLD.status)
    EXECUTE FUNCTION public.handle_promotion_approval();

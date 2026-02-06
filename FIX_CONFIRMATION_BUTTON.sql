-- ==============================================================================
-- 🚨 SCRIPT CRÍTICO: CORREÇÃO DE CONFIRMAÇÃO DE PRESENÇA E PERMISSÕES 🚨
-- ==============================================================================

-- 1. Garantir que a tabela de participantes tenha RLS ativado
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- 2. LIMPEZA TOTAL DE POLÍTICAS ANTIGAS (Para evitar conflitos)
DROP POLICY IF EXISTS "Participants - Manage own status" ON public.event_participants;
DROP POLICY IF EXISTS "Participants - View all" ON public.event_participants;
DROP POLICY IF EXISTS "Participants - Managers can view all" ON public.event_participants;
DROP POLICY IF EXISTS "Users can view participants of their team" ON public.event_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.event_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.event_participants;

-- 3. CRIAR NOVA POLÍTICA DE LEITURA (VISUALIZAR)
-- Todo mundo do time pode ver quem vai no jogo
CREATE POLICY "View team participants"
ON public.event_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.events e
        JOIN public.profiles p ON p.team_id = e.team_id
        WHERE e.id = event_participants.event_id
        AND p.id = auth.uid()
    )
);

-- 4. CRIAR NOVA POLÍTICA DE ESCRITA (CONFIRMAR/NÃO VOU)
-- O usuário só pode alterar a PRÓPRIA linha (user_id = auth.uid())
CREATE POLICY "Manage own participation"
ON public.event_participants FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 5. FUNCTION & TRIGGER PARA CONTAGEM AUTOMÁTICA
-- Isso garante que o número de confirmados no Card esteja sempre certo
CREATE OR REPLACE FUNCTION public.update_event_confirmed_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.events
        SET confirmed_count = (
            SELECT count(*) 
            FROM public.event_participants 
            WHERE event_id = NEW.event_id AND status = 'confirmed'
        )
        WHERE id = NEW.event_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.events
        SET confirmed_count = (
            SELECT count(*) 
            FROM public.event_participants 
            WHERE event_id = OLD.event_id AND status = 'confirmed'
        )
        WHERE id = OLD.event_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; -- SECURITY DEFINER é importante aqui!

-- Recriar o Trigger
DROP TRIGGER IF EXISTS tr_refresh_confirmed_count ON public.event_participants;
CREATE TRIGGER tr_refresh_confirmed_count
AFTER INSERT OR UPDATE OR DELETE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.update_event_confirmed_count();

-- 6. RECALCULAR CONTAGEM PARA EVENTOS ATUAIS
UPDATE public.events e
SET confirmed_count = (
    SELECT count(*) 
    FROM public.event_participants p 
    WHERE p.event_id = e.id AND p.status = 'confirmed'
);

-- FIM
-- Execute este script no SQL Editor do Supabase para corrigir o botão "Confirmar".

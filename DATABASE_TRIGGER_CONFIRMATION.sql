-- ============================================================
-- FIX: AUTOMATIC CONFIRMATION COUNT (TRIGGER)
-- ============================================================

-- 1. Função para atualizar o contador automaticamente
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
$$ LANGUAGE plpgsql;

-- 2. Trigger para a tabela de participantes
DROP TRIGGER IF EXISTS tr_refresh_confirmed_count ON public.event_participants;
CREATE TRIGGER tr_refresh_confirmed_count
AFTER INSERT OR UPDATE OR DELETE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.update_event_confirmed_count();

-- 3. Garantir Políticas de RLS para Participantes
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants - Manage own status" ON public.event_participants;
CREATE POLICY "Participants - Manage own status"
ON public.event_participants FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Participants - View all" ON public.event_participants;
CREATE POLICY "Participants - View all"
ON public.event_participants FOR SELECT
USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE team_id = (
        SELECT team_id FROM public.events WHERE id = event_id
    )
));

-- 4. Garantir que Gestores do time podem ver todos os participantes
DROP POLICY IF EXISTS "Participants - Managers can view all" ON public.event_participants;
CREATE POLICY "Participants - Managers can view all"
ON public.event_participants FOR SELECT
USING (auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE (role = 'presidente' OR role = 'vice-presidente')
    AND team_id = (SELECT team_id FROM public.events WHERE id = event_id)
));

-- 5. Importante: Como o Trigger vai rodar como proprietário, 
-- não precisamos dar permissão de UPDATE na tabela events para usuários comuns.
-- Mas vamos garantir que o contador inicia correto para eventos existentes.
UPDATE public.events e
SET confirmed_count = (
    SELECT count(*) 
    FROM public.event_participants p 
    WHERE p.event_id = e.id AND p.status = 'confirmed'
);

-- Políticas finais para a tabela events (Apenas por segurança)
DROP POLICY IF EXISTS "Events - Select for team members" ON public.events;
CREATE POLICY "Events - Select for team members"
ON public.events FOR SELECT
USING (auth.uid() IN (
    SELECT id FROM public.profiles WHERE team_id = events.team_id
));

-- Mensagem de confirmação interna
-- EXECUTADO COM SUCESSO!

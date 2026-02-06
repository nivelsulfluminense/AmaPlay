-- ==============================================================================
-- 🚨 CORREÇÃO DEFINITIVA: PARTICIPANTES E PERMISSÕES 🚨
-- ==============================================================================

-- 1. Garantir permissões básicas (MUITO IMPORTANTE)
-- Se o role 'authenticated' não tiver permissão de INSERT, RLS nem é checado.
GRANT ALL ON TABLE public.event_participants TO postgres;
GRANT ALL ON TABLE public.event_participants TO anon;
GRANT ALL ON TABLE public.event_participants TO authenticated;
GRANT ALL ON TABLE public.event_participants TO service_role;

-- 2. Garantir RLS ativado
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- 3. Limpeza de políticas (Remove tudo para evitar conflitos)
DROP POLICY IF EXISTS "Participants - Manage own status" ON public.event_participants;
DROP POLICY IF EXISTS "Participants - View all" ON public.event_participants;
DROP POLICY IF EXISTS "Participants - Managers can view all" ON public.event_participants;
DROP POLICY IF EXISTS "Users can view participants of their team" ON public.event_participants;
DROP POLICY IF EXISTS "Users can insert their own participation" ON public.event_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON public.event_participants;
DROP POLICY IF EXISTS "View team participants" ON public.event_participants;
DROP POLICY IF EXISTS "Manage own participation" ON public.event_participants;
DROP POLICY IF EXISTS "Managers can manage participants" ON public.event_participants;
DROP POLICY IF EXISTS "Team members can view participants" ON public.event_participants;
DROP POLICY IF EXISTS "Users can manage own participation" ON public.event_participants;
DROP POLICY IF EXISTS "View participants" ON public.event_participants;

-- 4. Criar políticas Simplificadas e Robustas

-- 4.1 LEITURA: Permitir que qualquer usuário autenticado veja os participantes
-- (Restrições complexas de time podem falhar se os joins não tiverem permissão)
CREATE POLICY "Enable read access for authenticated users"
ON public.event_participants FOR SELECT
TO authenticated
USING (true);

-- 4.2 ESCRITA (INSERT/UPDATE/DELETE):
-- O usuário só pode mexer na linha onde user_id é ele mesmo.
CREATE POLICY "Enable insert for users based on user_id"
ON public.event_participants FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
ON public.event_participants FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id"
ON public.event_participants FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 5. Verificar e Corrigir Trigger
-- Garantir que a função do trigger tenha permissões corretas
GRANT EXECUTE ON FUNCTION public.update_event_confirmed_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_event_confirmed_count() TO postgres;
GRANT EXECUTE ON FUNCTION public.update_event_confirmed_count() TO service_role;

-- Recriar função para garantir que não haja erros de lógica antiga
CREATE OR REPLACE FUNCTION public.update_event_confirmed_count()
RETURNS TRIGGER AS $$
BEGIN
    if (TG_OP = 'DELETE') then
        UPDATE public.events
        SET confirmed_count = (
            SELECT count(*) 
            FROM public.event_participants 
            WHERE event_id = OLD.event_id 
            AND status = 'confirmed'
        )
        WHERE id = OLD.event_id;
        RETURN OLD;
    else
        UPDATE public.events
        SET confirmed_count = (
            SELECT count(*) 
            FROM public.event_participants 
            WHERE event_id = NEW.event_id 
            AND status = 'confirmed'
        )
        WHERE id = NEW.event_id;
        RETURN NEW;
    end if;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reaplicar Trigger
DROP TRIGGER IF EXISTS tr_refresh_confirmed_count ON public.event_participants;
CREATE TRIGGER tr_refresh_confirmed_count
AFTER INSERT OR UPDATE OR DELETE ON public.event_participants
FOR EACH ROW EXECUTE FUNCTION public.update_event_confirmed_count();

-- 6. Tentar inserir dados fictícios se a tabela estiver vazia (opcional, para teste)
-- Isso só vai funcionar se executado como um usuário, mas aqui no SQL Editor roda como postgres (admin)
-- que ignora RLS. Útil para verificar se constraints não estão bloqueando.
-- (Comentado para não sujar dados de produção se não quiser)
-- INSERT INTO public.event_participants (event_id, user_id, status)
-- SELECT id, creator_id, 'confirmed' FROM public.events 
-- WHERE creator_id IS NOT NULL 
-- ON CONFLICT (event_id, user_id) DO UPDATE SET status = 'confirmed';

-- 7. Recalcular contadores
UPDATE public.events e
SET confirmed_count = (
    SELECT count(*) 
    FROM public.event_participants p 
    WHERE p.event_id = e.id AND p.status = 'confirmed'
);

-- ============================================
-- CORREÇÃO DE RLS PARA AGENDA (TABELA EVENTS)
-- ============================================

-- 1. Garantir que a tabela existe com o nome correto usado no código
DO $$ 
BEGIN
    -- Se game_events existir e events não, renomeia
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'game_events') 
    AND NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
        ALTER TABLE public.game_events RENAME TO events;
    END IF;
END $$;

-- 2. Se a tabela events ainda não existir, cria ela
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'game',
    title TEXT NOT NULL,
    opponent TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location TEXT,
    confirmed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Habilitar RLS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 4. Remover políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Events - Select for team members" ON public.events;
DROP POLICY IF EXISTS "Events - Insert for managers" ON public.events;
DROP POLICY IF EXISTS "Events - Manager Full Access" ON public.events;
DROP POLICY IF EXISTS "Events - Update by creator" ON public.events;
DROP POLICY IF EXISTS "Events - Delete by creator" ON public.events;
DROP POLICY IF EXISTS "Managers can insert events" ON public.events;
DROP POLICY IF EXISTS "Everyone can select events" ON public.events;

-- 5. Criar Novas Políticas Robustas
-- SELECT: Qualquer membro do time pode ver
CREATE POLICY "Events - Select for team members"
ON public.events FOR SELECT
USING (
    auth.uid() IN (
        SELECT id FROM public.profiles 
        WHERE team_id = events.team_id
    )
);

-- INSERT: Apenas gestores (presidente/vice) podem criar
-- NOTA: O profile do criador deve estar aprovado e ser gestor
CREATE POLICY "Events - Insert for managers"
ON public.events FOR INSERT
WITH CHECK (
    auth.uid() IN (
        SELECT id FROM public.profiles 
        WHERE (role = 'presidente' OR role = 'vice-presidente')
        AND is_approved = TRUE
    )
);

-- UPDATE: Criador ou Gestores do time
CREATE POLICY "Events - Update for managers and creator"
ON public.events FOR UPDATE
USING (
    auth.uid() = creator_id OR
    auth.uid() IN (
        SELECT id FROM public.profiles 
        WHERE team_id = events.team_id 
        AND (role = 'presidente' OR role = 'vice-presidente')
    )
);

-- DELETE: Criador ou Gestores do time
CREATE POLICY "Events - Delete for managers and creator"
ON public.events FOR DELETE
USING (
    auth.uid() = creator_id OR
    auth.uid() IN (
        SELECT id FROM public.profiles 
        WHERE team_id = events.team_id 
        AND (role = 'presidente' OR role = 'vice-presidente')
    )
);

-- 6. Garantir que a tabela de participantes também está correta
CREATE TABLE IF NOT EXISTS public.event_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(event_id, user_id)
);

ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants - All access" ON public.event_participants;
CREATE POLICY "Participants - All access"
ON public.event_participants FOR ALL
USING (auth.uid() = user_id OR 
       auth.uid() IN (SELECT creator_id FROM public.events WHERE id = event_id));

-- Políticas de Agenda Corrigidas com Sucesso!

-- ============================================
-- AMAPLAY - RESET COMPLETO DO BANCO DE DADOS (VERSÃO CORRIGIDA)
-- ============================================

-- 0️⃣ EXTENSÕES (Garante que as funções de UUID funcionem)
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1️⃣ LIMPEZA TOTAL (Ordem rigorosa para evitar erros de FK)
-- ============================================
SET session_replication_role = replica;

-- Remover tabelas se existirem
DROP TABLE IF EXISTS public.event_participants CASCADE;
DROP TABLE IF EXISTS public.game_events CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.team_members CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.teams CASCADE;

-- Remover funções e triggers
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.confirm_promotion(uuid) CASCADE;

SET session_replication_role = DEFAULT;

-- 2️⃣ CRIAÇÃO DAS TABELAS
-- ============================================

-- TEAMS
CREATE TABLE public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    logo TEXT,
    primary_color TEXT DEFAULT '#13ec5b',
    secondary_color TEXT DEFAULT '#ffffff',
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    creator_id UUID, -- Será ligado ao profile depois
    member_count INTEGER DEFAULT 0,
    has_first_manager BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT DEFAULT 'Visitante',
    role TEXT DEFAULT 'player',
    intended_role TEXT DEFAULT 'player',
    avatar TEXT,
    card_avatar TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    phone TEXT,
    birth_date DATE,
    address JSONB,
    position TEXT,
    stats JSONB DEFAULT '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}',
    ovr INTEGER DEFAULT 50,
    max_scout INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    has_voted BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    is_setup_complete BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending',
    is_approved BOOLEAN DEFAULT FALSE,
    is_first_manager BOOLEAN DEFAULT FALSE,
    heart_team TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar FK de creator_id em teams agora que profiles existe
-- Usamos DEFERRABLE para evitar erros de corrida em operações rápidas
ALTER TABLE public.teams ADD CONSTRAINT fk_teams_creator FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL DEFERRABLE INITIALLY DEFERRED;

-- TEAM_MEMBERS
CREATE TABLE public.team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'player',
    is_team_approved BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, profile_id)
);

-- NOTIFICATIONS
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TRANSACTIONS
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- income, expense
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    category TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    max_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'good',
    image TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAME_EVENTS
CREATE TABLE public.game_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT DEFAULT 'game', -- game, bbq
    title TEXT NOT NULL,
    opponent TEXT,
    event_date DATE NOT NULL,
    event_time TIME NOT NULL,
    location TEXT,
    confirmed_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- EVENT_PARTICIPANTS
CREATE TABLE public.event_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES public.game_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- confirmed, declined, pending
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- ============================================
-- 3️⃣ ÍNDICES DE PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile_id ON public.team_members(profile_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);

CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(transaction_date);

CREATE INDEX IF NOT EXISTS idx_inventory_team_id ON public.inventory(team_id);

CREATE INDEX IF NOT EXISTS idx_game_events_team_id ON public.game_events(team_id);
CREATE INDEX IF NOT EXISTS idx_game_events_date ON public.game_events(event_date);

CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON public.event_participants(user_id);

-- ============================================
-- 4️⃣ FUNÇÕES E TRIGGERS
-- ============================================

-- Função: Atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER set_updated_at_profiles 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_teams 
    BEFORE UPDATE ON public.teams 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_notifications 
    BEFORE UPDATE ON public.notifications 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_transactions 
    BEFORE UPDATE ON public.transactions 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_inventory 
    BEFORE UPDATE ON public.inventory 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at_events 
    BEFORE UPDATE ON public.game_events 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Função: Criar perfil automaticamente ao registrar usuário
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        intended_role,
        status,
        is_approved,
        is_setup_complete,
        is_first_manager,
        stats
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Visitante'),
        'authenticated',
        'authenticated',
        'pending',
        FALSE,
        FALSE,
        FALSE,
        '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Criar perfil ao criar usuário
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Função auxiliar: Obter ID do time do usuário logado (Blindada contra Recursão)
CREATE OR REPLACE FUNCTION public.get_auth_user_team_id()
RETURNS UUID AS $$
BEGIN
    RETURN (SELECT team_id FROM public.profiles WHERE id = auth.uid() LIMIT 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função: Confirmar promoção (RPC segura)
CREATE OR REPLACE FUNCTION public.confirm_promotion(notification_id UUID)
RETURNS JSON AS $$
DECLARE
    notif RECORD;
    new_role TEXT;
    result JSON;
BEGIN
    -- Buscar notificação
    SELECT * INTO notif FROM public.notifications 
    WHERE id = notification_id AND user_id = auth.uid() AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Notificação não encontrada ou já processada');
    END IF;
    
    -- Extrair novo papel
    new_role := notif.data->>'new_role';
    
    -- Atualizar perfil
    UPDATE public.profiles 
    SET role = new_role, intended_role = new_role
    WHERE id = auth.uid();
    
    -- Atualizar notificação
    UPDATE public.notifications 
    SET status = 'accepted' 
    WHERE id = notification_id;
    
    -- Retornar sucesso
    RETURN json_build_object('success', true, 'new_role', new_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5️⃣ ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_participants ENABLE ROW LEVEL SECURITY;

-- PROFILES - Políticas RLS
-- ============================================

-- INSERT: Usuários autenticados podem criar seu próprio perfil
CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- SELECT: Usuários podem ler seus próprios dados
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- SELECT: Usuários podem ler perfis de colegas de time
CREATE POLICY "profiles_select_team" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (
        team_id = public.get_auth_user_team_id()
    );

-- SELECT: Perfis públicos visíveis para todos
CREATE POLICY "profiles_select_public" ON public.profiles
    FOR SELECT 
    TO anon, authenticated
    USING (is_public = TRUE);

-- UPDATE: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- TEAMS - Políticas RLS
-- ============================================

-- SELECT: Todos podem ver times (para busca)
CREATE POLICY "teams_select_all" ON public.teams
    FOR SELECT 
    TO authenticated, anon
    USING (TRUE);

-- INSERT: Usuários autenticados podem criar times
CREATE POLICY "teams_insert_authenticated" ON public.teams
    FOR INSERT 
    TO authenticated
    WITH CHECK (TRUE);

-- UPDATE: Apenas criador ou gestores podem atualizar
CREATE POLICY "teams_update_managers" ON public.teams
    FOR UPDATE 
    TO authenticated
    USING (
        creator_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = teams.id 
            AND role IN ('presidente', 'vice-presidente', 'admin')
        )
    );

-- TEAM_MEMBERS - Políticas RLS
-- ============================================

-- SELECT: Membros do time podem ver outros membros
CREATE POLICY "team_members_select_own_team" ON public.team_members
    FOR SELECT 
    TO authenticated
    USING (
        team_id = public.get_auth_user_team_id()
    );

-- INSERT/UPDATE/DELETE: Apenas gestores
CREATE POLICY "team_members_manage_managers" ON public.team_members
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = team_members.team_id 
            AND role IN ('presidente', 'vice-presidente', 'admin')
        )
    );

-- NOTIFICATIONS - Políticas RLS
-- ============================================

-- SELECT: Usuários podem ver suas próprias notificações
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT 
    TO authenticated
    USING (user_id = auth.uid());

-- INSERT: Gestores podem criar notificações
CREATE POLICY "notifications_insert_managers" ON public.notifications
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('presidente', 'vice-presidente', 'admin')
        )
    );

-- UPDATE: Usuários podem atualizar suas próprias notificações
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE 
    TO authenticated
    USING (user_id = auth.uid());

-- TRANSACTIONS - Políticas RLS
-- ============================================

-- SELECT: Membros do time podem ver transações
CREATE POLICY "transactions_select_team" ON public.transactions
    FOR SELECT 
    TO authenticated
    USING (
        team_id = public.get_auth_user_team_id()
    );

-- ALL: Apenas gestores podem gerenciar
CREATE POLICY "transactions_manage_managers" ON public.transactions
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = transactions.team_id 
            AND role IN ('presidente', 'vice-presidente', 'admin')
        )
    );

-- INVENTORY - Políticas RLS
-- ============================================

-- SELECT: Membros do time podem ver inventário
CREATE POLICY "inventory_select_team" ON public.inventory
    FOR SELECT 
    TO authenticated
    USING (
        team_id = public.get_auth_user_team_id()
    );

-- ALL: Apenas gestores podem gerenciar
CREATE POLICY "inventory_manage_managers" ON public.inventory
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = inventory.team_id 
            AND role IN ('presidente', 'vice-presidente', 'admin')
        )
    );

-- GAME_EVENTS - Políticas RLS
-- ============================================

-- SELECT: Membros do time podem ver eventos
CREATE POLICY "events_select_team" ON public.game_events
    FOR SELECT 
    TO authenticated
    USING (
        team_id = public.get_auth_user_team_id()
    );

-- ALL: Apenas gestores podem gerenciar
CREATE POLICY "events_manage_managers" ON public.game_events
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = game_events.team_id 
            AND role IN ('presidente', 'vice-presidente', 'admin')
        )
    );

-- EVENT_PARTICIPANTS - Políticas RLS
-- ============================================

-- SELECT: Membros do time podem ver participantes
CREATE POLICY "participants_select_team" ON public.event_participants
    FOR SELECT 
    TO authenticated
    USING (
        event_id IN (
            SELECT id FROM public.game_events 
            WHERE team_id = public.get_auth_user_team_id()
        )
    );

-- INSERT/UPDATE: Usuários podem gerenciar sua própria participação
CREATE POLICY "participants_manage_own" ON public.event_participants
    FOR ALL 
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================
-- 5.5️⃣ POPULAR PERFIS EXISTENTES (Opcional - para usuários já logados)
-- ============================================
INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    intended_role,
    status,
    is_approved,
    is_setup_complete,
    is_first_manager,
    stats
)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data->>'name', 'Visitante'),
    'player',
    'player',
    'pending',
    FALSE,
    FALSE,
    FALSE,
    '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 6️⃣ VERIFICAÇÃO FINAL
-- ============================================

-- Listar todas as tabelas criadas
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Contar políticas RLS
SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Verificar triggers
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- ✅ RESET COMPLETO!
-- ============================================
-- Banco de dados resetado e reconstruído com:
-- ✅ 8 tabelas com todas as colunas necessárias
-- ✅ Relacionamentos (Foreign Keys) corretos
-- ✅ Índices para performance
-- ✅ Triggers para automação
-- ✅ RLS para segurança
-- ✅ Funções auxiliares
-- ============================================

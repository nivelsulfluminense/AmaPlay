-- ============================================
-- AMAPLAY - COMPLETE DATABASE SCHEMA
-- ============================================
-- Criado em: 2026-01-24
-- Descrição: Schema completo com tabelas, RLS, triggers e índices
-- ============================================

-- 1️⃣ EXTENSÕES
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2️⃣ TABELAS
-- ============================================

-- TEAMS (Times/Organizações)
-- ============================================
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    logo TEXT,
    primary_color TEXT DEFAULT '#13ec5b',
    secondary_color TEXT DEFAULT '#ffffff',
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    creator_id UUID, -- FK adicionada depois
    member_count INTEGER DEFAULT 0,
    has_first_manager BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROFILES (Perfis de Usuários)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT DEFAULT 'Visitante',
    role TEXT DEFAULT 'player', -- presidente, vice-presidente, admin, player
    intended_role TEXT DEFAULT 'player', -- Cargo escolhido no onboarding
    avatar TEXT,
    card_avatar TEXT,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    phone TEXT,
    birth_date DATE,
    address JSONB,
    position TEXT, -- GOL, ZAG, MEI, ATA
    stats JSONB DEFAULT '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}',
    ovr INTEGER DEFAULT 50,
    max_scout INTEGER DEFAULT 0,
    vote_count INTEGER DEFAULT 0,
    has_voted BOOLEAN DEFAULT FALSE,
    is_public BOOLEAN DEFAULT TRUE,
    is_setup_complete BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    is_first_manager BOOLEAN DEFAULT FALSE,
    heart_team TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar FK de creator_id em teams agora que profiles existe
ALTER TABLE public.teams 
    DROP CONSTRAINT IF EXISTS fk_teams_creator;

ALTER TABLE public.teams 
    ADD CONSTRAINT fk_teams_creator 
    FOREIGN KEY (creator_id) 
    REFERENCES public.profiles(id) 
    ON DELETE SET NULL;

-- TRANSACTIONS (Finanças)
-- ============================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL, -- income, expense
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    category TEXT,
    transaction_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending', -- paid, pending
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INVENTORY (Estoque de Equipamentos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    max_quantity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'good', -- excellent, good, fair, poor
    image TEXT,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- GAME_EVENTS (Jogos e Eventos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.game_events (
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

-- 3️⃣ ÍNDICES DE PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles(status);
CREATE INDEX IF NOT EXISTS idx_transactions_team_id ON public.transactions(team_id);
CREATE INDEX IF NOT EXISTS idx_inventory_team_id ON public.inventory(team_id);
CREATE INDEX IF NOT EXISTS idx_game_events_team_id ON public.game_events(team_id);
CREATE INDEX IF NOT EXISTS idx_game_events_date ON public.game_events(event_date);

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
DROP TRIGGER IF EXISTS set_updated_at_profiles ON public.profiles;
CREATE TRIGGER set_updated_at_profiles 
    BEFORE UPDATE ON public.profiles 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_teams ON public.teams;
CREATE TRIGGER set_updated_at_teams 
    BEFORE UPDATE ON public.teams 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_transactions ON public.transactions;
CREATE TRIGGER set_updated_at_transactions 
    BEFORE UPDATE ON public.transactions 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_inventory ON public.inventory;
CREATE TRIGGER set_updated_at_inventory 
    BEFORE UPDATE ON public.inventory 
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_events ON public.game_events;
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
        is_setup_complete,
        stats
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Visitante'),
        'player',
        'player',
        'pending',
        FALSE,
        '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Criar perfil ao criar usuário
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5️⃣ ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_events ENABLE ROW LEVEL SECURITY;

-- PROFILES - Políticas RLS
-- ============================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for team members" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read for public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team members can read teammate profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 1. INSERT: Usuários autenticados podem criar seu próprio perfil
CREATE POLICY "Enable insert for authenticated users" ON public.profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 2. SELECT (Próprio Perfil): Usuários podem ler seus próprios dados
CREATE POLICY "Enable read access for own profile" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- 3. SELECT (Membros do Time): Usuários podem ler perfis de colegas de time
CREATE POLICY "Enable read access for team members" ON public.profiles
    FOR SELECT 
    TO authenticated
    USING (
        team_id IN (
            SELECT team_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 4. UPDATE: Usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Enable update for own profile" ON public.profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 5. SELECT (Público): Perfis públicos visíveis para todos (player stats)
CREATE POLICY "Enable read for public profiles" ON public.profiles
    FOR SELECT 
    TO anon
    USING (is_public = TRUE);

-- TEAMS - Políticas RLS
-- ============================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Teams are visible to everyone" ON public.teams;
DROP POLICY IF EXISTS "Managers can update teams" ON public.teams;
DROP POLICY IF EXISTS "Authenticated users can create teams" ON public.teams;

-- 1. SELECT: Todos podem ver times (para busca)
CREATE POLICY "Teams are visible to everyone" ON public.teams
    FOR SELECT 
    USING (TRUE);

-- 2. INSERT: Usuários autenticados podem criar times
CREATE POLICY "Authenticated users can create teams" ON public.teams
    FOR INSERT 
    TO authenticated
    WITH CHECK (TRUE);

-- 3. UPDATE: Apenas criador ou gestores podem atualizar
CREATE POLICY "Managers can update teams" ON public.teams
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

-- TRANSACTIONS - Políticas RLS
-- ============================================

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Team members can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admins can manage transactions" ON public.transactions;

-- 1. SELECT: Membros do time podem ver transações
CREATE POLICY "Team members can view transactions" ON public.transactions
    FOR SELECT 
    TO authenticated
    USING (
        team_id IN (
            SELECT team_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. ALL: Apenas gestores podem gerenciar
CREATE POLICY "Admins can manage transactions" ON public.transactions
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

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Team members can view inventory" ON public.inventory;
DROP POLICY IF EXISTS "Admins can manage inventory" ON public.inventory;

-- 1. SELECT: Membros do time podem ver inventário
CREATE POLICY "Team members can view inventory" ON public.inventory
    FOR SELECT 
    TO authenticated
    USING (
        team_id IN (
            SELECT team_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. ALL: Apenas gestores podem gerenciar
CREATE POLICY "Admins can manage inventory" ON public.inventory
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

-- Limpar políticas antigas
DROP POLICY IF EXISTS "Team members can view events" ON public.game_events;
DROP POLICY IF EXISTS "Managers can manage events" ON public.game_events;

-- 1. SELECT: Membros do time podem ver eventos
CREATE POLICY "Team members can view events" ON public.game_events
    FOR SELECT 
    TO authenticated
    USING (
        team_id IN (
            SELECT team_id FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. ALL: Apenas gestores podem gerenciar
CREATE POLICY "Managers can manage events" ON public.game_events
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

-- ============================================
-- FIM DO SCHEMA
-- ============================================

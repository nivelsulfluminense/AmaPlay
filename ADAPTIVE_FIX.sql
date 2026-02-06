-- ============================================
-- CORREÇÃO ADAPTATIVA - Verifica e Corrige
-- ============================================
-- Este script se adapta à estrutura atual do banco

-- PASSO 1: Verificar estrutura atual da tabela profiles
-- Execute esta query primeiro para ver quais colunas existem:
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ============================================
-- PASSO 2: Adicionar colunas ausentes
-- ============================================

-- Adicionar coluna status (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN status TEXT DEFAULT 'pending';
        
        RAISE NOTICE 'Coluna status adicionada';
    ELSE
        RAISE NOTICE 'Coluna status já existe';
    END IF;
END $$;

-- Adicionar coluna is_approved (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_approved'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN is_approved BOOLEAN DEFAULT FALSE;
        
        RAISE NOTICE 'Coluna is_approved adicionada';
    ELSE
        RAISE NOTICE 'Coluna is_approved já existe';
    END IF;
END $$;

-- Adicionar outras colunas importantes (se não existirem)
DO $$ 
BEGIN
    -- is_setup_complete
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_setup_complete'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN is_setup_complete BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- is_first_manager
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'is_first_manager'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN is_first_manager BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- intended_role
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'intended_role'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN intended_role TEXT DEFAULT 'player';
    END IF;
END $$;

-- ============================================
-- PASSO 3: Criar perfis para usuários sem perfil
-- ============================================

INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    intended_role,
    is_approved,
    is_setup_complete,
    is_first_manager,
    stats
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Visitante'),
    'player',
    'player',
    FALSE,
    FALSE,
    FALSE,
    '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASSO 4: Atualizar valores padrão
-- ============================================

-- Garantir que is_approved está sincronizado com status (se status existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'status'
    ) THEN
        UPDATE public.profiles 
        SET is_approved = (status = 'approved')
        WHERE is_approved IS NULL OR is_approved = FALSE;
    END IF;
END $$;

-- ============================================
-- PASSO 5: Criar índices
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================
-- PASSO 6: Recriar trigger
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        name,
        role,
        intended_role,
        is_approved,
        is_setup_complete,
        is_first_manager,
        stats
    ) VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'Visitante'),
        'player',
        'player',
        FALSE,
        FALSE,
        FALSE,
        '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASSO 7: Verificação final
-- ============================================

-- Verificar quantos usuários têm perfil agora
SELECT 
    COUNT(DISTINCT au.id) as total_users,
    COUNT(DISTINCT p.id) as users_with_profile,
    COUNT(DISTINCT au.id) - COUNT(DISTINCT p.id) as users_without_profile
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- Mostrar todos os perfis criados
SELECT 
    id,
    email,
    name,
    role,
    is_approved,
    is_setup_complete,
    created_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================
-- CORREÇÃO RÁPIDA - Execute este script completo
-- ============================================

-- 0. Adicionar colunas necessárias (se não existirem)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_setup_complete BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_first_manager BOOLEAN DEFAULT FALSE;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS intended_role TEXT DEFAULT 'player';

-- 1. Criar perfis para usuários existentes sem perfil
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
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Visitante'),
    'player',
    'player',
    'pending',
    FALSE,
    FALSE,
    FALSE,
    '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 2. Atualizar is_approved baseado no status
UPDATE public.profiles 
SET is_approved = (status = 'approved')
WHERE status IS NOT NULL;

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);
CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- 4. Recriar trigger
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
        status,
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
        'pending',
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

-- 5. Verificar resultado
SELECT 
    COUNT(*) as total_users,
    COUNT(p.id) as users_with_profile,
    COUNT(*) - COUNT(p.id) as users_without_profile
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

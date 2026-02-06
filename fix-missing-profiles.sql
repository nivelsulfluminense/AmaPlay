-- ============================================
-- DIAGNÓSTICO E CORREÇÃO - Perfis Ausentes
-- ============================================
-- Execute este script no SQL Editor do Supabase

-- 1️⃣ DIAGNÓSTICO: Verificar usuários sem perfil
-- ============================================
SELECT 
    au.id,
    au.email,
    au.created_at as user_created_at,
    p.id as profile_id,
    CASE 
        WHEN p.id IS NULL THEN '❌ SEM PERFIL'
        ELSE '✅ COM PERFIL'
    END as status
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
ORDER BY au.created_at DESC;

-- 2️⃣ CORREÇÃO: Criar perfis ausentes
-- ============================================
-- Este INSERT cria perfis para todos os usuários que não têm um

INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    intended_role,
    status,
    is_approved,
    is_setup_complete,
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
    '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- 3️⃣ VERIFICAÇÃO: Confirmar que todos têm perfil agora
-- ============================================
SELECT 
    COUNT(*) as total_users,
    COUNT(p.id) as users_with_profile,
    COUNT(*) - COUNT(p.id) as users_without_profile
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id;

-- 4️⃣ VERIFICAR TRIGGER: Garantir que o trigger existe e está ativo
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- 5️⃣ RECRIAR TRIGGER (se necessário)
-- ============================================
-- Remover trigger antigo
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recriar função do trigger
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
        '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
    )
    ON CONFLICT (id) DO NOTHING; -- Evita erro se perfil já existe
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recriar trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6️⃣ VERIFICAR RLS: Garantir que as políticas estão corretas
-- ============================================
-- Verificar se RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'profiles';

-- Listar políticas ativas
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- ============================================
-- RESULTADO ESPERADO
-- ============================================
-- Após executar este script:
-- 1. Todos os usuários devem ter perfis criados
-- 2. O trigger deve estar ativo
-- 3. Novos usuários terão perfis criados automaticamente
-- ============================================

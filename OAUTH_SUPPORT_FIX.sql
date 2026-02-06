-- ============================================
-- MELHORIA DO SUPORTE A LOGIN SOCIAL (OAUTH)
-- ============================================

-- Esta função substitui a anterior para capturar melhor os dados vindos
-- do Google, Facebook e Apple (foto, nome completo, etc).

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    -- Variáveis para extrair dados do meta_data
    meta_name TEXT;
    meta_full_name TEXT;
    meta_avatar_url TEXT;
    meta_picture TEXT;
    final_name TEXT;
    final_avatar TEXT;
BEGIN
    -- Extrair dados do raw_user_meta_data
    meta_name := NEW.raw_user_meta_data->>'name';
    meta_full_name := NEW.raw_user_meta_data->>'full_name';
    meta_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    meta_picture := NEW.raw_user_meta_data->>'picture';

    -- Definir Nome (Prioridade: name -> full_name -> Visitante)
    final_name := COALESCE(meta_name, meta_full_name, 'Visitante');

    -- Definir Avatar (Prioridade: avatar_url -> picture -> NULL)
    final_avatar := COALESCE(meta_avatar_url, meta_picture);

    INSERT INTO public.profiles (
        id,
        email,
        name,
        avatar, -- Novo campo preenchido automaticamente
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
        final_name,
        final_avatar,
        'authenticated', -- Papel inicial seguro
        'authenticated',
        'pending',
        FALSE,
        FALSE,
        FALSE,
        '{"pace": 50, "shooting": 50, "passing": 50, "dribbling": 50, "defending": 50, "physical": 50}'::jsonb
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        avatar = EXCLUDED.avatar,
        email = EXCLUDED.email; -- Garante atualização se o usuário relogar

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário para o usuário:
-- Após rodar este script, novos usuários criados via Google/Facebook
-- terão automaticamente o nome e a foto do perfil preenchidos.

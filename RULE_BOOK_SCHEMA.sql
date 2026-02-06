-- ============================================
-- LIVRO DE REGRAS - SCHEMA E STORAGE
-- ============================================

-- 1. Tabela para armazenar referências aos arquivos
CREATE TABLE IF NOT EXISTS public.team_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf' ou 'image'
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE public.team_rules ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Segurança (RLS)

-- SELECT: Todos os membros do time podem ver
CREATE POLICY "rules_select_team" ON public.team_rules
    FOR SELECT 
    TO authenticated
    USING (
        team_id = public.get_auth_user_team_id()
    );

-- INSERT/UPDATE/DELETE: Apenas Presidentes e Vice-Presidentes
CREATE POLICY "rules_manage_leaders" ON public.team_rules
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND team_id = team_rules.team_id 
            AND role IN ('presidente', 'vice-presidente')
        )
    );

-- 4. Criação do Bucket de Storage (se não existir)
-- Nota: A inserção direta em storage.buckets pode variar dependendo da versão do Supabase,
-- mas geralmente funciona para configurar via SQL.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('team-rules', 'team-rules', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para 'team-rules'

-- Permitir acesso público de leitura (ou restrito a autenticados)
CREATE POLICY "Give public access to team-rules" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'team-rules');

-- Permitir upload apenas para autenticados (a validação de cargo será feita no front/backend ou via RLS mais complexa)
-- Simplificando: Autenticados podem fazer upload, mas só vamos permitir via UI para P/VP.
CREATE POLICY "Allow authenticated uploads" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-rules');

-- Permitir update/delete para autenticados (simplificado)
CREATE POLICY "Allow authenticated updates" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'team-rules');
  
CREATE POLICY "Allow authenticated deletes" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'team-rules');

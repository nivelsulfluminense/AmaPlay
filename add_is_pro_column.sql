-- ============================================
-- ADICIONAR COLUNA IS_PRO NA TABELA PROFILES
-- ============================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- Opcional: Criar índice para performance se for filtrar por atletas Pro frequentemente
CREATE INDEX IF NOT EXISTS idx_profiles_is_pro ON public.profiles(is_pro);

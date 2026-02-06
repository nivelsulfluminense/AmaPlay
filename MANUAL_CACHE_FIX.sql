-- SCRIPT DE CORREÇÃO COMPLETA
-- Rode este script APENAS se ainda estiver enfrentando erros de "Schema Cache" ou "Column not found"

BEGIN;

    -- 1. Forçar atualização do cache para a tabela TRANSACTIONS
    -- (Renomear e voltar o nome força o PostgREST a recarregar a estrutura)
    ALTER TABLE public.transactions RENAME COLUMN created_by_name TO created_by_name_temp;
    ALTER TABLE public.transactions RENAME COLUMN created_by_name_temp TO created_by_name;

    ALTER TABLE public.transactions RENAME COLUMN target_user_id TO target_user_id_temp;
    ALTER TABLE public.transactions RENAME COLUMN target_user_id_temp TO target_user_id;

    -- 2. Forçar atualização do cache para a tabela TEAMS
    ALTER TABLE public.teams RENAME COLUMN fee_start_date TO fee_start_date_temp;
    ALTER TABLE public.teams RENAME COLUMN fee_start_date_temp TO fee_start_date;

    ALTER TABLE public.teams RENAME COLUMN monthly_fee_amount TO monthly_fee_amount_temp;
    ALTER TABLE public.teams RENAME COLUMN monthly_fee_amount_temp TO monthly_fee_amount;

    -- 3. Notificar o PostgREST para recarregar o schema
    NOTIFY pgrst, 'reload schema';

COMMIT;

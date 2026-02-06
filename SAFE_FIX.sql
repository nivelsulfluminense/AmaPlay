-- SCRIPT FINAL E SEGURO
-- Tenta criar a coluna se não existir, ignorando erro se já existir.
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.transactions ADD COLUMN created_by_name text;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;

    BEGIN
        ALTER TABLE public.transactions ADD COLUMN target_user_id uuid REFERENCES public.profiles(id);
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.teams ADD COLUMN fee_start_date date;
    EXCEPTION
        WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Força o recarregamento do schema
NOTIFY pgrst, 'reload schema';

-- Migration: Add is_approved column to profiles table
-- Created: 2026-02-01
-- Description: Adds is_approved boolean column to replace status text field for better performance

-- Add is_approved column
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE;

-- Populate is_approved based on existing status
UPDATE public.profiles 
SET is_approved = (status = 'approved')
WHERE status IS NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_is_approved ON public.profiles(is_approved);

-- Update trigger function to handle new user creation
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
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

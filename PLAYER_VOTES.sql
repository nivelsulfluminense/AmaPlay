-- ============================================
-- PLAYER VOTES & OVERALL CALCULATION
-- ============================================

-- 1. Create table for individual votes if it doesn't exist
CREATE TABLE IF NOT EXISTS public.player_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    pace INTEGER CHECK (pace BETWEEN 0 AND 99),
    shooting INTEGER CHECK (shooting BETWEEN 0 AND 99),
    passing INTEGER CHECK (passing BETWEEN 0 AND 99),
    dribbling INTEGER CHECK (dribbling BETWEEN 0 AND 99),
    defending INTEGER CHECK (defending BETWEEN 0 AND 99),
    physical INTEGER CHECK (physical BETWEEN 0 AND 99),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(voter_id, target_user_id) -- One vote per pair
);

-- 2. Enable RLS
ALTER TABLE public.player_votes ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "votes_select_own" ON public.player_votes;
CREATE POLICY "votes_select_own" ON public.player_votes
    FOR SELECT USING (auth.uid() = voter_id);

DROP POLICY IF EXISTS "votes_manage_own" ON public.player_votes;
CREATE POLICY "votes_manage_own" ON public.player_votes
    FOR ALL USING (auth.uid() = voter_id)
    WITH CHECK (auth.uid() = voter_id);

-- 3. Helper Function to Calculate OVR
CREATE OR REPLACE FUNCTION public.calculate_ovr(
    p_position TEXT, 
    p_pace INT, p_shooting INT, p_passing INT, p_dribbling INT, p_defending INT, p_physical INT
)
RETURNS INT AS $$
BEGIN
    IF p_position IS NULL THEN
        RETURN ROUND((p_pace + p_shooting + p_passing + p_dribbling + p_defending + p_physical) / 6.0);
    END IF;

    IF p_position ILIKE '%Atacante%' OR p_position = 'ATA' OR p_position = 'fwd' THEN
        RETURN ROUND((p_pace * 2.0 + p_shooting * 2.0 + p_passing + p_dribbling + p_defending + p_physical) / 8.0);
    ELSIF p_position ILIKE '%Meio%' OR p_position = 'MEI' OR p_position = 'mid' THEN
        RETURN ROUND((p_pace + p_shooting + p_passing * 2.0 + p_dribbling * 2.0 + p_defending + p_physical) / 8.0);
    ELSIF p_position ILIKE '%Defensor%' OR p_position ILIKE '%Zagueiro%' OR p_position = 'DEF' OR p_position = 'ZAG' OR p_position = 'def' THEN
        RETURN ROUND((p_pace + p_shooting + p_passing + p_dribbling + p_defending * 2.0 + p_physical * 2.0) / 8.0);
    ELSE
        -- Default arithmetic mean
        RETURN ROUND((p_pace + p_shooting + p_passing + p_dribbling + p_defending + p_physical) / 6.0);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Trigger Function for VOTES (After Insert/Update/Delete)
CREATE OR REPLACE FUNCTION public.update_player_stats_and_ovr()
RETURNS TRIGGER AS $$
DECLARE
    target_pid UUID;
    avg_pace NUMERIC;
    avg_shooting NUMERIC;
    avg_passing NUMERIC;
    avg_dribbling NUMERIC;
    avg_defending NUMERIC;
    avg_physical NUMERIC;

    final_pace INT := 50;
    final_shooting INT := 50;
    final_passing INT := 50;
    final_dribbling INT := 50;
    final_defending INT := 50;
    final_physical INT := 50;
    
    player_position TEXT;
    calculated_ovr INT := 50;
    count_votes INT;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        target_pid := OLD.target_user_id;
    ELSE
        target_pid := NEW.target_user_id;
    END IF;

    -- Calculate averages
    SELECT 
        AVG(pace), AVG(shooting), AVG(passing), AVG(dribbling), AVG(defending), AVG(physical), COUNT(*)
    INTO 
        avg_pace, avg_shooting, avg_passing, avg_dribbling, avg_defending, avg_physical, count_votes
    FROM public.player_votes
    WHERE target_user_id = target_pid;

    IF count_votes > 0 THEN
        final_pace := ROUND(avg_pace);
        final_shooting := ROUND(avg_shooting);
        final_passing := ROUND(avg_passing);
        final_dribbling := ROUND(avg_dribbling);
        final_defending := ROUND(avg_defending);
        final_physical := ROUND(avg_physical);
    END IF;

    -- Get Position
    SELECT position INTO player_position FROM public.profiles WHERE id = target_pid;

    -- Calculate OVR
    calculated_ovr := public.calculate_ovr(player_position, final_pace, final_shooting, final_passing, final_dribbling, final_defending, final_physical);

    -- Update Profile
    UPDATE public.profiles
    SET 
        stats = jsonb_build_object(
            'pace', final_pace,
            'shooting', final_shooting,
            'passing', final_passing,
            'dribbling', final_dribbling,
            'defending', final_defending,
            'physical', final_physical
        ),
        ovr = calculated_ovr,
        vote_count = count_votes
    WHERE id = target_pid;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_vote_change
    AFTER INSERT OR UPDATE OR DELETE ON public.player_votes
    FOR EACH ROW EXECUTE FUNCTION public.update_player_stats_and_ovr();


-- 5. Trigger Function for POSITION CHANGE (Before Update on Profiles)
CREATE OR REPLACE FUNCTION public.recalc_ovr_on_position_change()
RETURNS TRIGGER AS $$
DECLARE
    p_pace INT;
    p_shooting INT;
    p_passing INT;
    p_dribbling INT;
    p_defending INT;
    p_physical INT;
BEGIN
    -- Only if position changed
    IF OLD.position IS DISTINCT FROM NEW.position THEN
        -- Get current stats from the record itself (stats column is JSONB)
        -- Assuming stats are up to date from votes. If stats column is null, we assume 50s.
        
        IF NEW.stats IS NOT NULL THEN
            p_pace := COALESCE((NEW.stats->>'pace')::INT, 50);
            p_shooting := COALESCE((NEW.stats->>'shooting')::INT, 50);
            p_passing := COALESCE((NEW.stats->>'passing')::INT, 50);
            p_dribbling := COALESCE((NEW.stats->>'dribbling')::INT, 50);
            p_defending := COALESCE((NEW.stats->>'defending')::INT, 50);
            p_physical := COALESCE((NEW.stats->>'physical')::INT, 50);
        ELSE
            p_pace := 50; p_shooting := 50; p_passing := 50; 
            p_dribbling := 50; p_defending := 50; p_physical := 50;
        END IF;

        -- Recalculate OVR with NEW.position
        NEW.ovr := public.calculate_ovr(NEW.position, p_pace, p_shooting, p_passing, p_dribbling, p_defending, p_physical);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_position_change ON public.profiles;

CREATE TRIGGER on_position_change
    BEFORE UPDATE OF position ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.recalc_ovr_on_position_change();

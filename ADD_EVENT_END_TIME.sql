-- Add end_time to game_events
ALTER TABLE game_events ADD COLUMN IF NOT EXISTS end_time TIME;

-- Default end_time to start_time + 2 hours if null (for migration safety)
-- Note: SQLite might not have complex interval types easily available without extensions, 
-- but Postgres (Supabase) does. Assuming Postgres.
UPDATE game_events 
SET end_time = (time::time + interval '2 hours') 
WHERE end_time IS NULL AND time IS NOT NULL;

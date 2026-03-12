-- Migration 003: unique name constraint on golfers + last_synced_at on pool_settings

-- Add unique constraint on golfer names so upsert works by name
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'golfers_name_unique'
  ) THEN
    ALTER TABLE golfers ADD CONSTRAINT golfers_name_unique UNIQUE (name);
  END IF;
END $$;

-- Track when scores were last written from the sync script / cron job
ALTER TABLE pool_settings
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

-- Store round-low data as structured columns so the leaderboard can compute
-- "which entrant holds the round low" server-side
ALTER TABLE golfers
  ADD COLUMN IF NOT EXISTS best_round_score INTEGER,    -- e.g. -8
  ADD COLUMN IF NOT EXISTS best_round_num   SMALLINT;  -- 1, 2, 3, or 4

-- Add round_low_label to pool_settings
-- This text field is set by the score-sync script (Prompt 7) or manually by
-- the admin.  Example value: "Tiger Woods −8 (Round 2)"
ALTER TABLE pool_settings
  ADD COLUMN IF NOT EXISTS round_low_label TEXT;

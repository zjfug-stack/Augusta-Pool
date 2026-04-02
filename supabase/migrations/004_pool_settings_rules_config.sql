-- Migration 004: configurable rules fields on pool_settings
-- These allow the admin to edit key details (Venmo, fee, deadline) without
-- touching code.

ALTER TABLE pool_settings
  ADD COLUMN IF NOT EXISTS venmo_handle        text NOT NULL DEFAULT '@test-venmo',
  ADD COLUMN IF NOT EXISTS entry_fee           integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS submission_deadline text NOT NULL DEFAULT '7 PM CT · Wednesday, April 8th';

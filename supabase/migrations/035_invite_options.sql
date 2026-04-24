-- Add invite usage-tracking and constraint columns to gyms.
-- invite_uses    — how many times the current code has been used
-- invite_max_uses — NULL = unlimited; otherwise capped at this number
-- invite_expires_at — NULL = never expires

ALTER TABLE gyms
  ADD COLUMN IF NOT EXISTS invite_uses       INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invite_max_uses   INTEGER     DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS invite_expires_at TIMESTAMPTZ DEFAULT NULL;

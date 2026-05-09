-- Per-gym onboarding checklist progress. Composite PK (gym_id, step_key) makes
-- the "complete this step" endpoint a natural UPSERT. Canonical step_key values
-- are defined in shared/types (ONBOARDING_STEPS). The DB does not enforce the
-- enum so we can ship new steps without a migration.

CREATE TABLE IF NOT EXISTS gym_onboarding_steps (
  gym_id        UUID         NOT NULL REFERENCES gyms(id) ON DELETE CASCADE,
  step_key      TEXT         NOT NULL,
  completed_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_by  UUID         REFERENCES users(id) ON DELETE SET NULL,
  metadata      JSONB,
  PRIMARY KEY (gym_id, step_key)
);

CREATE INDEX IF NOT EXISTS idx_gym_onboarding_steps_gym
  ON gym_onboarding_steps (gym_id);

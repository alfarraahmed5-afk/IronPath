CREATE TABLE IF NOT EXISTS super_admin_audit_log (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id   UUID         NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action          TEXT         NOT NULL,
  target_type     TEXT         NOT NULL,
  target_id       UUID,
  before          JSONB,
  after           JSONB,
  ip              TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON super_admin_audit_log (actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target ON super_admin_audit_log (target_type, target_id, created_at DESC);

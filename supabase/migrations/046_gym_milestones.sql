-- Phase C.7 — track which activation milestones each gym has hit so we
-- never re-fire a celebration. The check itself runs server-side
-- (lib/activationCheck.ts) on triggers like "member added" or "workout
-- logged"; this table is the durable record so the toast only fires once
-- per milestone per gym.

CREATE TABLE IF NOT EXISTS public.gym_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  milestone_key TEXT NOT NULL,
  hit_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB,
  acknowledged_at TIMESTAMPTZ,
  UNIQUE (gym_id, milestone_key)
);

CREATE INDEX IF NOT EXISTS idx_gym_milestones_unack
  ON public.gym_milestones (gym_id)
  WHERE acknowledged_at IS NULL;

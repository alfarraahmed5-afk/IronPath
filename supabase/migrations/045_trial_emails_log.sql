-- Phase C.5 — log of trial-expiry emails sent. Cron checks this table
-- before each send so a gym never gets the day-21 email twice.

CREATE TABLE IF NOT EXISTS public.trial_emails_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gym_id UUID NOT NULL REFERENCES public.gyms(id) ON DELETE CASCADE,
  email_key TEXT NOT NULL,            -- 'day_21' | 'day_25' | 'day_28' | 'day_30' | 'day_31_locked' | 'day_37_member'
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recipient_email TEXT,               -- captured at send time so we can reconcile if the user changes email
  metadata JSONB,
  UNIQUE (gym_id, email_key)
);

CREATE INDEX IF NOT EXISTS idx_trial_emails_sent_gym
  ON public.trial_emails_sent (gym_id);

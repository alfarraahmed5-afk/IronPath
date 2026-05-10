-- Add member_count to leads. The marketing site's lead form captures
-- gym size as a third field; surfacing it on the lead row lets the
-- sales side route by gym size (>100 members = priority) without
-- digging through the message field.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS member_count INTEGER
    CHECK (member_count IS NULL OR (member_count >= 1 AND member_count <= 100000));

CREATE INDEX IF NOT EXISTS idx_leads_member_count ON leads (member_count) WHERE member_count IS NOT NULL;

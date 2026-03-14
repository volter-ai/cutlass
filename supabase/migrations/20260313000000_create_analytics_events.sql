-- Analytics events table
-- Anonymous (session_id is a random UUID per browser tab, never tied to a user).
-- Used for error diagnostics and feature usage tracking.

CREATE TABLE IF NOT EXISTS analytics_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  session_id text        NOT NULL,
  event      text        NOT NULL,
  props      jsonb       DEFAULT '{}'
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Browser clients can insert (fire-and-forget tracking)
CREATE POLICY "anon insert"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Anon reads allowed — events contain no PII, just anonymous session data
CREATE POLICY "anon select"
  ON analytics_events FOR SELECT
  USING (true);

-- Index for the most common query patterns
CREATE INDEX analytics_events_event_idx      ON analytics_events (event);
CREATE INDEX analytics_events_created_at_idx ON analytics_events (created_at DESC);

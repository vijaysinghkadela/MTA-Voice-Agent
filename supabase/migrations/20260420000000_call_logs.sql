-- MTA Voice Agent v3 — Call Logs (Exotel + Gemini)
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS call_logs (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  call_sid            text UNIQUE NOT NULL,
  caller_phone        text,
  client_name         text,
  business_name       text,
  language            text CHECK (language IN ('Hindi', 'English', 'Hinglish', 'Other')),
  service_interest    text,
  budget              text,
  timeline            text,
  callback_time       text,
  how_heard           text,
  priority            text CHECK (priority IN ('🔴 High', '🟡 Medium', '🟢 Low')) DEFAULT '🟡 Medium',
  ai_summary          text,
  full_transcript     jsonb,
  notion_page_id      text,
  call_duration_sec   integer,
  call_started_at     timestamptz,
  call_ended_at       timestamptz,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_call_logs_call_sid    ON call_logs(call_sid);
CREATE INDEX idx_call_logs_created_at  ON call_logs(created_at DESC);
CREATE INDEX idx_call_logs_phone       ON call_logs(caller_phone);
CREATE INDEX idx_call_logs_priority    ON call_logs(priority);
CREATE INDEX idx_call_logs_service     ON call_logs(service_interest);

ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all"
  ON call_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

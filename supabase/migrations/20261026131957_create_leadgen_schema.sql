/*
# Create lead-generation CRM schema

Single-tenant app (no sign-in). The landing page captures leads into the CRM,
the AI chat widget (GigaChat) holds conversations, and the operator manages
leads and deals from the CRM panel. All tables are reachable by the anon-key
frontend so the public site and the CRM work without authentication.

## New Tables

1. `leads` — every inbound contact, from the landing form or the chat widget.
   - `id` uuid pk
   - `name` text
   - `contact` text (phone / email / telegram — free text)
   - `channel` text ('landing' | 'chat' | 'phone' | 'telegram' | 'whatsapp' | 'max')
   - `source` text (where the lead came from)
   - `status` text ('new' | 'qualified' | 'in_progress' | 'won' | 'lost')
   - `note` text
   - `created_at` / `updated_at`

2. `chat_sessions` — a conversation between a site visitor and the GigaChat agent.
   - `id` uuid pk
   - `lead_id` uuid nullable fk -> leads (set when the agent qualifies the visitor)
   - `status` text ('active' | 'qualified' | 'closed')
   - `visitor_name` / `visitor_contact` text (captured during the chat)
   - `created_at` / `updated_at`

3. `chat_messages` — individual messages in a chat session.
   - `id` uuid pk
   - `session_id` uuid fk -> chat_sessions
   - `role` text ('user' | 'assistant' | 'system')
   - `content` text
   - `created_at`

4. `deals` — pipeline deals tied to a lead.
   - `id` uuid pk
   - `lead_id` uuid fk -> leads
   - `title` text
   - `value` numeric
   - `stage` text ('new' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost')
   - `created_at` / `updated_at`

5. `notes` — operator notes on a lead.
   - `id` uuid pk
   - `lead_id` uuid fk -> leads
   - `content` text
   - `created_at`

6. `activities` — timeline events for a lead (status changes, notes, deals).
   - `id` uuid pk
   - `lead_id` uuid nullable fk -> leads
   - `type` text
   - `description` text
   - `created_at`

7. `gigachat_tokens` — caches the GigaChat OAuth access token (30 min lifetime)
   so every edge-function instance reuses one token instead of re-authenticating
   on each request.
   - `id` int pk (always 1 — singleton row)
   - `access_token` text
   - `expires_at` timestamptz
   - `updated_at` timestamptz

## Security

- RLS enabled on every table.
- CRUD granted to `anon, authenticated` (single-tenant, no sign-in).
- Policies use `USING (true)` / `WITH CHECK (true)` because all data is
  intentionally shared within this single tenant.
- `service_role` granted on tables the edge function writes to
  (chat_messages, chat_sessions, leads, gigachat_tokens, activities).
*/

-- leads -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  channel text NOT NULL DEFAULT 'landing',
  source text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON leads TO service_role;
DROP POLICY IF EXISTS "anon_read_leads" ON leads;
CREATE POLICY "anon_read_leads" ON leads FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_leads" ON leads;
CREATE POLICY "anon_update_leads" ON leads FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_leads" ON leads;
CREATE POLICY "anon_delete_leads" ON leads FOR DELETE TO anon, authenticated USING (true);

-- chat_sessions ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',
  visitor_name text NOT NULL DEFAULT '',
  visitor_contact text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_sessions TO service_role;
DROP POLICY IF EXISTS "anon_read_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_read_chat_sessions" ON chat_sessions FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_insert_chat_sessions" ON chat_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_update_chat_sessions" ON chat_sessions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chat_sessions" ON chat_sessions;
CREATE POLICY "anon_delete_chat_sessions" ON chat_sessions FOR DELETE TO anon, authenticated USING (true);

-- chat_messages ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO service_role;
DROP POLICY IF EXISTS "anon_read_chat_messages" ON chat_messages;
CREATE POLICY "anon_read_chat_messages" ON chat_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_chat_messages" ON chat_messages;
CREATE POLICY "anon_insert_chat_messages" ON chat_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_chat_messages" ON chat_messages;
CREATE POLICY "anon_update_chat_messages" ON chat_messages FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_chat_messages" ON chat_messages;
CREATE POLICY "anon_delete_chat_messages" ON chat_messages FOR DELETE TO anon, authenticated USING (true);

-- deals ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Сделка',
  value numeric NOT NULL DEFAULT 0,
  stage text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON deals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON deals TO service_role;
DROP POLICY IF EXISTS "anon_read_deals" ON deals;
CREATE POLICY "anon_read_deals" ON deals FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_deals" ON deals;
CREATE POLICY "anon_insert_deals" ON deals FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_update_deals" ON deals;
CREATE POLICY "anon_update_deals" ON deals FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_deals" ON deals;
CREATE POLICY "anon_delete_deals" ON deals FOR DELETE TO anon, authenticated USING (true);

-- notes ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON notes TO anon, authenticated;
DROP POLICY IF EXISTS "anon_read_notes" ON notes;
CREATE POLICY "anon_read_notes" ON notes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_notes" ON notes;
CREATE POLICY "anon_insert_notes" ON notes FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_notes" ON notes;
CREATE POLICY "anon_delete_notes" ON notes FOR DELETE TO anon, authenticated USING (true);

-- activities -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  type text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO service_role;
DROP POLICY IF EXISTS "anon_read_activities" ON activities;
CREATE POLICY "anon_read_activities" ON activities FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "anon_insert_activities" ON activities;
CREATE POLICY "anon_insert_activities" ON activities FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "anon_delete_activities" ON activities;
CREATE POLICY "anon_delete_activities" ON activities FOR DELETE TO anon, authenticated USING (true);

-- gigachat_tokens (singleton row, used by edge function) ----------------
CREATE TABLE IF NOT EXISTS gigachat_tokens (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  access_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE gigachat_tokens ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON gigachat_tokens TO service_role;
DROP POLICY IF EXISTS "service_read_gigachat_tokens" ON gigachat_tokens;
CREATE POLICY "service_read_gigachat_tokens" ON gigachat_tokens FOR SELECT TO service_role USING (true);
DROP POLICY IF EXISTS "service_write_gigachat_tokens" ON gigachat_tokens;
CREATE POLICY "service_write_gigachat_tokens" ON gigachat_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at triggers ----------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS leads_touch ON leads;
CREATE TRIGGER leads_touch BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS chat_sessions_touch ON chat_sessions;
CREATE TRIGGER chat_sessions_touch BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
DROP TRIGGER IF EXISTS deals_touch ON deals;
CREATE TRIGGER deals_touch BEFORE UPDATE ON deals FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- indexes ----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_lead ON chat_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX IF NOT EXISTS idx_deals_lead ON deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_notes_lead ON notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);

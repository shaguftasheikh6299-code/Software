/*
# Create scanner session tables for Mobile Remote Scanner

1. New Tables
- `scan_sessions`: Tracks a pairing session between desktop and mobile.
  - `id` (text, primary key): Short unique session ID (e.g. "AB12CD34").
  - `status` (text): One of 'waiting', 'connected', 'disconnected'.
  - `created_at` (timestamptz): When the session was created.
  - `connected_at` (timestamptz): When the mobile device connected.
- `scan_events`: Individual barcode scans sent from the mobile device.
  - `id` (uuid, primary key): Unique event ID.
  - `session_id` (text, references scan_sessions): Which session this scan belongs to.
  - `code` (text): The scanned barcode/QR string.
  - `received` (boolean, default false): Whether the desktop has processed this scan.
  - `created_at` (timestamptz): When the scan event was inserted.

2. Security
- Enable RLS on both tables.
- Allow anon + authenticated CRUD (single-tenant app, no sign-in screen).
- The data is intentionally shared/public for pairing sessions.
*/

CREATE TABLE IF NOT EXISTS scan_sessions (
  id text PRIMARY KEY,
  status text NOT NULL DEFAULT 'waiting',
  created_at timestamptz NOT NULL DEFAULT now(),
  connected_at timestamptz
);

ALTER TABLE scan_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_sessions" ON scan_sessions;
CREATE POLICY "anon_select_scan_sessions" ON scan_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scan_sessions" ON scan_sessions;
CREATE POLICY "anon_insert_scan_sessions" ON scan_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scan_sessions" ON scan_sessions;
CREATE POLICY "anon_update_scan_sessions" ON scan_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scan_sessions" ON scan_sessions;
CREATE POLICY "anon_delete_scan_sessions" ON scan_sessions FOR DELETE
  TO anon, authenticated USING (true);


CREATE TABLE IF NOT EXISTS scan_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
  code text NOT NULL,
  received boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_scan_events" ON scan_events;
CREATE POLICY "anon_select_scan_events" ON scan_events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_scan_events" ON scan_events;
CREATE POLICY "anon_insert_scan_events" ON scan_events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_scan_events" ON scan_events;
CREATE POLICY "anon_update_scan_events" ON scan_events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_scan_events" ON scan_events;
CREATE POLICY "anon_delete_scan_events" ON scan_events FOR DELETE
  TO anon, authenticated USING (true);

-- Index for efficient realtime + session queries
CREATE INDEX IF NOT EXISTS idx_scan_events_session_id ON scan_events(session_id);
CREATE INDEX IF NOT EXISTS idx_scan_events_received ON scan_events(session_id, received);

-- Enable realtime publication for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE scan_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_events;

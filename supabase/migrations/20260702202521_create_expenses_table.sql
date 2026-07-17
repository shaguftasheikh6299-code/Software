/*
# Create Expenses Table

Single-tenant POS app — no auth, no user_id.

1. New Tables
  - `expenses`
    - `id` (uuid, primary key)
    - `amount` (numeric, not null)
    - `category` (text, not null) — e.g. Rent, Salaries, Utilities, Transport
    - `description` (text, nullable)
    - `expense_date` (date, not null)
    - `created_at` (timestamptz, default now())

2. Security
  - RLS enabled on `expenses`.
  - Anon + authenticated CRUD policies (single-tenant, no sign-in screen).
*/

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  category text NOT NULL,
  description text,
  expense_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_expenses" ON expenses;
CREATE POLICY "anon_select_expenses" ON expenses FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_expenses" ON expenses;
CREATE POLICY "anon_insert_expenses" ON expenses FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_expenses" ON expenses;
CREATE POLICY "anon_update_expenses" ON expenses FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_expenses" ON expenses;
CREATE POLICY "anon_delete_expenses" ON expenses FOR DELETE
TO anon, authenticated USING (true);

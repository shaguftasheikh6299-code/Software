/*
# Full POS Schema — Inventory, Parties, Purchases, Invoices

Single-tenant POS app — no auth, anon + authenticated policies on every table.

1. New Tables
  - `inventory` — product master with sku (text PK), cost_price, selling_price, gst_rate, minimum_stock_level
  - `parties` — supplier/party master (party_name, phone, business_type)
  - `purchases` — purchase order header (party_id FK, purchase_date, total_amount)
  - `purchase_items` — line items for each purchase (sku, quantity, cost_price)
  - `invoices` — sales invoice master with bill_type, subtotal, tax_amount, customer_gstin
  - `invoice_items` — line items for each invoice with cost_price snapshot, discount_percent, gst_rate, total_price

2. Extra columns added beyond the base schema
  - inventory: gst_rate (0|5|12|18|28), minimum_stock_level, updated_at
  - invoices: bill_type, customer_gstin, subtotal, tax_amount
  - invoice_items: hsn_code, discount_percent, gst_rate, total_price, created_at

3. Security
  - RLS enabled on all 6 tables.
  - Anon + authenticated CRUD policies (single-tenant, no sign-in screen).
*/

-- 1. Inventory Master Table
CREATE TABLE IF NOT EXISTS inventory (
  sku text PRIMARY KEY,
  part_name text NOT NULL,
  category text,
  rack text,
  hsn text,
  cost_price decimal(10, 2) DEFAULT 0.00,
  selling_price decimal(10, 2) DEFAULT 0.00,
  gst_rate integer DEFAULT 18 CHECK (gst_rate IN (0, 5, 12, 18, 28)),
  stock_quantity integer DEFAULT 0,
  minimum_stock_level integer DEFAULT 5,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_inventory" ON inventory;
CREATE POLICY "anon_select_inventory" ON inventory FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_inventory" ON inventory;
CREATE POLICY "anon_insert_inventory" ON inventory FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_inventory" ON inventory;
CREATE POLICY "anon_update_inventory" ON inventory FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_inventory" ON inventory;
CREATE POLICY "anon_delete_inventory" ON inventory FOR DELETE TO anon, authenticated USING (true);

-- 2. Party / Suppliers Table
CREATE TABLE IF NOT EXISTS parties (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  party_name text NOT NULL,
  phone text,
  business_type text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_parties" ON parties;
CREATE POLICY "anon_select_parties" ON parties FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_parties" ON parties;
CREATE POLICY "anon_insert_parties" ON parties FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_parties" ON parties;
CREATE POLICY "anon_update_parties" ON parties FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_parties" ON parties;
CREATE POLICY "anon_delete_parties" ON parties FOR DELETE TO anon, authenticated USING (true);

-- 3. Purchase Stock Master Table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id uuid REFERENCES parties(id) ON DELETE SET NULL,
  purchase_date date DEFAULT CURRENT_DATE,
  total_amount decimal(10, 2) DEFAULT 0.00,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_purchases" ON purchases;
CREATE POLICY "anon_select_purchases" ON purchases FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_purchases" ON purchases;
CREATE POLICY "anon_insert_purchases" ON purchases FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_purchases" ON purchases;
CREATE POLICY "anon_update_purchases" ON purchases FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_purchases" ON purchases;
CREATE POLICY "anon_delete_purchases" ON purchases FOR DELETE TO anon, authenticated USING (true);

-- 4. Purchase Items Table
CREATE TABLE IF NOT EXISTS purchase_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_id uuid REFERENCES purchases(id) ON DELETE CASCADE,
  sku text REFERENCES inventory(sku) ON DELETE CASCADE,
  quantity integer NOT NULL,
  cost_price decimal(10, 2) NOT NULL
);

ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_purchase_items" ON purchase_items;
CREATE POLICY "anon_select_purchase_items" ON purchase_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_purchase_items" ON purchase_items;
CREATE POLICY "anon_insert_purchase_items" ON purchase_items FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_purchase_items" ON purchase_items;
CREATE POLICY "anon_update_purchase_items" ON purchase_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_purchase_items" ON purchase_items;
CREATE POLICY "anon_delete_purchase_items" ON purchase_items FOR DELETE TO anon, authenticated USING (true);

-- 5. Invoice History Table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number text UNIQUE,
  customer_name text,
  customer_phone text,
  customer_gstin text,
  bill_type text DEFAULT 'GST Invoice' CHECK (bill_type IN ('GST Invoice', 'Estimate')),
  invoice_date date DEFAULT CURRENT_DATE,
  subtotal decimal(10, 2) DEFAULT 0.00,
  tax_amount decimal(10, 2) DEFAULT 0.00,
  total_amount decimal(10, 2) DEFAULT 0.00,
  payment_mode text,
  created_at timestamptz DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE TO anon, authenticated USING (true);

-- 6. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE,
  sku text,
  part_name text,
  hsn_code text,
  quantity integer NOT NULL,
  selling_price decimal(10, 2) NOT NULL,
  cost_price decimal(10, 2) NOT NULL DEFAULT 0,
  discount_percent decimal(5, 2) DEFAULT 0,
  gst_rate integer DEFAULT 0,
  total_price decimal(10, 2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoice_items" ON invoice_items;
CREATE POLICY "anon_select_invoice_items" ON invoice_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_invoice_items" ON invoice_items;
CREATE POLICY "anon_insert_invoice_items" ON invoice_items FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_invoice_items" ON invoice_items;
CREATE POLICY "anon_update_invoice_items" ON invoice_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_invoice_items" ON invoice_items;
CREATE POLICY "anon_delete_invoice_items" ON invoice_items FOR DELETE TO anon, authenticated USING (true);

export interface Product {
  id: string;
  sku_id: string;
  part_name: string;
  category: string;
  rack_location: string | null;
  hsn_code: string | null;
  cost_price: number;
  selling_price: number;
  gst_rate: 0 | 5 | 12 | 18 | 28;
  available_qty: number;
  minimum_stock_level: number;
  created_at: string;
  updated_at: string;
}
export interface Invoice {
  id: string;
  invoice_no: number;
  date: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_gstin: string | null;
  bill_type: 'GST Invoice' | 'Estimate';
  subtotal: number;
  tax_amount: number;
  grand_total: number;
  created_at: string;
}
export interface InvoiceItem {
  id: string;
  invoice_id?: string;
  invoice_no?: number;
  sku_id: string | null;
  part_name: string;
  hsn_code: string | null;
  qty: number;
  unit_price: number;
  cost_price?: number;
  discount_percent: number;
  total_price: number;
  gst_rate: number;
  created_at: string;
}
export interface StockLog {
  id: string;
  date: string;
  sku_id: string | null;
  type: 'In' | 'Out';
  qty: number;
  remarks: string | null;
  created_at: string;
}
export interface CartItem {
  id: string;
  product: Product;
  qty: number;
  unit_price: number;
  discount_percent: number;
  total_price: number;
}
export type BillType = 'GST Invoice' | 'Estimate';
export type ViewType = 'pos' | 'inventory' | 'invoices' | 'dashboard' | 'settings' | 'purchaseStock' | 'partyPurchase' | 'expenses';

export interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  expense_date: string;
  created_at: string;
}
export interface PartyPurchase {
  id: string;
  date: string;
  party_name: string;
  sku_id: string;
  part_name: string;
  qty: number;
  price: number;
  total_amount: number;
  created_at: string;
}
export interface Settings {
  id: number;
  store_name: string;
  store_address: string;
  contact_number: string;
  store_gstin: string;
  terms_conditions: string;
  created_at: string;
  updated_at: string;
}

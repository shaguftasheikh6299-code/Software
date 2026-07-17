import { useState, useEffect, useCallback, useRef } from 'react';
import type { Product, Invoice, InvoiceItem, CartItem, BillType, ViewType, Settings, PartyPurchase, Expense } from './types';
import { supabase } from './lib/supabase';
import {
  ShoppingCart,
  Package,
  FileText,
  BarChart3,
  Search,
  Plus,
  Minus,
  Trash2,
  Printer,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Settings as SettingsIcon,
  Users,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Pencil,
} from 'lucide-react';

const EXPENSE_CATEGORIES = [
  'Rent',
  'Salaries & Wages',
  'Utilities',
  'Transport & Logistics',
  'Purchase / COGS',
  'Marketing & Advertising',
  'Repairs & Maintenance',
  'Office Supplies',
  'Taxes & Fees',
  'Miscellaneous',
];

// Default settings
const DEFAULT_SETTINGS: Settings = {
  id: 1,
  store_name: 'SPARE PARTS WORLD',
  store_address: '123 Industrial Area, Sector 15, Gurgaon - 122001, Haryana',
  contact_number: '+91 98765 43210',
  store_gstin: '06AAPFU0939K1ZM',
  terms_conditions: '1. Goods once sold will not be taken back.\n2. Subject to Gurgaon jurisdiction.\n3. Payment should be made within 30 days.\n4. E. & O.E.',
  created_at: '',
  updated_at: '',
};

// Local storage helpers
const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    if (stored) return JSON.parse(stored);
  } catch {}
  return fallback;
};

const saveToStorage = <T,>(key: string, value: T): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

// Toast Component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
      {type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <X size={16} />
      </button>
    </div>
  );
}

// Print Invoice Modal
function PrintInvoiceModal({
  invoice,
  items,
  settings,
  onClose,
}: {
  invoice: Invoice;
  items: InvoiceItem[];
  settings: Settings;
  onClose: () => void;
}) {
  const termsLines = settings.terms_conditions.split('\n').filter(t => t.trim());

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice #${invoice.invoice_no}</title>
          <style>
            @page { size: A4; margin: 15mm; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #000; }
            .invoice-container { max-width: 190mm; margin: 0 auto; }
            .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
            .header-logo { width: 80px; height: 80px; object-fit: contain; flex-shrink: 0; }
            .header-text { flex: 1; }
            .header h1 { font-size: 18pt; font-weight: bold; margin-bottom: 4px; }
            .header p { font-size: 9pt; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 15px; }
            .info-box { border: 1px solid #000; padding: 8px; }
            .info-box h3 { font-size: 9pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; }
            .info-box p { font-size: 10pt; margin-bottom: 3px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 10pt; }
            th { background: #f0f0f0; font-weight: bold; text-align: center; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { width: 250px; margin-left: auto; }
            .totals td { padding: 4px 8px; }
            .totals tr:last-child { font-weight: bold; font-size: 12pt; }
            .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #ccc; }
            .footer h4 { font-size: 9pt; font-weight: bold; margin-bottom: 5px; }
            .footer p { font-size: 9pt; color: #555; }
            .terms { margin-top: 15px; font-size: 8pt; color: #666; }
            .signatory { text-align: right; margin-top: 30px; padding-top: 10px; }
            .signatory p { font-size: 10pt; }
            .grand-total-row { background: #f5f5f5; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <img src="${window.location.origin}/WhatsApp_Image_2026-07-02_at_4.57.16_AM copy.jpeg" class="header-logo" alt="Logo" />
              <div class="header-text">
                <h1>${settings.store_name}</h1>
                <p>${settings.store_address}</p>
                <p>Phone: ${settings.contact_number} | GSTIN: ${settings.store_gstin}</p>
              </div>
            </div>
            <div class="info-grid">
              <div class="info-box">
                <h3>Invoice Details</h3>
                <p><strong>Invoice No:</strong> ${invoice.invoice_no}</p>
                <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                <p><strong>Bill Type:</strong> ${invoice.bill_type}</p>
              </div>
              <div class="info-box">
                <h3>Customer Details</h3>
                <p><strong>Name:</strong> ${invoice.customer_name || 'Walk-in Customer'}</p>
                <p><strong>Phone:</strong> ${invoice.customer_phone || '-'}</p>
                <p><strong>GSTIN:</strong> ${invoice.customer_gstin || '-'}</p>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Sr No</th>
                  <th>Part Name</th>
                  ${invoice.bill_type === 'GST Invoice' ? '<th>HSN Code</th>' : ''}
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Disc (%)</th>
                  ${invoice.bill_type === 'GST Invoice' ? '<th>CGST</th><th>SGST</th>' : ''}
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${items.map((item, idx) => `
                  <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td>${item.part_name}</td>
                    ${invoice.bill_type === 'GST Invoice' ? `<td class="text-center">${item.hsn_code || '-'}</td>` : ''}
                    <td class="text-center">${item.qty}</td>
                    <td class="text-right">Rs.${item.unit_price.toFixed(2)}</td>
                    <td class="text-center">${(item.discount_percent || 0)}%</td>
                    ${invoice.bill_type === 'GST Invoice' ? `<td class="text-center">${item.gst_rate / 2}%</td><td class="text-center">${item.gst_rate / 2}%</td>` : ''}
                    <td class="text-right">Rs.${item.total_price.toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="totals">
              <table>
                <tr>
                  <td>Subtotal</td>
                  <td class="text-right">Rs.${invoice.subtotal.toFixed(2)}</td>
                </tr>
                ${invoice.bill_type === 'GST Invoice' ? `
                  <tr>
                    <td>CGST (${(invoice.tax_amount / 2 / invoice.subtotal * 100).toFixed(1)}%)</td>
                    <td class="text-right">Rs.${(invoice.tax_amount / 2).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>SGST (${(invoice.tax_amount / 2 / invoice.subtotal * 100).toFixed(1)}%)</td>
                    <td class="text-right">Rs.${(invoice.tax_amount / 2).toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr class="grand-total-row">
                  <td>Grand Total</td>
                  <td class="text-right">Rs.${invoice.grand_total.toFixed(2)}</td>
                </tr>
              </table>
            </div>
            <div class="footer">
              <h4>Amount in Words: ${numberToWords(Math.round(invoice.grand_total))} Rupees Only</h4>
            </div>
            <div class="terms">
              <p><strong>Terms & Conditions:</strong></p>
              ${termsLines.map(t => `<p>${t}</p>`).join('')}
            </div>
            <div class="signatory">
              <p>For ${settings.store_name}</p>
              <br><br>
              <p>Authorized Signatory</p>
            </div>
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white">
          <h2 className="font-semibold">Invoice Preview - #{invoice.invoice_no}</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 rounded hover:bg-emerald-700 text-sm">
              <Printer size={16} />
              Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded">
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-6 overflow-auto max-h-[calc(90vh-60px)]">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 border-b-2 border-black pb-3 mb-4">
              <img
                src="/WhatsApp_Image_2026-07-02_at_4.57.16_AM copy.jpeg"
                alt="Logo"
                className="w-20 h-20 object-contain flex-shrink-0"
              />
              <div>
                <h1 className="text-xl font-bold">{settings.store_name}</h1>
                <p className="text-sm text-slate-600">{settings.store_address}</p>
                <p className="text-sm text-slate-600">Phone: {settings.contact_number} | GSTIN: {settings.store_gstin}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="border border-slate-300 p-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Invoice Details</h3>
                <p className="text-sm"><strong>Invoice No:</strong> {invoice.invoice_no}</p>
                <p className="text-sm"><strong>Date:</strong> {new Date(invoice.date).toLocaleDateString('en-IN')}</p>
                <p className="text-sm"><strong>Bill Type:</strong> {invoice.bill_type}</p>
              </div>
              <div className="border border-slate-300 p-2">
                <h3 className="text-xs font-semibold text-slate-500 uppercase mb-1">Customer Details</h3>
                <p className="text-sm"><strong>Name:</strong> {invoice.customer_name || 'Walk-in Customer'}</p>
                <p className="text-sm"><strong>Phone:</strong> {invoice.customer_phone || '-'}</p>
                <p className="text-sm"><strong>GSTIN:</strong> {invoice.customer_gstin || '-'}</p>
              </div>
            </div>
            <table className="w-full border-collapse mb-4 text-sm">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1 text-center">Sr No</th>
                  <th className="border border-slate-300 px-2 py-1 text-left">Part Name</th>
                  {invoice.bill_type === 'GST Invoice' && <th className="border border-slate-300 px-2 py-1 text-center">HSN Code</th>}
                  <th className="border border-slate-300 px-2 py-1 text-center">Qty</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">Rate</th>
                  <th className="border border-slate-300 px-2 py-1 text-center">Disc (%)</th>
                  {invoice.bill_type === 'GST Invoice' && <>
                    <th className="border border-slate-300 px-2 py-1 text-center">CGST</th>
                    <th className="border border-slate-300 px-2 py-1 text-center">SGST</th>
                  </>}
                  <th className="border border-slate-300 px-2 py-1 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="border border-slate-300 px-2 py-1 text-center">{idx + 1}</td>
                    <td className="border border-slate-300 px-2 py-1">{item.part_name}</td>
                    {invoice.bill_type === 'GST Invoice' && <td className="border border-slate-300 px-2 py-1 text-center">{item.hsn_code || '-'}</td>}
                    <td className="border border-slate-300 px-2 py-1 text-center">{item.qty}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">Rs.{item.unit_price.toFixed(2)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center">{(item.discount_percent || 0)}%</td>
                    {invoice.bill_type === 'GST Invoice' && <>
                      <td className="border border-slate-300 px-2 py-1 text-center">{item.gst_rate / 2}%</td>
                      <td className="border border-slate-300 px-2 py-1 text-center">{item.gst_rate / 2}%</td>
                    </>}
                    <td className="border border-slate-300 px-2 py-1 text-right">Rs.{item.total_price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mb-4">
              <div className="w-52">
                <div className="flex justify-between py-1 border-b border-slate-200"><span>Subtotal</span><span>Rs.{invoice.subtotal.toFixed(2)}</span></div>
                {invoice.bill_type === 'GST Invoice' && (
                  <>
                    <div className="flex justify-between py-1 border-b border-slate-200"><span>CGST</span><span>Rs.{(invoice.tax_amount / 2).toFixed(2)}</span></div>
                    <div className="flex justify-between py-1 border-b border-slate-200"><span>SGST</span><span>Rs.{(invoice.tax_amount / 2).toFixed(2)}</span></div>
                  </>
                )}
                <div className="flex justify-between py-1 font-bold bg-slate-100 px-1"><span>Grand Total</span><span>Rs.{invoice.grand_total.toFixed(2)}</span></div>
              </div>
            </div>
            <p className="text-sm font-medium mb-4">Amount in Words: {numberToWords(Math.round(invoice.grand_total))} Rupees Only</p>
            <div className="text-xs text-slate-500 border-t border-slate-200 pt-2">
              <p className="font-semibold mb-1">Terms & Conditions:</p>
              {termsLines.map((t, idx) => <p key={idx}>{t}</p>)}
            </div>
            <div className="text-right mt-8">
              <p className="text-sm">For {settings.store_name}</p>
              <p className="mt-6 text-sm font-medium">Authorized Signatory</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stock Modal Component
function StockModal({
  product,
  type,
  onClose,
  onSave,
}: {
  product: Product;
  type: 'In' | 'Out';
  onClose: () => void;
  onSave: (skuId: string, qty: number, type: 'In' | 'Out', remarks: string) => void;
}) {
  const [qty, setQty] = useState(1);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (qty > 0) {
      onSave(product.sku_id, qty, type, remarks);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-lg">
          <h2 className="font-semibold flex items-center gap-2">
            {type === 'In' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            {type === 'In' ? 'Add Stock' : 'Remove Stock'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Product</label>
            <p className="text-lg font-semibold">{product.part_name}</p>
            <p className="text-sm text-slate-500">SKU: {product.sku_id}</p>
            <p className="text-sm text-slate-500">Current Stock: {product.available_qty}</p>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Quantity</label>
            <input
              type="number"
              min="1"
              max={type === 'Out' ? product.available_qty : undefined}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Remarks</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks..."
              className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500 focus:border-transparent"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
            <button type="submit" className={`px-4 py-2 text-white rounded ${type === 'In' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-600 hover:bg-amber-700'}`}>Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Product Modal
function AddProductModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (product: Partial<Product>) => void;
}) {
  const [product, setProduct] = useState({
    sku_id: '',
    part_name: '',
    category: 'General',
    rack_location: '',
    hsn_code: '',
    cost_price: 0,
    selling_price: 0,
    gst_rate: 18 as 0 | 5 | 12 | 18 | 28,
    available_qty: 0,
    minimum_stock_level: 5,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (product.sku_id && product.part_name) {
      onSave(product);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-lg sticky top-0">
          <h2 className="font-semibold">Add New Product</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">SKU ID *</label>
              <input type="text" required value={product.sku_id} onChange={(e) => setProduct({ ...product, sku_id: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Part Name *</label>
              <input type="text" required value={product.part_name} onChange={(e) => setProduct({ ...product, part_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
              <input type="text" value={product.category} onChange={(e) => setProduct({ ...product, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Rack Location</label>
              <input type="text" value={product.rack_location} onChange={(e) => setProduct({ ...product, rack_location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">HSN Code</label>
              <input type="text" value={product.hsn_code} onChange={(e) => setProduct({ ...product, hsn_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">GST Rate (%)</label>
              <select value={product.gst_rate} onChange={(e) => setProduct({ ...product, gst_rate: parseInt(e.target.value) as 0 | 5 | 12 | 18 | 28 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Cost Price (Purchase)</label>
              <input type="number" min="0" step="0.01" value={product.cost_price} onChange={(e) => setProduct({ ...product, cost_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Selling Price</label>
              <input type="number" min="0" step="0.01" value={product.selling_price} onChange={(e) => setProduct({ ...product, selling_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Available Qty</label>
              <input type="number" min="0" value={product.available_qty} onChange={(e) => setProduct({ ...product, available_qty: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Minimum Stock Level</label>
              <input type="number" min="0" value={product.minimum_stock_level} onChange={(e) => setProduct({ ...product, minimum_stock_level: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">Save Product</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Product Modal
function EditProductModal({
  product,
  onClose,
  onSave,
}: {
  product: Product;
  onClose: () => void;
  onSave: (skuId: string, updates: Partial<Product>) => void;
}) {
  const [formData, setFormData] = useState({
    part_name: product.part_name,
    category: product.category,
    rack_location: product.rack_location || '',
    hsn_code: product.hsn_code || '',
    cost_price: product.cost_price || 0,
    selling_price: product.selling_price,
    gst_rate: product.gst_rate,
    available_qty: product.available_qty,
    minimum_stock_level: product.minimum_stock_level,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.part_name) {
      onSave(product.sku_id, formData);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between px-4 py-3 bg-slate-800 text-white rounded-t-lg sticky top-0">
          <h2 className="font-semibold flex items-center gap-2">
            <Pencil size={18} />
            Edit Product
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4 p-3 bg-slate-100 rounded">
            <p className="text-sm text-slate-500">SKU ID</p>
            <p className="font-mono font-bold text-lg">{product.sku_id}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-600 mb-1">Part Name *</label>
              <input type="text" required value={formData.part_name} onChange={(e) => setFormData({ ...formData, part_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
              <input type="text" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Rack Location</label>
              <input type="text" value={formData.rack_location} onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">HSN Code</label>
              <input type="text" value={formData.hsn_code} onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">GST Rate (%)</label>
              <select value={formData.gst_rate} onChange={(e) => setFormData({ ...formData, gst_rate: parseInt(e.target.value) as 0 | 5 | 12 | 18 | 28 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Cost Price (Purchase)</label>
              <input type="number" min="0" step="0.01" value={formData.cost_price} onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Selling Price</label>
              <input type="number" min="0" step="0.01" value={formData.selling_price} onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Available Qty</label>
              <input type="number" min="0" value={formData.available_qty} onChange={(e) => setFormData({ ...formData, available_qty: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Minimum Stock Level</label>
              <input type="number" min="0" value={formData.minimum_stock_level} onChange={(e) => setFormData({ ...formData, minimum_stock_level: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Delete Confirmation Modal
function DeleteConfirmModal({
  product,
  onClose,
  onConfirm,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: (skuId: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-4 py-3 bg-red-600 text-white rounded-t-lg">
          <h2 className="font-semibold flex items-center gap-2">
            <Trash2 size={18} />
            Delete Product
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-red-700 rounded"><X size={18} /></button>
        </div>
        <div className="p-4">
          <div className="mb-4 p-3 bg-red-50 rounded border border-red-200">
            <p className="text-sm text-red-800 font-medium">Are you sure you want to delete this product?</p>
          </div>
          <div className="mb-4 p-3 bg-slate-100 rounded">
            <p className="text-sm text-slate-500">SKU</p>
            <p className="font-mono font-bold">{product.sku_id}</p>
            <p className="text-sm text-slate-500 mt-2">Part Name</p>
            <p className="font-semibold">{product.part_name}</p>
            <p className="text-sm text-slate-500 mt-2">Current Stock</p>
            <p className="font-bold">{product.available_qty} units</p>
          </div>
          <p className="text-sm text-slate-500 mb-4">This action cannot be undone. The product will be permanently removed from your inventory.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
            <button onClick={() => onConfirm(product.sku_id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete Product</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Purchase Stock Modal
function PurchaseStockModal({
  products,
  onClose,
  onSubmit,
}: {
  products: Product[];
  onClose: () => void;
  onSubmit: (skuId: string, qty: number, remarks: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSku, setSelectedSku] = useState('');
  const [qty, setQty] = useState(1);
  const [remarks, setRemarks] = useState('');

  const filteredProducts = searchQuery.trim()
    ? products.filter(p =>
        p.sku_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.part_name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10)
    : products;

  const selectedProduct = products.find(p => p.sku_id === selectedSku);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSku && qty > 0) {
      onSubmit(selectedSku, qty, remarks);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-4 py-3 bg-emerald-700 text-white rounded-t-lg">
          <h2 className="font-semibold flex items-center gap-2"><ArrowDownLeft size={18} />Purchase Stock</h2>
          <button onClick={onClose} className="p-1 hover:bg-emerald-600 rounded"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Search Product</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search by SKU or Part Name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Select Product</label>
            <select value={selectedSku} onChange={(e) => setSelectedSku(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" required>
              <option value="">-- Select a product --</option>
              {filteredProducts.map((product) => (
                <option key={product.sku_id} value={product.sku_id}>
                  {product.sku_id} - {product.part_name} (Stock: {product.available_qty})
                </option>
              ))}
            </select>
          </div>
          {selectedProduct && (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
              <p className="text-sm"><span className="font-medium">Part Name:</span> {selectedProduct.part_name}</p>
              <p className="text-sm"><span className="font-medium">Current Stock:</span> {selectedProduct.available_qty}</p>
              <p className="text-sm"><span className="font-medium">Selling Price:</span> Rs.{selectedProduct.selling_price.toFixed(2)}</p>
            </div>
          )}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Purchase Quantity</label>
            <input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Remarks (Optional)</label>
            <input type="text" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="e.g., Purchase invoice #, Supplier name..." className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
            <button type="submit" disabled={!selectedSku || qty < 1} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Number to words converter
function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  if (num === 0) return 'Zero';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}

// Main App Component
function App() {
  const [currentView, setCurrentView] = useState<ViewType>('pos');
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [billType, setBillType] = useState<BillType>('GST Invoice');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [recentlySearched, setRecentlySearched] = useState<Product[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [stockModal, setStockModal] = useState<{ product: Product; type: 'In' | 'Out' } | null>(null);
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [purchaseStockModalOpen, setPurchaseStockModalOpen] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  const [partyPurchases, setPartyPurchases] = useState<PartyPurchase[]>([]);
  const [partyPurchaseForm, setPartyPurchaseForm] = useState({
    party_name: '',
    part_name: '',
    sku_id: '',
    qty: 0,
    price: 0,
  });
  const [partyPurchaseSearch, setPartyPurchaseSearch] = useState('');
  const [partyPurchaseSearchResults, setPartyPurchaseSearchResults] = useState<Product[]>([]);
  const [partyPurchaseHistorySearch, setPartyPurchaseHistorySearch] = useState('');
  const [printInvoice, setPrintInvoice] = useState<{ invoice: Invoice; items: InvoiceItem[] } | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<Record<string, InvoiceItem[]>>({});
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [dashboardStats, setDashboardStats] = useState({ totalProducts: 0, lowStock: 0, todaySales: 0, totalInvoices: 0 });
  const [settings, setSettings] = useState<Settings>(() => loadFromStorage('pos_settings', DEFAULT_SETTINGS));
  const [settingsForm, setSettingsForm] = useState({
    store_name: '',
    store_address: '',
    contact_number: '',
    store_gstin: '',
    terms_conditions: '',
  });

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
  });
  const [plMonth, setPlMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch all core data from Supabase on mount
  useEffect(() => {
    const fetchAll = async () => {
      setIsLoading(true);
      const [prodRes, invRes, ppRes, expRes] = await Promise.all([
        supabase.from('inventory').select('*').order('part_name'),
        supabase.from('invoices').select('*').order('created_at', { ascending: false }),
        supabase.from('purchases').select('*, parties(party_name), purchase_items(sku, quantity, cost_price)').order('purchase_date', { ascending: false }),
        supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
      ]);

      if (prodRes.data) {
        setProducts(prodRes.data.map((row: any) => ({
          id: row.sku,
          sku_id: row.sku,
          part_name: row.part_name,
          category: row.category || 'General',
          rack_location: row.rack || null,
          hsn_code: row.hsn || null,
          cost_price: Number(row.cost_price) || 0,
          selling_price: Number(row.selling_price) || 0,
          gst_rate: (row.gst_rate ?? 18) as Product['gst_rate'],
          available_qty: row.stock_quantity || 0,
          minimum_stock_level: row.minimum_stock_level || 5,
          created_at: row.created_at,
          updated_at: row.updated_at || row.created_at,
        })));
      }

      if (invRes.data) {
        setInvoices(invRes.data.map((row: any) => ({
          id: row.id,
          invoice_no: parseInt(row.invoice_number) || 0,
          date: row.invoice_date,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_gstin: row.customer_gstin,
          bill_type: row.bill_type as BillType,
          subtotal: Number(row.subtotal) || 0,
          tax_amount: Number(row.tax_amount) || 0,
          grand_total: Number(row.total_amount) || 0,
          created_at: row.created_at,
        })));
      }

      if (ppRes.data) {
        const flat: PartyPurchase[] = [];
        for (const purchase of ppRes.data as any[]) {
          const partyName = purchase.parties?.party_name || 'Unknown';
          for (const item of purchase.purchase_items || []) {
            flat.push({
              id: item.id || purchase.id,
              date: purchase.purchase_date,
              party_name: partyName,
              sku_id: item.sku || '',
              part_name: item.sku || '',
              qty: item.quantity,
              price: Number(item.cost_price),
              total_amount: item.quantity * Number(item.cost_price),
              created_at: purchase.created_at,
            });
          }
        }
        setPartyPurchases(flat);
      }

      if (expRes.data) setExpenses(expRes.data as Expense[]);
      setIsLoading(false);
    };
    fetchAll();
  }, []);

  // Keep settings in localStorage (no dedicated DB table needed)
  useEffect(() => { saveToStorage('pos_settings', settings); }, [settings]);

  // Initialize settings form
  useEffect(() => {
    setSettingsForm({
      store_name: settings.store_name,
      store_address: settings.store_address,
      contact_number: settings.contact_number,
      store_gstin: settings.store_gstin,
      terms_conditions: settings.terms_conditions,
    });
  }, []);

  // Dashboard stats
  useEffect(() => {
    const totalProducts = products.length;
    const lowStock = products.filter(p => p.available_qty < p.minimum_stock_level).length;
    const todayStr = new Date().toISOString().split('T')[0];
    const todaySales = invoices
      .filter(inv => inv.date && inv.date.startsWith(todayStr))
      .reduce((sum, inv) => sum + inv.grand_total, 0);
    setDashboardStats({ totalProducts, lowStock, todaySales, totalInvoices: invoices.length });
  }, [products, invoices]);

  // Search products
  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const results = products.filter(
        p => p.sku_id.toLowerCase().includes(query) || p.part_name.toLowerCase().includes(query)
      ).slice(0, 10);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, products]);

  // Party purchase search
  useEffect(() => {
    if (partyPurchaseSearch.trim()) {
      const query = partyPurchaseSearch.toLowerCase();
      const results = products.filter(
        p => p.sku_id.toLowerCase().includes(query) || p.part_name.toLowerCase().includes(query)
      ).slice(0, 10);
      setPartyPurchaseSearchResults(results);
    } else {
      setPartyPurchaseSearchResults([]);
    }
  }, [partyPurchaseSearch, products]);

  // Handle party purchase product selection
  const handlePartyPurchaseProductSelect = (product: Product) => {
    setPartyPurchaseForm({
      ...partyPurchaseForm,
      part_name: product.part_name,
      sku_id: product.sku_id,
      price: product.selling_price,
    });
    setPartyPurchaseSearch('');
    setPartyPurchaseSearchResults([]);
  };

  // Handle party purchase submit
  const handlePartyPurchaseSubmit = async () => {
    if (!partyPurchaseForm.party_name) {
      setToast({ message: 'Please enter party name', type: 'error' });
      return;
    }
    if (!partyPurchaseForm.part_name || !partyPurchaseForm.sku_id) {
      setToast({ message: 'Please select or enter a product', type: 'error' });
      return;
    }
    if (partyPurchaseForm.qty < 1) {
      setToast({ message: 'Quantity must be greater than 0', type: 'error' });
      return;
    }

    // Upsert party by name
    let partyId: string;
    const { data: existingParty } = await supabase
      .from('parties')
      .select('id')
      .eq('party_name', partyPurchaseForm.party_name)
      .maybeSingle();
    if (existingParty) {
      partyId = existingParty.id;
    } else {
      const { data: newParty, error: partyErr } = await supabase
        .from('parties')
        .insert({ party_name: partyPurchaseForm.party_name })
        .select('id')
        .maybeSingle();
      if (partyErr || !newParty) {
        setToast({ message: 'Failed to save party', type: 'error' });
        return;
      }
      partyId = newParty.id;
    }

    const totalAmount = partyPurchaseForm.qty * partyPurchaseForm.price;

    // Create purchase
    const { data: purchase, error: purchErr } = await supabase
      .from('purchases')
      .insert({ party_id: partyId, total_amount: totalAmount })
      .select('id')
      .maybeSingle();
    if (purchErr || !purchase) {
      setToast({ message: 'Failed to save purchase', type: 'error' });
      return;
    }

    // Create purchase item
    const { error: itemErr } = await supabase.from('purchase_items').insert({
      purchase_id: purchase.id,
      sku: partyPurchaseForm.sku_id,
      quantity: partyPurchaseForm.qty,
      cost_price: partyPurchaseForm.price,
    });
    if (itemErr) {
      setToast({ message: 'Failed to save purchase item', type: 'error' });
      return;
    }

    // Update inventory stock_quantity in Supabase
    const product = products.find(p => p.sku_id === partyPurchaseForm.sku_id);
    if (product) {
      await supabase.from('inventory').update({
        stock_quantity: product.available_qty + partyPurchaseForm.qty,
        updated_at: new Date().toISOString(),
      }).eq('sku', partyPurchaseForm.sku_id);
      setProducts(products.map(p =>
        p.sku_id === partyPurchaseForm.sku_id
          ? { ...p, available_qty: p.available_qty + partyPurchaseForm.qty }
          : p
      ));
    }

    const newPurchase: PartyPurchase = {
      id: purchase.id,
      date: new Date().toISOString().split('T')[0],
      party_name: partyPurchaseForm.party_name,
      sku_id: partyPurchaseForm.sku_id,
      part_name: partyPurchaseForm.part_name,
      qty: partyPurchaseForm.qty,
      price: partyPurchaseForm.price,
      total_amount: totalAmount,
      created_at: new Date().toISOString(),
    };
    setPartyPurchases([newPurchase, ...partyPurchases]);
    setPartyPurchaseForm({ party_name: '', part_name: '', sku_id: '', qty: 0, price: 0 });
    setToast({ message: 'Party purchase saved and stock updated', type: 'success' });
  };

  // Handle party purchase delete
  const handlePartyPurchaseDelete = async (id: string) => {
    const { error } = await supabase.from('purchases').delete().eq('id', id);
    if (error) {
      setToast({ message: 'Failed to delete purchase', type: 'error' });
      return;
    }
    setPartyPurchases(partyPurchases.filter(p => p.id !== id));
    setToast({ message: 'Entry deleted', type: 'success' });
  };

  // Handle add expense
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expenseForm.amount);
    if (!amount || amount <= 0) {
      setToast({ message: 'Please enter a valid amount', type: 'error' });
      return;
    }
    const payload = {
      amount,
      category: expenseForm.category,
      description: expenseForm.description || null,
      expense_date: expenseForm.expense_date,
    };
    const { data, error } = await supabase.from('expenses').insert(payload).select().maybeSingle();
    if (error || !data) {
      setToast({ message: 'Failed to save expense', type: 'error' });
      return;
    }
    setExpenses([data as Expense, ...expenses]);
    setExpenseForm({ amount: '', category: EXPENSE_CATEGORIES[0], description: '', expense_date: new Date().toISOString().split('T')[0] });
    setToast({ message: 'Expense logged successfully', type: 'success' });
  };

  // Handle delete expense
  const handleDeleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) {
      setToast({ message: 'Failed to delete expense', type: 'error' });
      return;
    }
    setExpenses(expenses.filter(e => e.id !== id));
    setToast({ message: 'Expense deleted', type: 'success' });
  };

  const [plCogs, setPlCogs] = useState(0);

  // Fetch COGS for selected month from Supabase invoice_items
  useEffect(() => {
    const [year, month] = plMonth.split('-').map(Number);
    const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    supabase
      .from('invoice_items')
      .select('cost_price, quantity, invoices!inner(invoice_date)')
      .gte('invoices.invoice_date', monthStart)
      .lte('invoices.invoice_date', monthEnd)
      .then(({ data }) => {
        if (data) {
          const cogs = data.reduce((sum: number, item: any) => sum + (Number(item.cost_price) * item.quantity), 0);
          setPlCogs(cogs);
        }
      });
  }, [plMonth]);

  // P&L calculations for selected month
  const plStats = (() => {
    const [year, month] = plMonth.split('-').map(Number);
    const monthStartStr = `${year}-${String(month).padStart(2, '0')}`;

    const monthInvoices = invoices.filter(inv => inv.date && inv.date.startsWith(monthStartStr));
    const revenue = monthInvoices.reduce((s, inv) => s + inv.grand_total, 0);

    const monthExpenses = expenses.filter(exp => exp.expense_date && exp.expense_date.startsWith(monthStartStr));
    const totalExpenses = monthExpenses.reduce((s, exp) => s + Number(exp.amount), 0);

    const grossProfit = revenue - plCogs;
    const netProfit = grossProfit - totalExpenses;
    return { revenue, cogs: plCogs, grossProfit, totalExpenses, netProfit, monthInvoiceCount: monthInvoices.length };
  })();

  // Filtered products for inventory
  const filteredProducts = inventorySearch.trim()
    ? products.filter(p =>
        p.sku_id.toLowerCase().includes(inventorySearch.toLowerCase()) ||
        p.part_name.toLowerCase().includes(inventorySearch.toLowerCase())
      )
    : products;

  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.sku_id === product.sku_id);
    if (existing) {
      setCart(cart.map(item =>
        item.product.sku_id === product.sku_id
          ? { ...item, qty: item.qty + 1, total_price: (item.qty + 1) * item.unit_price * (1 - (item.discount_percent || 0) / 100) }
          : item
      ));
    } else {
      setCart([...cart, {
        id: crypto.randomUUID(),
        product,
        qty: 1,
        unit_price: product.selling_price,
        discount_percent: 0,
        total_price: product.selling_price,
      }]);
    }
    setRecentlySearched(prev => {
      const filtered = prev.filter(p => p.sku_id !== product.sku_id);
      return [product, ...filtered].slice(0, 5);
    });
    setSearchQuery('');
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  const updateCartQty = (id: string, qty: number) => {
    if (qty < 1) {
      setCart(cart.filter(item => item.id !== id));
    } else {
      setCart(cart.map(item =>
        item.id === id ? { ...item, qty, total_price: qty * item.unit_price * (1 - (item.discount_percent || 0) / 100) } : item
      ));
    }
  };

  const updateCartDiscount = (id: string, discount_percent: number) => {
    setCart(cart.map(item =>
      item.id === id ? { ...item, discount_percent: Math.max(0, Math.min(100, discount_percent)), total_price: item.qty * item.unit_price * (1 - Math.max(0, Math.min(100, discount_percent)) / 100) } : item
    ));
  };

  const removeFromCart = (id: string) => setCart(cart.filter(item => item.id !== id));

  const clearCart = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerGstin('');
    setBillType('GST Invoice');
  };

  const calculateTotals = useCallback(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.total_price, 0);
    let taxAmount = 0;
    if (billType === 'GST Invoice') {
      taxAmount = cart.reduce((sum, item) => sum + (item.total_price * item.product.gst_rate) / 100, 0);
    }
    return { subtotal, taxAmount, grandTotal: subtotal + taxAmount };
  }, [cart, billType]);

  const getGstPercentage = (gstRate: number) => gstRate / 2;

  const handleCheckout = async (shouldPrint: boolean) => {
    if (cart.length === 0) {
      setToast({ message: 'Cart is empty', type: 'error' });
      return;
    }
    const { subtotal, taxAmount, grandTotal } = calculateTotals();
    const newInvoiceNo = invoices.length > 0 ? Math.max(...invoices.map(i => i.invoice_no)) + 1 : 1001;
    const todayDate = new Date().toISOString().split('T')[0];

    // Insert invoice to Supabase
    const { data: invRow, error: invErr } = await supabase.from('invoices').insert({
      invoice_number: String(newInvoiceNo),
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      customer_gstin: customerGstin || null,
      bill_type: billType,
      invoice_date: todayDate,
      subtotal,
      tax_amount: taxAmount,
      total_amount: grandTotal,
    }).select().maybeSingle();

    if (invErr || !invRow) {
      setToast({ message: 'Failed to save invoice', type: 'error' });
      return;
    }

    // Insert invoice items with cost_price snapshot
    const itemRows = cart.map(item => ({
      invoice_id: invRow.id,
      sku: item.product.sku_id,
      part_name: item.product.part_name,
      hsn_code: item.product.hsn_code || null,
      quantity: item.qty,
      selling_price: item.unit_price,
      cost_price: item.product.cost_price || 0,
      discount_percent: item.discount_percent || 0,
      gst_rate: item.product.gst_rate,
      total_price: item.total_price,
    }));
    const { data: itemsData, error: itemsErr } = await supabase.from('invoice_items').insert(itemRows).select();
    if (itemsErr) {
      setToast({ message: 'Invoice saved but items failed', type: 'error' });
    }

    // Update stock for each cart item in Supabase
    for (const cartItem of cart) {
      const product = products.find(p => p.sku_id === cartItem.product.sku_id);
      if (product) {
        const newQty = Math.max(0, product.available_qty - cartItem.qty);
        await supabase.from('inventory').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('sku', cartItem.product.sku_id);
      }
    }

    const newInvoice: Invoice = {
      id: invRow.id,
      invoice_no: newInvoiceNo,
      date: todayDate,
      customer_name: customerName || null,
      customer_phone: customerPhone || null,
      customer_gstin: customerGstin || null,
      bill_type: billType,
      subtotal,
      tax_amount: taxAmount,
      grand_total: grandTotal,
      created_at: invRow.created_at,
    };

    const items: InvoiceItem[] = (itemsData || []).map((row: any) => ({
      id: row.id,
      invoice_id: row.invoice_id,
      sku_id: row.sku || null,
      part_name: row.part_name,
      hsn_code: row.hsn_code || null,
      qty: row.quantity,
      unit_price: Number(row.selling_price) || 0,
      cost_price: Number(row.cost_price) || 0,
      discount_percent: Number(row.discount_percent) || 0,
      total_price: Number(row.total_price) || 0,
      gst_rate: row.gst_rate || 0,
      created_at: row.created_at,
    }));

    // Update local state
    setProducts(products.map(p => {
      const cartItem = cart.find(c => c.product.sku_id === p.sku_id);
      return cartItem ? { ...p, available_qty: Math.max(0, p.available_qty - cartItem.qty) } : p;
    }));
    setInvoices([newInvoice, ...invoices]);
    setInvoiceItems(prev => ({ ...prev, [invRow.id]: items }));
    setToast({ message: `Invoice #${newInvoiceNo} created successfully`, type: 'success' });
    if (shouldPrint) {
      handleViewAndPrintDirect(newInvoice, items);
    }
    clearCart();
  };

  const handleStockUpdate = async (skuId: string, qty: number, type: 'In' | 'Out', _remarks: string) => {
    const product = products.find(p => p.sku_id === skuId);
    if (!product) return;
    const newQty = type === 'In' ? product.available_qty + qty : Math.max(0, product.available_qty - qty);
    const { error } = await supabase.from('inventory').update({ stock_quantity: newQty, updated_at: new Date().toISOString() }).eq('sku', skuId);
    if (error) {
      setToast({ message: 'Failed to update stock', type: 'error' });
      return;
    }
    setProducts(products.map(p => p.sku_id === skuId ? { ...p, available_qty: newQty } : p));
    setToast({ message: `Stock ${type === 'In' ? 'added' : 'removed'} successfully`, type: 'success' });
  };

  const handleAddProduct = async (productData: Partial<Product>) => {
    const row = {
      sku: productData.sku_id!,
      part_name: productData.part_name!,
      category: productData.category || 'General',
      rack: productData.rack_location || null,
      hsn: productData.hsn_code || null,
      cost_price: productData.cost_price || 0,
      selling_price: productData.selling_price || 0,
      gst_rate: productData.gst_rate ?? 18,
      stock_quantity: productData.available_qty || 0,
      minimum_stock_level: productData.minimum_stock_level || 5,
    };
    const { data, error } = await supabase.from('inventory').insert(row).select().maybeSingle();
    if (error || !data) {
      setToast({ message: error?.message?.includes('duplicate') ? 'SKU already exists' : 'Failed to add product', type: 'error' });
      return;
    }
    const newProduct: Product = {
      id: data.sku,
      sku_id: data.sku,
      part_name: data.part_name,
      category: data.category || 'General',
      rack_location: data.rack || null,
      hsn_code: data.hsn || null,
      cost_price: Number(data.cost_price) || 0,
      selling_price: Number(data.selling_price) || 0,
      gst_rate: (data.gst_rate ?? 18) as Product['gst_rate'],
      available_qty: data.stock_quantity || 0,
      minimum_stock_level: data.minimum_stock_level || 5,
      created_at: data.created_at,
      updated_at: data.updated_at || data.created_at,
    };
    setProducts([...products, newProduct]);
    setToast({ message: 'Product added successfully', type: 'success' });
  };

  const handleUpdateProduct = async (skuId: string, updates: Partial<Product>) => {
    const row: Record<string, any> = {};
    if (updates.part_name !== undefined) row.part_name = updates.part_name;
    if (updates.category !== undefined) row.category = updates.category;
    if (updates.rack_location !== undefined) row.rack = updates.rack_location || null;
    if (updates.hsn_code !== undefined) row.hsn = updates.hsn_code || null;
    if (updates.cost_price !== undefined) row.cost_price = updates.cost_price;
    if (updates.selling_price !== undefined) row.selling_price = updates.selling_price;
    if (updates.gst_rate !== undefined) row.gst_rate = updates.gst_rate;
    if (updates.available_qty !== undefined) row.stock_quantity = updates.available_qty;
    if (updates.minimum_stock_level !== undefined) row.minimum_stock_level = updates.minimum_stock_level;

    const { error } = await supabase.from('inventory').update(row).eq('sku', skuId);
    if (error) {
      setToast({ message: 'Failed to update product', type: 'error' });
      return;
    }
    setProducts(products.map(p => p.sku_id === skuId ? { ...p, ...updates } : p));
    setToast({ message: 'Product updated successfully', type: 'success' });
  };

  const handleDeleteProduct = async (skuId: string) => {
    const { error } = await supabase.from('inventory').delete().eq('sku', skuId);
    if (error) {
      setToast({ message: 'Failed to delete product', type: 'error' });
      return;
    }
    setProducts(products.filter(p => p.sku_id !== skuId));
    setDeleteProduct(null);
    setToast({ message: 'Product deleted successfully', type: 'success' });
  };

  const handleViewAndPrint = async (invoiceId: string, invoiceNo: number) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    if (invoiceItems[invoiceId]) {
      setPrintInvoice({ invoice, items: invoiceItems[invoiceId] });
      return;
    }
    const { data, error } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId);
    if (error || !data) return;
    const items: InvoiceItem[] = data.map((row: any) => ({
      id: row.id,
      invoice_id: row.invoice_id,
      sku_id: row.sku || null,
      part_name: row.part_name,
      hsn_code: row.hsn_code || null,
      qty: row.quantity,
      unit_price: Number(row.selling_price) || 0,
      cost_price: Number(row.cost_price) || 0,
      discount_percent: Number(row.discount_percent) || 0,
      total_price: Number(row.total_price) || 0,
      gst_rate: row.gst_rate || 0,
      created_at: row.created_at,
    }));
    setInvoiceItems(prev => ({ ...prev, [invoiceId]: items }));
    setPrintInvoice({ invoice, items });
    // suppress unused param warning
    void invoiceNo;
  };

  const handleViewAndPrintDirect = (invoice: Invoice, items: InvoiceItem[]) => {
    setPrintInvoice({ invoice, items });
  };

  const handleSaveSettings = () => {
    setSettings(prev => ({ ...prev, ...settingsForm }));
    setToast({ message: 'Settings saved successfully', type: 'success' });
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchSearch = invoiceSearch
      ? inv.invoice_no.toString().includes(invoiceSearch) || (inv.customer_name?.toLowerCase().includes(invoiceSearch.toLowerCase()))
      : true;
    const matchDate = (!dateFilter.start || new Date(inv.date) >= new Date(dateFilter.start)) &&
      (!dateFilter.end || new Date(inv.date) <= new Date(dateFilter.end + 'T23:59:59'));
    return matchSearch && matchDate;
  });

  const { subtotal, taxAmount, grandTotal } = calculateTotals();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-300 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-slate-500 text-sm">Loading inventory data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      <nav className="w-16 lg:w-56 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-700">
          <h1 className="text-lg font-bold hidden lg:block">POS System</h1>
          <div className="lg:hidden text-center"><Package size={24} className="mx-auto" /></div>
        </div>
        <div className="flex-1 py-2">
          <button onClick={() => setCurrentView('pos')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'pos' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <ShoppingCart size={20} /><span className="hidden lg:inline">POS / Billing</span>
          </button>
          <button onClick={() => setCurrentView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'inventory' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <Package size={20} /><span className="hidden lg:inline">Inventory Master</span>
          </button>
          <button onClick={() => setCurrentView('invoices')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'invoices' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <FileText size={20} /><span className="hidden lg:inline">Invoice History</span>
          </button>
          <button onClick={() => setCurrentView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'dashboard' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <BarChart3 size={20} /><span className="hidden lg:inline">Dashboard</span>
          </button>
          <button onClick={() => setCurrentView('settings')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'settings' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <SettingsIcon size={20} /><span className="hidden lg:inline">Settings</span>
          </button>
          <button onClick={() => setCurrentView('purchaseStock')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'purchaseStock' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <ArrowDownLeft size={20} /><span className="hidden lg:inline">Purchase Stock</span>
          </button>
          <button onClick={() => setCurrentView('partyPurchase')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'partyPurchase' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <Users size={20} /><span className="hidden lg:inline">Party Purchase</span>
          </button>
          <button onClick={() => setCurrentView('expenses')} className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${currentView === 'expenses' ? 'bg-slate-700 border-l-4 border-emerald-500' : ''}`}>
            <span className="w-5 h-5 flex items-center justify-center font-bold text-base antialiased">₹</span><span className="hidden lg:inline">Expenses</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {/* POS Screen */}
        {currentView === 'pos' && (
          <div className="h-full flex">
            <div className="w-3/5 border-r border-slate-200 flex flex-col bg-white">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search by SKU or Part Name (Press Enter to add)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && searchResults.length > 0) addToCart(searchResults[0]); }}
                    className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 text-lg"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-64 overflow-auto">
                      {searchResults.map((product) => (
                        <button key={product.id} onClick={() => addToCart(product)} className="w-full px-4 py-2 text-left hover:bg-slate-50 flex justify-between items-center">
                          <div>
                            <p className="font-medium">{product.part_name}</p>
                            <p className="text-sm text-slate-500">SKU: {product.sku_id} | Stock: {product.available_qty}</p>
                          </div>
                          <span className="font-semibold text-emerald-600">Rs.{product.selling_price}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Recently Added</h3>
                <table className="w-full">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase">Part Name</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-500 uppercase">Stock</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-slate-500 uppercase">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentlySearched.map((product) => (
                      <tr key={product.id} onClick={() => addToCart(product)} className="cursor-pointer hover:bg-slate-50">
                        <td className="px-3 py-2 text-sm font-mono">{product.sku_id}</td>
                        <td className="px-3 py-2 text-sm">{product.part_name}</td>
                        <td className={`px-3 py-2 text-sm text-center ${product.available_qty < product.minimum_stock_level ? 'bg-red-100 text-red-700 font-medium' : ''}`}>{product.available_qty}</td>
                        <td className="px-3 py-2 text-sm text-right font-medium">Rs.{product.selling_price}</td>
                      </tr>
                    ))}
                    {recentlySearched.length === 0 && (
                      <tr><td colSpan={4} className="px-3 py-8 text-center text-slate-400">Start searching to add items</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="w-2/5 flex flex-col bg-slate-50">
              <div className="p-4 border-b border-slate-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-lg">Current Bill</h2>
                  <button onClick={clearCart} className="text-sm text-slate-500 hover:text-red-500 flex items-center gap-1"><Trash2 size={14} />Clear</button>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setBillType('GST Invoice')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${billType === 'GST Invoice' ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>GST Invoice</button>
                  <button onClick={() => setBillType('Estimate')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${billType === 'Estimate' ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}>Estimate</button>
                </div>
                {billType === 'GST Invoice' && (
                  <div className="mt-3 space-y-2">
                    <input type="text" placeholder="Customer Name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-500" />
                    <div className="flex gap-2">
                      <input type="text" placeholder="Phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-500" />
                      <input type="text" placeholder="GSTIN" value={customerGstin} onChange={(e) => setCustomerGstin(e.target.value)} className="flex-1 px-3 py-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-slate-500" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 overflow-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium text-slate-500 uppercase">Part Name</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-20">SKU</th>
                      <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase w-20">Price</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-16">Qty</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-16">Disc (%)</th>
                      {billType === 'GST Invoice' && (
                        <>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-14">CGST</th>
                          <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-14">SGST</th>
                        </>
                      )}
                      <th className="px-2 py-2 text-right text-xs font-medium text-slate-500 uppercase w-24">Total</th>
                      <th className="px-2 py-2 text-center text-xs font-medium text-slate-500 uppercase w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item) => (
                      <tr key={item.id} className="bg-white hover:bg-slate-50">
                        <td className="px-2 py-2">
                          <p className="text-sm font-medium truncate max-w-[180px]" title={item.product.part_name}>{item.product.part_name}</p>
                        </td>
                        <td className="px-2 py-2 text-center text-xs font-mono text-slate-600">{item.product.sku_id}</td>
                        <td className="px-2 py-2 text-right text-sm">{item.unit_price.toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => updateCartQty(item.id, item.qty - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600"><Minus size={12} /></button>
                            <input type="number" value={item.qty} onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 0)} className="w-10 text-center border border-slate-200 rounded py-1 text-sm" />
                            <button onClick={() => updateCartQty(item.id, item.qty + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600"><Plus size={12} /></button>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount_percent || 0}
                            onChange={(e) => updateCartDiscount(item.id, parseFloat(e.target.value) || 0)}
                            className="w-14 text-center border border-slate-200 rounded py-1 text-sm"
                          />
                        </td>
                        {billType === 'GST Invoice' && (
                          <>
                            <td className="px-2 py-2 text-center text-sm text-slate-600">{getGstPercentage(item.product.gst_rate)}%</td>
                            <td className="px-2 py-2 text-center text-sm text-slate-600">{getGstPercentage(item.product.gst_rate)}%</td>
                          </>
                        )}
                        <td className="px-2 py-2 text-right font-medium text-sm">Rs.{item.total_price.toFixed(2)}</td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => removeFromCart(item.id)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {cart.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <ShoppingCart size={40} className="mb-2 opacity-30" />
                    <p className="text-sm">Cart is empty</p>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-200 bg-white p-4">
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span>Rs.{subtotal.toFixed(2)}</span></div>
                  {billType === 'GST Invoice' && (
                    <>
                      <div className="flex justify-between text-sm text-slate-600"><span>CGST</span><span>Rs.{(taxAmount / 2).toFixed(2)}</span></div>
                      <div className="flex justify-between text-sm text-slate-600"><span>SGST</span><span>Rs.{(taxAmount / 2).toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-1 border-t border-slate-200"><span>Grand Total</span><span className="text-emerald-600">Rs.{grandTotal.toFixed(2)}</span></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleCheckout(false)} disabled={cart.length === 0} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Save size={18} />Save Only</button>
                  <button onClick={() => handleCheckout(true)} disabled={cart.length === 0} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><Printer size={18} />Save & Print</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Screen */}
        {currentView === 'inventory' && (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Inventory Master</h2>
                <button onClick={() => setAddProductModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700"><Plus size={18} />Add Product</button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input type="text" placeholder="Search by SKU or Part Name..." value={inventorySearch} onChange={(e) => setInventorySearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">SKU</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Part Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Rack</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">HSN</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Cost</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Sell</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">GST %</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Stock</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Min Level</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono text-sm">{product.sku_id}</td>
                      <td className="px-4 py-2 font-medium">{product.part_name}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{product.category}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{product.rack_location || '-'}</td>
                      <td className="px-4 py-2 text-sm text-slate-600">{product.hsn_code || '-'}</td>
                      <td className="px-4 py-2 text-right text-sm text-slate-500">Rs.{(product.cost_price || 0).toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-medium">Rs.{product.selling_price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center text-sm">{product.gst_rate}%</td>
                      <td className={`px-4 py-2 text-center ${product.available_qty < product.minimum_stock_level ? 'bg-red-100 text-red-700 font-bold' : 'font-medium'}`}>{product.available_qty}</td>
                      <td className="px-4 py-2 text-center text-sm text-slate-600">{product.minimum_stock_level}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditProduct(product)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit Product"><Pencil size={16} /></button>
                          <button onClick={() => setDeleteProduct(product)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Delete Product"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Package size={48} className="mb-2 opacity-30" />
                  <p>{inventorySearch ? 'No products match your search.' : 'No products found. Add your first product.'}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Invoice History Screen */}
        {currentView === 'invoices' && (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">Invoice History</h2>
              </div>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="Search by Invoice No or Customer Name..." value={invoiceSearch} onChange={(e) => setInvoiceSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                </div>
                <input type="date" placeholder="From Date" value={dateFilter.start} onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                <input type="date" placeholder="To Date" value={dateFilter.end} onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })} className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse">
                <thead className="bg-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Invoice No</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Bill Type</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 font-mono font-medium">#{invoice.invoice_no}</td>
                      <td className="px-4 py-2 text-sm">{new Date(invoice.date).toLocaleDateString('en-IN')}</td>
                      <td className="px-4 py-2 text-sm">{invoice.customer_name || 'Walk-in Customer'}</td>
                      <td className="px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.bill_type === 'GST Invoice' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{invoice.bill_type}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">Rs.{invoice.grand_total.toFixed(2)}</td>
                      <td className="px-4 py-2 text-center">
                        <button onClick={() => handleViewAndPrint(invoice.id, invoice.invoice_no)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg" title="View & Print"><Printer size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400"><FileText size={48} className="mb-2 opacity-30" /><p>No invoices found</p></div>
              )}
            </div>
          </div>
        )}

        {/* Dashboard Screen */}
        {currentView === 'dashboard' && (
          <div className="h-full overflow-auto bg-slate-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Dashboard</h2>
            </div>

            {/* Inventory Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg p-5 shadow">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-slate-500">Total Products</p><p className="text-3xl font-bold mt-1">{dashboardStats.totalProducts}</p></div>
                  <Package className="text-slate-300" size={40} />
                </div>
              </div>
              <div className="bg-white rounded-lg p-5 shadow">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-slate-500">Low Stock Items</p><p className="text-3xl font-bold mt-1 text-red-600">{dashboardStats.lowStock}</p></div>
                  <AlertCircle className="text-red-200" size={40} />
                </div>
              </div>
              <div className="bg-white rounded-lg p-5 shadow">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-slate-500">Today's Sales</p><p className="text-3xl font-bold mt-1 text-emerald-600">Rs.{dashboardStats.todaySales.toFixed(0)}</p></div>
                  <BarChart3 className="text-emerald-200" size={40} />
                </div>
              </div>
              <div className="bg-white rounded-lg p-5 shadow">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-slate-500">Total Invoices</p><p className="text-3xl font-bold mt-1">{dashboardStats.totalInvoices}</p></div>
                  <FileText className="text-slate-300" size={40} />
                </div>
              </div>
            </div>

            {/* Monthly P&L Section */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <BarChart3 size={18} className="text-blue-600" />
                  Monthly Profit &amp; Loss Summary
                </h3>
                <div className="flex items-center gap-2">
                  <CalendarDays size={16} className="text-slate-400" />
                  <input
                    type="month"
                    value={plMonth}
                    onChange={(e) => setPlMonth(e.target.value)}
                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y lg:divide-y-0 divide-slate-100">
                {/* Total Revenue */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Total Revenue</p>
                      <p className="text-2xl font-bold text-slate-800">Rs.{plStats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-slate-400 mt-1">{plStats.monthInvoiceCount} invoice{plStats.monthInvoiceCount !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <TrendingUp size={20} className="text-blue-600" />
                    </div>
                  </div>
                </div>

                {/* COGS */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Cost of Goods Sold</p>
                      <p className="text-2xl font-bold text-slate-800">Rs.{plStats.cogs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-slate-400 mt-1">Gross Profit: Rs.{plStats.grossProfit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                      <Package size={20} className="text-amber-600" />
                    </div>
                  </div>
                </div>

                {/* Total Expenses */}
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Operating Expenses</p>
                      <p className="text-2xl font-bold text-slate-800">Rs.{plStats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      <p className="text-xs text-slate-400 mt-1">Rent, salaries, utilities…</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                      <span className="w-5 h-5 flex items-center justify-center font-bold text-base antialiased text-orange-500">₹</span>
                    </div>
                  </div>
                </div>

                {/* Net Profit / Loss */}
                <div className={`p-5 ${plStats.netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Net Profit / Loss</p>
                      <p className={`text-2xl font-bold ${plStats.netProfit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {plStats.netProfit < 0 ? '-' : ''}Rs.{Math.abs(plStats.netProfit).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${plStats.netProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {plStats.netProfit >= 0 ? 'Profitable' : 'Loss this month'}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${plStats.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                      {plStats.netProfit >= 0
                        ? <TrendingUp size={20} className="text-green-600" />
                        : <TrendingDown size={20} className="text-red-500" />}
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-200/60 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-slate-500">Revenue</span><span className="font-medium text-blue-700">+Rs.{plStats.revenue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">COGS</span><span className="font-medium text-amber-600">-Rs.{plStats.cogs.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                    <div className="flex justify-between"><span className="text-slate-500">Expenses</span><span className="font-medium text-orange-600">-Rs.{plStats.totalExpenses.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="p-4 border-b border-slate-200"><h3 className="font-semibold flex items-center gap-2"><AlertCircle size={18} className="text-red-500" />Low Stock Alerts</h3></div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">SKU</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Part Name</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Current Stock</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Min Level</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.filter(p => p.available_qty < p.minimum_stock_level).map(product => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-sm">{product.sku_id}</td>
                        <td className="px-4 py-2">{product.part_name}</td>
                        <td className="px-4 py-2 text-center bg-red-50 text-red-700 font-bold">{product.available_qty}</td>
                        <td className="px-4 py-2 text-center">{product.minimum_stock_level}</td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => setStockModal({ product, type: 'In' })} className="text-emerald-600 hover:text-emerald-700 font-medium">Restock</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {products.filter(p => p.available_qty < p.minimum_stock_level).length === 0 && (
                  <div className="p-8 text-center text-slate-400">All products are well stocked!</div>
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-slate-200"><h3 className="font-semibold">Recent Invoices</h3></div>
              <div className="overflow-auto">
                <table className="w-full">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Invoice No</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">Customer</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-slate-500">Total</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-slate-500">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoices.slice(0, 5).map(invoice => (
                      <tr key={invoice.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono">#{invoice.invoice_no}</td>
                        <td className="px-4 py-2 text-sm">{new Date(invoice.date).toLocaleDateString('en-IN')}</td>
                        <td className="px-4 py-2 text-sm">{invoice.customer_name || 'Walk-in'}</td>
                        <td className="px-4 py-2 text-right font-medium">Rs.{invoice.grand_total.toFixed(2)}</td>
                        <td className="px-4 py-2 text-center">
                          <button onClick={() => handleViewAndPrint(invoice.id, invoice.invoice_no)} className="p-1.5 hover:bg-slate-100 rounded"><Printer size={16} className="text-slate-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Settings Screen */}
        {currentView === 'settings' && (
          <div className="h-full overflow-auto bg-slate-100 p-6">
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold flex items-center gap-2"><SettingsIcon size={20} />Store Settings</h2>
                  <p className="text-sm text-slate-500 mt-1">Configure your store details for invoice headers and footers.</p>
                </div>
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Store Name</label>
                    <input type="text" value={settingsForm.store_name} onChange={(e) => setSettingsForm({ ...settingsForm, store_name: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Store Address</label>
                    <textarea value={settingsForm.store_address} onChange={(e) => setSettingsForm({ ...settingsForm, store_address: e.target.value })} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Number</label>
                      <input type="text" value={settingsForm.contact_number} onChange={(e) => setSettingsForm({ ...settingsForm, contact_number: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Store GSTIN</label>
                      <input type="text" value={settingsForm.store_gstin} onChange={(e) => setSettingsForm({ ...settingsForm, store_gstin: e.target.value })} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                    <p className="text-xs text-slate-500 mb-1">Enter each term on a new line</p>
                    <textarea value={settingsForm.terms_conditions} onChange={(e) => setSettingsForm({ ...settingsForm, terms_conditions: e.target.value })} rows={5} className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 font-mono text-sm" />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-slate-200">
                    <button onClick={handleSaveSettings} className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium"><Save size={18} />Save Settings</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Purchase Stock Screen */}
        {currentView === 'purchaseStock' && (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><ArrowDownLeft size={20} className="text-emerald-600" />Purchase Stock</h2>
              <p className="text-sm text-slate-500 mt-1">Add stock to existing products</p>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div className="max-w-md mx-auto">
                <button onClick={() => setPurchaseStockModalOpen(true)} className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-lg"><Plus size={24} />Add Stock Entry</button>
                <p className="text-center text-slate-500 mt-4 text-sm">Click above to add stock to an existing product</p>
              </div>
            </div>
          </div>
        )}

        {/* Party Purchase Screen */}
        {currentView === 'partyPurchase' && (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Users size={20} className="text-blue-600" />Party Purchase</h2>
              <p className="text-sm text-slate-500 mt-1">Log inventory purchased from local shopkeepers</p>
            </div>

            {/* Entry Form */}
            <div className="p-4 border-b border-slate-200 bg-white shrink-0">
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-600 mb-1">Search Product (Auto-fills Part Name, SKU & Price)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by SKU or Part Name..."
                    value={partyPurchaseSearch}
                    onChange={(e) => setPartyPurchaseSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {partyPurchaseSearchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                      {partyPurchaseSearchResults.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handlePartyPurchaseProductSelect(product)}
                          className="w-full px-3 py-2 text-left hover:bg-slate-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                        >
                          <div>
                            <p className="font-medium text-sm">{product.part_name}</p>
                            <p className="text-xs text-slate-500">SKU: {product.sku_id} | Rs.{product.selling_price}</p>
                          </div>
                          <Plus size={16} className="text-blue-500" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-7 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Party Name *</label>
                  <input
                    type="text"
                    value={partyPurchaseForm.party_name}
                    onChange={(e) => setPartyPurchaseForm({ ...partyPurchaseForm, party_name: e.target.value })}
                    placeholder="Shop name"
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                  <input
                    type="text"
                    value={new Date().toLocaleDateString('en-IN')}
                    readOnly
                    className="w-full px-2 py-2 border border-slate-200 rounded-lg bg-slate-100 text-slate-600 text-sm cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Part Name *</label>
                  <input
                    type="text"
                    value={partyPurchaseForm.part_name}
                    onChange={(e) => setPartyPurchaseForm({ ...partyPurchaseForm, part_name: e.target.value })}
                    placeholder="Part name"
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Part No (SKU) *</label>
                  <input
                    type="text"
                    value={partyPurchaseForm.sku_id}
                    onChange={(e) => setPartyPurchaseForm({ ...partyPurchaseForm, sku_id: e.target.value })}
                    placeholder="SKU"
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={partyPurchaseForm.price}
                    onChange={(e) => setPartyPurchaseForm({ ...partyPurchaseForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-right"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="0"
                    value={partyPurchaseForm.qty}
                    onChange={(e) => setPartyPurchaseForm({ ...partyPurchaseForm, qty: parseInt(e.target.value) || 0 })}
                    className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">&nbsp;</label>
                  <button
                    onClick={handlePartyPurchaseSubmit}
                    disabled={!partyPurchaseForm.party_name || !partyPurchaseForm.part_name || !partyPurchaseForm.sku_id || partyPurchaseForm.qty < 1}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
              <div className="mt-2 text-right text-sm text-slate-600">
                Total: <span className="font-bold text-emerald-600">Rs.{(partyPurchaseForm.qty * partyPurchaseForm.price).toFixed(2)}</span>
              </div>
            </div>

            {/* History Table */}
            <div className="flex-1 overflow-auto">
              <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="font-semibold text-sm">Purchase History</h3>
                  <div className="relative flex-1 max-w-xs">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search history by Party Name, Part Name, or SKU..."
                      value={partyPurchaseHistorySearch}
                      onChange={(e) => setPartyPurchaseHistorySearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
              {(() => {
                const filteredPurchases = partyPurchases.filter((purchase) => {
                  if (!partyPurchaseHistorySearch.trim()) return true;
                  const search = partyPurchaseHistorySearch.toLowerCase();
                  return (
                    purchase.party_name?.toLowerCase().includes(search) ||
                    purchase.part_name?.toLowerCase().includes(search) ||
                    purchase.sku_id?.toLowerCase().includes(search)
                  );
                });
                return filteredPurchases.length === 0 && partyPurchases.length > 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Search size={48} className="mb-2 opacity-30" />
                    <p className="text-sm">No matching purchases found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                ) : filteredPurchases.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                    <Users size={48} className="mb-2 opacity-30" />
                    <p className="text-sm">No party purchases recorded yet</p>
                    <p className="text-xs mt-1">Use the form above to add entries</p>
                  </div>
                ) : (
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Party Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Part Name</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">SKU</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Qty</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Price</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Total</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPurchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm">{purchase.date ? new Date(purchase.date).toLocaleDateString('en-IN') : '-'}</td>
                          <td className="px-4 py-2 text-sm font-medium">{purchase.party_name || '-'}</td>
                          <td className="px-4 py-2 text-sm">{purchase.part_name || '-'}</td>
                          <td className="px-4 py-2 text-center text-sm font-mono">{purchase.sku_id || '-'}</td>
                          <td className="px-4 py-2 text-center text-sm font-medium">{purchase.qty ?? 0}</td>
                          <td className="px-4 py-2 text-right text-sm">Rs.{(purchase.price ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-sm font-bold text-emerald-600">Rs.{(purchase.total_amount ?? 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handlePartyPurchaseDelete(purchase.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}
        {/* Expenses Screen */}
        {currentView === 'expenses' && (
          <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 bg-slate-50 shrink-0">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center font-bold text-base antialiased text-orange-500">₹</span>
                Expense Management
              </h2>
              <p className="text-sm text-slate-500 mt-1">Log and track all business operating expenses</p>
            </div>

            {/* Add Expense Form */}
            <div className="p-4 border-b border-slate-200 bg-white shrink-0">
              <form onSubmit={handleAddExpense}>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date *</label>
                    <input
                      type="date"
                      value={expenseForm.expense_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category *</label>
                    <select
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm bg-white"
                      required
                    >
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Amount (Rs.) *</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm text-right"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                    <input
                      type="text"
                      placeholder="Optional note..."
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">&nbsp;</label>
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm font-medium transition-colors"
                    >
                      <Plus size={16} />
                      Add Expense
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Expenses List */}
            <div className="flex-1 overflow-auto">
              {false ? (
                <div className="flex items-center justify-center py-16 text-slate-400">
                  <p className="text-sm">Loading expenses...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <span className="w-12 h-12 flex items-center justify-center font-bold text-3xl antialiased opacity-30">₹</span>
                  <p className="text-sm">No expenses logged yet</p>
                  <p className="text-xs mt-1">Use the form above to add your first expense</p>
                </div>
              ) : (
                <>
                  {/* Summary bar */}
                  <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                    <span className="text-sm text-orange-700 font-medium">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} total</span>
                    <span className="text-sm font-bold text-orange-800">
                      Total: Rs.{expenses.reduce((s, e) => s + Number(e.amount), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Category</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm">{new Date(expense.expense_date + 'T00:00:00').toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              {expense.category}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">{expense.description || <span className="text-slate-400 italic">—</span>}</td>
                          <td className="px-4 py-2 text-right text-sm font-semibold text-red-600">Rs.{Number(expense.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {stockModal && <StockModal product={stockModal.product} type={stockModal.type} onClose={() => setStockModal(null)} onSave={handleStockUpdate} />}
      {addProductModalOpen && <AddProductModal onClose={() => setAddProductModalOpen(false)} onSave={handleAddProduct} />}
      {editProduct && <EditProductModal product={editProduct} onClose={() => setEditProduct(null)} onSave={handleUpdateProduct} />}
      {deleteProduct && <DeleteConfirmModal product={deleteProduct} onClose={() => setDeleteProduct(null)} onConfirm={handleDeleteProduct} />}
      {purchaseStockModalOpen && <PurchaseStockModal products={products} onClose={() => setPurchaseStockModalOpen(false)} onSubmit={(skuId, qty, remarks) => handleStockUpdate(skuId, qty, 'In', remarks)} />}
      {printInvoice && <PrintInvoiceModal invoice={printInvoice.invoice} items={printInvoice.items} settings={settings} onClose={() => setPrintInvoice(null)} />}
    </div>
  );
}

export default App;

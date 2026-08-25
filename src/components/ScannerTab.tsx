import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Product } from '../types';
import { supabase } from '../lib/supabase';
import { useScanner } from '../lib/useScanner';
import { generateSessionId, createSession, deleteSession, markScanReceived, deleteSessionEvents } from '../lib/scannerSession';
import { ScanLine, Camera, CameraOff, Check, X, Search, FlaskConical, Smartphone, Loader2, Copy, Sparkles } from 'lucide-react';

interface ScannerFormData {
  sku_id: string;
  part_name: string;
  category: string;
  vehicle_model: string;
  qty: number;
  cost_price: number;
  selling_price: number;
  gst_rate: number;
  rack_location: string;
  isExisting: boolean;
  existingProduct: Product | null;
}

const BLANK_FORM: ScannerFormData = {
  sku_id: '',
  part_name: '',
  category: 'General',
  vehicle_model: '',
  qty: 1,
  cost_price: 0,
  selling_price: 0,
  gst_rate: 18,
  rack_location: '',
  isExisting: false,
  existingProduct: null,
};

interface ScannerTabProps {
  products: Product[];
  onConfirm: (data: ScannerFormData) => void;
}

export default function ScannerTab({ products, onConfirm }: ScannerTabProps) {
  const [manualInput, setManualInput] = useState('');
  const [formData, setFormData] = useState<ScannerFormData | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  // Mobile remote scanner state
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'waiting' | 'connected'>('idle');
  const [copied, setCopied] = useState(false);
  const sessionChannelRef = useRef<any>(null);

  const productsRef = useRef(products);
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const processScannedCode = useCallback((code: string) => {
    // 1. AI OCR Label Data Handler
    if (code.startsWith('AI_LABEL_SCAN:')) {
      try {
        const rawJson = code.replace('AI_LABEL_SCAN:', '');
        const data = JSON.parse(rawJson);

        const sku = data.sku_id || '';
        const existing = productsRef.current.find((p) => p.sku_id.toLowerCase() === sku.toLowerCase());

        if (existing) {
          setFormData({
            sku_id: existing.sku_id,
            part_name: existing.part_name,
            category: existing.category || 'General',
            vehicle_model: '',
            qty: data.quantity || 1,
            cost_price: existing.cost_price || (data.mrp ? Math.round(data.mrp * 0.7) : 0),
            selling_price: existing.selling_price || data.mrp || 0,
            gst_rate: existing.gst_rate || 18,
            rack_location: existing.rack_location || '',
            isExisting: true,
            existingProduct: existing,
          });
        } else {
          setFormData({
            ...BLANK_FORM,
            sku_id: data.sku_id || '',
            part_name: data.part_name || '',
            selling_price: data.mrp || 0,
            cost_price: data.mrp ? Math.round(data.mrp * 0.7) : 0,
            qty: data.quantity || 1,
            isExisting: false,
          });
        }
        setManualInput('');
        return;
      } catch (err) {
        console.error('Failed to parse AI OCR scanned JSON', err);
      }
    }

    // 2. Standard Barcode / QR Code Handler
    const existing = productsRef.current.find((p) => p.sku_id.toLowerCase() === code.toLowerCase());
    if (existing) {
      setFormData({
        sku_id: existing.sku_id,
        part_name: existing.part_name,
        category: existing.category || 'General',
        vehicle_model: '',
        qty: 1,
        cost_price: existing.cost_price || 0,
        selling_price: existing.selling_price,
        gst_rate: existing.gst_rate,
        rack_location: existing.rack_location || '',
        isExisting: true,
        existingProduct: existing,
      });
    } else {
      setFormData({ ...BLANK_FORM, sku_id: code });
    }
    setManualInput('');
  }, []);

  const { scanning, cameraError, startCamera, stopCamera, scannerContainerRef } = useScanner(processScannedCode);

  useEffect(() => {
    if (!formData && manualInputRef.current && !scanning) {
      manualInputRef.current.focus();
    }
  }, [formData, scanning]);

  const sessionIdRef = useRef<string | null>(null);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    return () => {
      if (sessionChannelRef.current) {
        sessionChannelRef.current.unsubscribe();
        sessionChannelRef.current = null;
      }
      if (sessionIdRef.current) {
        void deleteSession(sessionIdRef.current);
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (!code) return;
    processScannedCode(code);
  };

  const handleTestScan = () => {
    processScannedCode('TEST-SCAN-001');
  };

  const handleConnectMobile = async () => {
    const id = generateSessionId();
    const ok = await createSession(id);
    if (!ok) {
      setConnectionStatus('idle');
      return;
    }
    setSessionId(id);
    setConnectionStatus('waiting');
    setMobileModalOpen(true);

    const statusChannel = supabase
      .channel(`scan_session_${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'scan_sessions', filter: `id=eq.${id}` },
        (payload: any) => {
          if (payload.new?.status === 'connected') {
            setConnectionStatus('connected');
          } else if (payload.new?.status === 'disconnected') {
            setConnectionStatus('waiting');
          }
        }
      )
      .subscribe();

    const eventChannel = supabase
      .channel(`scan_events_${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'scan_events', filter: `session_id=eq.${id}` },
        (payload: any) => {
          const code = payload.new?.code as string;
          const eventId = payload.new?.id as string;
          if (code) {
            processScannedCode(code);
            setMobileModalOpen(false);
          }
          if (eventId) {
            void markScanReceived(eventId);
          }
        }
      )
      .subscribe();

    sessionChannelRef.current = {
      unsubscribe: () => {
        statusChannel.unsubscribe();
        eventChannel.unsubscribe();
      },
    };
  };

  const handleCloseMobileModal = async () => {
    setMobileModalOpen(false);
    if (sessionChannelRef.current) {
      sessionChannelRef.current.unsubscribe();
      sessionChannelRef.current = null;
    }
    if (sessionId) {
      await deleteSession(sessionId);
      await deleteSessionEvents(sessionId);
    }
    setSessionId(null);
    setConnectionStatus('idle');
  };

  const handleCopyLink = () => {
    if (!sessionId) return;
    const url = `${window.location.origin}/scanner/${sessionId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleConfirm = () => {
    if (!formData) return;
    if (!formData.sku_id || !formData.part_name || formData.qty < 1) return;
    onConfirm(formData);
    setFormData(null);
    setManualInput('');
    setTimeout(() => manualInputRef.current?.focus(), 50);
  };

  const handleCancel = () => {
    setFormData(null);
    setManualInput('');
    setTimeout(() => manualInputRef.current?.focus(), 50);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Scanner input bar */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
        <label className="block text-sm font-medium text-slate-600 mb-1">
          Barcode / QR Scanner Input
        </label>
        <p className="text-xs text-slate-400 mb-2">
          Scan with a handheld USB/wireless scanner gun or type a code and press Enter.
        </p>
        <form onSubmit={handleManualSubmit}>
          <div className="relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              ref={manualInputRef}
              type="text"
              placeholder="Scan or type barcode, then press Enter…"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-mono"
              autoFocus
            />
          </div>
        </form>
      </div>

      {/* Mobile Remote Scanner Card */}
      <div className="bg-gradient-to-br from-emerald-50 to-blue-50 rounded-lg shadow-sm border border-emerald-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center">
              <Smartphone size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-800">Mobile Remote Scanner & AI OCR</h3>
              <p className="text-xs text-slate-500">Scan barcodes or use AI camera to auto-fill label details</p>
            </div>
          </div>
          <button
            onClick={handleConnectMobile}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
          >
            <Smartphone size={16} /> Connect Mobile Scanner
          </button>
        </div>
      </div>

      {/* Camera scanner */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Camera size={18} className="text-emerald-600" />
            Camera Scanner
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestScan}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium"
              title="Simulate a scan to test the review workflow"
            >
              <FlaskConical size={16} /> Test Scan Example
            </button>
            {scanning ? (
              <button
                onClick={stopCamera}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
              >
                <CameraOff size={16} /> Stop Camera
              </button>
            ) : (
              <button
                onClick={startCamera}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
              >
                <Camera size={16} /> Start Camera
              </button>
            )}
          </div>
        </div>
        <div
          ref={scannerContainerRef}
          style={{ width: '100%', height: '300px' }}
          className="rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center"
        />
        {cameraError && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800 flex items-start gap-2">
            <CameraOff size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <span>{cameraError}</span>
          </div>
        )}
        {!scanning && !cameraError && (
          <div className="mt-3 text-center text-sm text-slate-400 flex items-center justify-center gap-1.5">
            <ScanLine size={16} />
            Click "Start Camera" to scan with your device camera
          </div>
        )}
      </div>

      {/* Mobile pairing modal */}
      {mobileModalOpen && sessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={handleCloseMobileModal}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-semibold text-center mb-1">Connect Mobile Scanner</h3>
            <p className="text-sm text-slate-500 text-center mb-4">
              Scan this QR code with your phone camera to open the mobile scanner
            </p>

            <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg mb-4 text-sm font-medium ${
              connectionStatus === 'connected'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-amber-100 text-amber-700'
            }`}>
              {connectionStatus === 'connected' ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Mobile Connected
                </>
              ) : (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Waiting for mobile connection…
                </>
              )}
            </div>

            <div className="flex justify-center mb-4">
              <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
                <QRCodeCanvas
                  value={`${window.location.origin}/scanner/${sessionId}`}
                  size={200}
                  level="M"
                  includeMargin={false}
                />
              </div>
            </div>

            <div className="text-center mb-3">
              <p className="text-xs text-slate-400 mb-1">Session ID</p>
              <p className="font-mono text-lg font-bold tracking-wider text-slate-700">{sessionId}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 text-sm font-medium mb-4"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              {copied ? 'Link Copied!' : 'Copy Scanner Link'}
            </button>

            {connectionStatus === 'connected' && (
              <p className="text-xs text-center text-slate-400">
                Scan products or labels on your phone — data will fill here automatically.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Editable review card */}
      {formData && (
        <div className="bg-white rounded-lg shadow-lg border-2 border-emerald-300 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-600" />
              {formData.isExisting ? 'Existing Product — Review & Add Stock' : 'Product Details (Auto-Filled)'}
            </h3>
            {formData.isExisting && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                Current Stock: {formData.existingProduct?.available_qty ?? 0}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">SKU / Part Number *</label>
              <input
                type="text"
                value={formData.sku_id}
                onChange={(e) => setFormData({ ...formData, sku_id: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Part Name *</label>
              <input
                type="text"
                value={formData.part_name}
                onChange={(e) => setFormData({ ...formData, part_name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Vehicle Model</label>
              <input
                type="text"
                value={formData.vehicle_model}
                onChange={(e) => setFormData({ ...formData, vehicle_model: e.target.value })}
                placeholder="e.g. Maruti Swift, Honda City…"
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Incoming Quantity *</label>
              <input
                ref={qtyInputRef}
                type="number"
                min="1"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Rack Location</label>
              <input
                type="text"
                value={formData.rack_location}
                onChange={(e) => setFormData({ ...formData, rack_location: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Cost Price (Purchase)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Selling Price (MRP)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.selling_price}
                onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">GST Rate (%)</label>
              <select
                value={formData.gst_rate}
                onChange={(e) => setFormData({ ...formData, gst_rate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value={0}>0%</option>
                <option value={4}>4%</option>
                <option value={9}>9%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-200">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
            >
              <X size={16} /> Cancel / Scan Next
            </button>
            <button
              onClick={handleConfirm}
              disabled={!formData.sku_id || !formData.part_name || formData.qty < 1}
              className="flex items-center gap-1 px-5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} /> Confirm & Add Stock
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
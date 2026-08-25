import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { connectSession, disconnectSession, sendScanEvent } from '../lib/scannerSession';
import { useScanner } from '../lib/useScanner';
import { scanLabelOcr } from '../lib/labelOcr';
import { ScanLine, Check, X, Camera, CameraOff, Wifi, ArrowLeft, AlertTriangle, Loader2, Keyboard, Sparkles } from 'lucide-react';

interface Props {
  sessionId: string;
}

export default function MobileScanner({ sessionId }: Props) {
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [mounted, setMounted] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const manualInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const sessionIdRef = useRef(sessionId);
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const handleScanResult = useCallback(
    async (decodedText: string) => {
      const code = decodedText.trim();
      if (!code) return;

      const now = Date.now();
      if (!code.startsWith('AI_LABEL_SCAN:') && code === lastScanRef.current.code && now - lastScanRef.current.time < 2000) {
        return;
      }
      lastScanRef.current = { code, time: now };

      // Feedback
      if (navigator.vibrate) {
        try { navigator.vibrate(200); } catch { /* ignore */ }
      }
      try {
        const beepCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = beepCtx.createOscillator();
        const gain = beepCtx.createGain();
        osc.connect(gain);
        gain.connect(beepCtx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, beepCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, beepCtx.currentTime + 0.2);
        osc.start();
        osc.stop(beepCtx.currentTime + 0.2);
      } catch {
        /* ignore */
      }

      try {
        await sendScanEvent(sessionIdRef.current, code);
        const display = code.startsWith('AI_LABEL_SCAN:') ? 'AI Smart Label Scanned' : code;
        setRecentScans((prev) => [display, ...prev].slice(0, 5));
      } catch {
        setRecentScans((prev) => [code, ...prev].slice(0, 5));
      }
    },
    []
  );

  const { scanning, cameraError, startCamera, stopCamera, scannerContainerRef } = useScanner(handleScanResult, {
    qrboxWidth: 250,
    qrboxHeight: 180,
  });

  // Capture video frame for AI OCR
  const handleOcrScan = async () => {
    setOcrError(null);
    const videoEl = scannerContainerRef.current?.querySelector('video');
    if (!videoEl) {
      setOcrError('Camera video stream active nahi hai.');
      return;
    }

    setOcrLoading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoEl.videoWidth || 640;
      canvas.height = videoEl.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      const ocrData = await scanLabelOcr(dataUrl);
      if (!ocrData || (!ocrData.sku_id && !ocrData.part_name && !ocrData.mrp)) {
        setOcrError('Label text clear nahi dikha. Camera ko label ke pass le jayein.');
        return;
      }

      await handleScanResult(`AI_LABEL_SCAN:${JSON.stringify(ocrData)}`);
    } catch (err: any) {
      setOcrError(err?.message || 'OCR processing failed');
    } finally {
      setOcrLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setSessionError('No session ID provided in the URL.');
      setConnecting(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const ok = await connectSession(sessionId);
        if (cancelled) return;
        if (ok) {
          setConnected(true);
        } else {
          setSessionError('Session expired. Rescan QR on desktop.');
        }
      } catch {
        if (cancelled) return;
        setSessionError('Server unreachable.');
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      try { void disconnectSession(sessionId); } catch {}
    };
  }, [sessionId]);

  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => { void startCamera(); }, 800);
    return () => clearTimeout(timer);
  }, [startCamera, mounted]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (!code) return;
    void handleScanResult(code);
    setManualInput('');
    setTimeout(() => manualInputRef.current?.focus(), 50);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => { void stopCamera(); window.location.href = '/'; }} className="p-2 -ml-2 text-slate-300">
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold flex items-center gap-2">
            <ScanLine size={20} className="text-emerald-400" />
            Remote Scanner
          </h1>
          <p className="text-xs text-slate-400">Session: {sessionId || '—'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-700 text-xs">
          {connecting ? <Loader2 size={14} className="text-amber-400 animate-spin" /> : connected ? <Wifi size={14} className="text-emerald-400" /> : <X size={14} className="text-red-400" />}
          <span>{connecting ? 'Connecting' : connected ? 'Connected' : 'Offline'}</span>
        </div>
      </div>

      {sessionError && (
        <div className="px-4 py-2 bg-red-900/60 border-b border-red-700 text-xs text-red-300 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" /> {sessionError}
        </div>
      )}

      {/* Manual Input */}
      <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700 shrink-0">
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={manualInputRef}
            type="text"
            placeholder="Type code manually..."
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
          />
          <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium">
            Send
          </button>
        </form>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          ref={scannerContainerRef}
          style={{ width: '100%', maxWidth: '400px', height: '280px', minHeight: '280px' }}
          className="rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-700"
        />

        {ocrError && (
          <div className="mt-2 w-full max-w-sm p-2.5 bg-amber-900/60 border border-amber-600 rounded-lg text-xs text-amber-200">
            {ocrError}
          </div>
        )}
      </div>

      {/* Controls & Smart AI OCR Button */}
      <div className="p-4 space-y-2.5 shrink-0 bg-slate-850 border-t border-slate-800">
        <button
          onClick={handleOcrScan}
          disabled={!scanning || ocrLoading}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {ocrLoading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} className="text-amber-300" />}
          <span>{ocrLoading ? 'Reading Label Data...' : '⚡ Smart AI Scan (Auto-Fill Label)'}</span>
        </button>

        <div className="flex gap-2">
          {scanning ? (
            <button onClick={stopCamera} className="flex-1 py-2.5 bg-red-600/80 rounded-lg text-sm font-medium">
              Stop Camera
            </button>
          ) : (
            <button onClick={startCamera} className="flex-1 py-2.5 bg-slate-700 rounded-lg text-sm font-medium">
              Start Camera
            </button>
          )}
        </div>
      </div>

      {/* Recent Scans */}
      <div className="px-4 pb-3">
        <div className="text-xs text-slate-400 mb-1">Recent:</div>
        <div className="space-y-1">
          {recentScans.map((s, i) => (
            <div key={i} className="text-xs bg-slate-800 p-2 rounded flex items-center gap-2 font-mono">
              <Check size={14} className="text-emerald-400" /> {s}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
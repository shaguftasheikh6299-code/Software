import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../lib/supabase';
import { connectSession, disconnectSession, sendScanEvent } from '../lib/scannerSession';
import { ScanLine, Check, X, Camera, CameraOff, Wifi, ArrowLeft } from 'lucide-react';

const READER_ID = 'mobile-reader';

interface Props {
  sessionId: string;
}

export default function MobileScanner({ sessionId }: Props) {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const initializedRef = useRef(false);
  const lastScanRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  // Connect the session on mount, disconnect on unmount
  useEffect(() => {
    (async () => {
      const ok = await connectSession(sessionId);
      setConnected(ok);
    })();

    return () => {
      disconnectSession(sessionId);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const stopCamera = useCallback(async () => {
    if (!scannerRef.current) {
      setScanning(false);
      return;
    }
    const instance = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    try {
      const state = instance.getState();
      if (state === 2) {
        await instance.stop();
      }
      instance.clear();
    } catch {
      try {
        instance.clear();
      } catch {
        // ignore
      }
    }
  }, []);

  const handleScanResult = useCallback(
    async (decodedText: string) => {
      const code = decodedText.trim();
      if (!code) return;

      // Dedupe rapid re-scans of the same code within 2 seconds
      const now = Date.now();
      if (code === lastScanRef.current.code && now - lastScanRef.current.time < 2000) {
        return;
      }
      lastScanRef.current = { code, time: now };

      // Haptic + audio feedback
      if (navigator.vibrate) {
        navigator.vibrate(200);
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
        // audio not critical
      }

      // Send to desktop via Supabase
      await sendScanEvent(sessionId, code);
      setRecentScans((prev) => [code, ...prev].slice(0, 5));
    },
    [sessionId]
  );

  const startCamera = useCallback(async () => {
    await stopCamera();
    setCameraError(null);

    const el = document.getElementById(READER_ID);
    if (!el) {
      setCameraError('Scanner container not found.');
      return;
    }
    if (initializedRef.current) return;

    try {
      const html5Qrcode = new Html5Qrcode(READER_ID, { verbose: false });
      scannerRef.current = html5Qrcode;
      initializedRef.current = true;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 180 },
        aspectRatio: 1.4,
      };

      try {
        await html5Qrcode.start(
          { facingMode: { ideal: 'environment' } },
          config,
          (decodedText) => { void handleScanResult(decodedText); },
          () => {}
        );
      } catch {
        await html5Qrcode.start(
          { facingMode: { ideal: 'user' } },
          config,
          (decodedText) => { void handleScanResult(decodedText); },
          () => {}
        );
      }
      setScanning(true);
    } catch {
      initializedRef.current = false;
      scannerRef.current = null;
      setScanning(false);
      setCameraError('Camera permission denied or camera not found. Please allow camera access in your browser settings.');
    }
  }, [handleScanResult, stopCamera]);

  // Auto-start camera on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      void startCamera();
    }, 500);
    return () => clearTimeout(timer);
  }, [startCamera]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => { void stopCamera(); window.location.href = '/'; }}
          className="p-2 -ml-2 text-slate-300 hover:text-white"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold flex items-center gap-2">
            <ScanLine size={20} className="text-emerald-400" />
            Mobile Scanner
          </h1>
          <p className="text-xs text-slate-400">Session: {sessionId}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-700 text-xs">
          <Wifi size={14} className={connected ? 'text-emerald-400' : 'text-slate-500'} />
          {connected ? <span className="text-emerald-400">Connected</span> : <span className="text-slate-400">Connecting…</span>}
        </div>
      </div>

      {/* Camera area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          id={READER_ID}
          style={{ width: '100%', maxWidth: '400px', height: '300px' }}
          className="rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-700"
        >
          {!scanning && !cameraError && (
            <div className="text-center text-slate-500">
              <ScanLine size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Starting camera…</p>
            </div>
          )}
        </div>

        {cameraError && (
          <div className="mt-4 w-full max-w-sm p-3 bg-amber-900/50 border border-amber-600 rounded-lg text-sm text-amber-200 flex items-start gap-2">
            <CameraOff size={18} className="shrink-0 mt-0.5 text-amber-400" />
            <span>{cameraError}</span>
          </div>
        )}

        {scanning && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Scanning… Point at a barcode
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 pb-3 shrink-0 flex gap-2">
        {scanning ? (
          <button
            onClick={stopCamera}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-600 text-white rounded-lg font-medium"
          >
            <CameraOff size={20} /> Stop Camera
          </button>
        ) : (
          <button
            onClick={startCamera}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-lg font-medium"
          >
            <Camera size={20} /> Start Camera
          </button>
        )}
      </div>

      {/* Recent scans */}
      <div className="px-4 pb-4 shrink-0">
        <h3 className="text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">Recent Scans</h3>
        {recentScans.length === 0 ? (
          <p className="text-sm text-slate-500">No scans yet — scanned codes will appear here and send to desktop instantly.</p>
        ) : (
          <div className="space-y-1.5">
            {recentScans.map((code, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg">
                <Check size={16} className="text-emerald-400 shrink-0" />
                <span className="text-sm font-mono flex-1">{code}</span>
                <span className="text-xs text-slate-500">Sent</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

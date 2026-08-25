import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { connectSession, disconnectSession, sendScanEvent } from '../lib/scannerSession';
import { useScanner } from '../lib/useScanner';
import { ScanLine, Check, X, Camera, CameraOff, Wifi, ArrowLeft, AlertTriangle, Loader2, Keyboard } from 'lucide-react';

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
      if (code === lastScanRef.current.code && now - lastScanRef.current.time < 2000) {
        return;
      }
      lastScanRef.current = { code, time: now };

      // Haptic feedback
      if (navigator.vibrate) {
        try { navigator.vibrate(200); } catch { /* ignore */ }
      }
      // Audio beep
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

      // Send to desktop
      try {
        await sendScanEvent(sessionIdRef.current, code);
        setRecentScans((prev) => [code, ...prev].slice(0, 5));
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

  // Mark component as mounted so we know the DOM is ready
  useEffect(() => {
    setMounted(true);
  }, []);

  // Connect the session on mount — safe try/catch, never crashes
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
          setSessionError('Failed to connect to desktop session. The session may have expired — please rescan the QR code on the desktop.');
        }
      } catch {
        if (cancelled) return;
        setSessionError('Unable to reach the server. Check your internet connection and try again.');
      } finally {
        if (!cancelled) setConnecting(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        void disconnectSession(sessionId);
      } catch {
        // ignore
      }
    };
  }, [sessionId]);

  // Auto-start camera after mount with a delay to ensure DOM is ready
  useEffect(() => {
    if (!mounted) return;
    const timer = setTimeout(() => {
      void startCamera();
    }, 800);
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

  const goHome = () => {
    void stopCamera();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header — always visible immediately */}
      <div className="bg-slate-800 px-4 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={goHome}
          className="p-2 -ml-2 text-slate-300 hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-semibold flex items-center gap-2">
            <ScanLine size={20} className="text-emerald-400" />
            Remote Scanner Active
          </h1>
          <p className="text-xs text-slate-400">Session: {sessionId || '—'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-slate-700 text-xs shrink-0">
          {connecting ? (
            <>
              <Loader2 size={14} className="text-amber-400 animate-spin" />
              <span className="text-amber-400">Connecting…</span>
            </>
          ) : connected ? (
            <>
              <Wifi size={14} className="text-emerald-400" />
              <span className="text-emerald-400">Connected</span>
            </>
          ) : (
            <>
              <X size={14} className="text-red-400" />
              <span className="text-red-400">Offline</span>
            </>
          )}
        </div>
      </div>

      {/* Session error banner */}
      {sessionError && (
        <div className="px-4 py-3 bg-red-900/60 border-b border-red-700 flex items-start gap-2 shrink-0">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="text-sm text-red-200 font-medium">Connection Error</p>
            <p className="text-xs text-red-300 mt-0.5">{sessionError}</p>
          </div>
        </div>
      )}

      {/* Manual barcode input — visible immediately */}
      <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700 shrink-0">
        <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
          <Keyboard size={14} /> Manual Barcode Input
        </label>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={manualInputRef}
            type="text"
            placeholder="Type or scan barcode, press Enter…"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            className="flex-1 px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm shrink-0"
          >
            Send
          </button>
        </form>
      </div>

      {/* Camera area — isolated container, React renders NO children inside */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div
          ref={scannerContainerRef}
          style={{ width: '100%', maxWidth: '400px', height: '300px', minHeight: '300px' }}
          className="rounded-xl overflow-hidden bg-black flex items-center justify-center border border-slate-700"
        />

        {!scanning && !cameraError && (
          <div className="mt-4 text-center text-slate-500">
            {mounted ? (
              <>
                <Loader2 size={28} className="mx-auto mb-2 animate-spin text-emerald-500" />
                <p className="text-sm">Starting camera…</p>
              </>
            ) : (
              <>
                <ScanLine size={36} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading scanner…</p>
              </>
            )}
          </div>
        )}

        {cameraError && (
          <div className="mt-4 w-full max-w-sm p-3 bg-amber-900/50 border border-amber-600 rounded-lg text-sm text-amber-200 flex items-start gap-2">
            <CameraOff size={18} className="shrink-0 mt-0.5 text-amber-400" />
            <span>{cameraError}</span>
          </div>
        )}

        {scanning && (
          <div className="mt-3 flex items-center gap-2 text-sm text-emerald-400 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            Scanning — point at a barcode
          </div>
        )}
      </div>

      {/* Camera controls */}
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

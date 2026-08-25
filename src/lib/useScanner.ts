import { useState, useRef, useCallback, useEffect } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface ScannerConfig {
  fps?: number;
  qrboxWidth?: number;
  qrboxHeight?: number;
}

interface UseScannerResult {
  scanning: boolean;
  cameraError: string | null;
  startCamera: (config?: ScannerConfig) => Promise<void>;
  stopCamera: () => Promise<void>;
  scannerContainerRef: React.RefObject<HTMLDivElement>;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export function useScanner(onScan: (code: string) => void, defaultConfig?: ScannerConfig): UseScannerResult {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const innerDivRef = useRef<HTMLDivElement | null>(null);
  const isStartingRef = useRef(false);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopCamera = useCallback(async () => {
    const instance = html5QrCodeRef.current;
    if (!instance) {
      setScanning(false);
      return;
    }

    html5QrCodeRef.current = null;
    setScanning(false);

    try {
      if (instance.isScanning) {
        await instance.stop();
      }
    } catch {
      // ignore
    }

    try {
      instance.clear();
    } catch {
      // ignore
    }

    if (innerDivRef.current && scannerContainerRef.current) {
      try {
        scannerContainerRef.current.removeChild(innerDivRef.current);
      } catch {
        // ignore
      }
    }
    innerDivRef.current = null;
  }, []);

  const startCamera = useCallback(async (config?: ScannerConfig) => {
    if (scanning || isStartingRef.current) return;
    isStartingRef.current = true;
    setCameraError(null);

    await stopCamera();

    const container = scannerContainerRef.current;
    if (!container) {
      setCameraError('Scanner container not found. Please reload.');
      isStartingRef.current = false;
      return;
    }

    // Isolated DOM element
    const innerId = `scanner-box-${Date.now()}`;
    const innerDiv = document.createElement('div');
    innerDiv.id = innerId;
    innerDiv.style.width = '100%';
    innerDiv.style.height = '100%';
    container.appendChild(innerDiv);
    innerDivRef.current = innerDiv;

    const mergedConfig = { ...defaultConfig, ...config };
    const qrConfig = {
      fps: mergedConfig.fps ?? 10,
      qrbox: {
        width: mergedConfig.qrboxWidth ?? 250,
        height: mergedConfig.qrboxHeight ?? 180,
      },
      aspectRatio: 1.2,
    };

    const scanCallback = (decodedText: string) => {
      const code = decodedText.trim();
      if (code) {
        onScanRef.current(code);
      }
    };

    try {
      const scanner = new Html5Qrcode(innerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      html5QrCodeRef.current = scanner;

      let started = false;

      // Method 1: Direct Environment (Mobile Back Camera)
      try {
        await scanner.start('environment', qrConfig, scanCallback, () => {});
        started = true;
      } catch (err1) {
        console.warn('Environment facing mode failed, checking camera list...', err1);
      }

      // Method 2: Camera List Selection Fallback
      if (!started) {
        try {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            // Pick back camera if present or last device
            const backCam = cameras.find((c) => /back|rear|environment/i.test(c.label)) || cameras[cameras.length - 1];
            await scanner.start(backCam.id, qrConfig, scanCallback, () => {});
            started = true;
          }
        } catch (err2) {
          console.warn('Camera device listing failed...', err2);
        }
      }

      // Method 3: User/Front camera Fallback
      if (!started) {
        await scanner.start('user', qrConfig, scanCallback, () => {});
        started = true;
      }

      if (started) {
        setScanning(true);
      }
    } catch (finalError: any) {
      console.error('All camera startup methods failed:', finalError);
      html5QrCodeRef.current = null;
      setScanning(false);
      setCameraError(finalError?.message || 'Unable to open camera. Please check camera access.');

      if (innerDivRef.current && container) {
        try {
          container.removeChild(innerDivRef.current);
        } catch {
          // ignore
        }
      }
      innerDivRef.current = null;
    } finally {
      isStartingRef.current = false;
    }
  }, [stopCamera, defaultConfig, scanning]);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  return {
    scanning,
    cameraError,
    startCamera,
    stopCamera,
    scannerContainerRef,
  };
}
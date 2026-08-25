import { useState, useRef, useCallback, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

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

export function useScanner(onScan: (code: string) => void, defaultConfig?: ScannerConfig): UseScannerResult {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const innerDivRef = useRef<HTMLDivElement | null>(null);
  const onScanRef = useRef(onScan);

  // Keep the latest onScan callback without re-triggering camera restart
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
      const state = instance.getState();
      // 2 === SCANNING
      if (state === 2) {
        await instance.stop();
      }
    } catch {
      // ignore stop errors
    }

    try {
      instance.clear();
    } catch {
      // ignore clear errors
    }

    // Remove the imperatively-created inner div so React never sees it
    if (innerDivRef.current && scannerContainerRef.current) {
      try {
        scannerContainerRef.current.removeChild(innerDivRef.current);
      } catch {
        // already removed or not a child — ignore
      }
    }
    innerDivRef.current = null;
  }, []);

  const startCamera = useCallback(async (config?: ScannerConfig) => {
    await stopCamera();
    setCameraError(null);

    const container = scannerContainerRef.current;
    if (!container) {
      setCameraError('Scanner container not found. Please reload the page.');
      return;
    }

    // Create an isolated inner div that React will never reconcile.
    // html5-qrcode injects video/canvas nodes here, and we remove the
    // entire div on cleanup so React's virtual DOM never encounters them.
    const innerId = `scanner-inner-${Date.now()}`;
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
        width: mergedConfig.qrboxWidth ?? 280,
        height: mergedConfig.qrboxHeight ?? 200,
      },
      aspectRatio: 1.4,
    };

    const scanCallback = (decodedText: string) => {
      const code = decodedText.trim();
      if (code) {
        onScanRef.current(code);
      }
    };

    try {
      const html5Qrcode = new Html5Qrcode(innerId, { verbose: false });
      html5QrCodeRef.current = html5Qrcode;

      try {
        await html5Qrcode.start(
          { facingMode: { ideal: 'environment' } },
          qrConfig,
          scanCallback,
          () => {}
        );
      } catch {
        await html5Qrcode.start(
          { facingMode: { ideal: 'user' } },
          qrConfig,
          scanCallback,
          () => {}
        );
      }

      setScanning(true);
    } catch {
      html5QrCodeRef.current = null;
      setScanning(false);
      setCameraError(
        'Camera permission denied or camera not found. You can still use the barcode gun or type manually.'
      );
      // Clean up the inner div we created
      if (innerDivRef.current && container) {
        try {
          container.removeChild(innerDivRef.current);
        } catch {
          // ignore
        }
      }
      innerDivRef.current = null;
    }
  }, [stopCamera, defaultConfig]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const instance = html5QrCodeRef.current;
      html5QrCodeRef.current = null;

      if (instance) {
        instance
          .stop()
          .then(() => instance.clear())
          .catch(() => {
            try {
              instance.clear();
            } catch {
              // fully ignore
            }
          });
      }

      if (innerDivRef.current && scannerContainerRef.current) {
        try {
          scannerContainerRef.current.removeChild(innerDivRef.current);
        } catch {
          // ignore
        }
      }
      innerDivRef.current = null;
    };
  }, []);

  return {
    scanning,
    cameraError,
    startCamera,
    stopCamera,
    scannerContainerRef,
  };
}

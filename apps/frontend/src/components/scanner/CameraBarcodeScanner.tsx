import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

export interface ScanResult {
  code: string;
  status: "searching" | "found" | "not_found";
  productName?: string;
}

interface CameraBarcodeScannerProps {
  /** Called when a barcode is successfully decoded */
  onScan: (code: string) => void;
  /** Called to close/hide the scanner */
  onClose: () => void;
  /** Whether the scanner modal is visible */
  isOpen: boolean;
  /** Live scan result feedback to display inside the scanner */
  scanResult?: ScanResult | null;
}

// Only retail-relevant barcode formats for fast scanning
const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.CODE_93,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
];

export default function CameraBarcodeScanner({
  onScan,
  onClose,
  isOpen,
  scanResult,
}: CameraBarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScanRef = useRef<string>("");
  const lastScanTimeRef = useRef<number>(0);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const mountedRef = useRef(true);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // Silently handle cleanup errors
    }
    if (mountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  const startScanner = useCallback(async () => {
    if (!containerRef.current || scannerRef.current) return;

    setError(null);
    setScanCount(0);
    lastScanRef.current = "";

    try {
      const scannerId = "stockpilot-barcode-reader";
      let el = document.getElementById(scannerId);
      if (!el && containerRef.current) {
        const div = document.createElement("div");
        div.id = scannerId;
        containerRef.current.appendChild(div);
        el = div;
      }

      if (!el) {
        setError("Scanner container not found.");
        return;
      }

      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.5,
          disableFlip: false,
        },
        (decodedText) => {
          const now = Date.now();
          // Debounce: ignore same code scanned within 3 seconds
          if (
            decodedText === lastScanRef.current &&
            now - lastScanTimeRef.current < 3000
          ) {
            return;
          }
          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;

          if (mountedRef.current) {
            setScanCount((c) => c + 1);
          }

          // Vibrate for haptic feedback (mobile)
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }

          // Fire callback — parent will handle lookup and set scanResult
          onScan(decodedText);
        },
        () => {
          // Scan frame failure — don't log, this fires every frame
        }
      );

      if (mountedRef.current) {
        setIsScanning(true);
      }
    } catch (err: any) {
      const message = err?.message || String(err);
      if (message.includes("NotAllowedError") || message.includes("Permission")) {
        setError(
          "Camera permission denied. Please allow camera access in your browser settings and try again."
        );
      } else if (message.includes("NotFoundError") || message.includes("no camera")) {
        setError(
          "No camera found on this device. Make sure your device has a camera connected."
        );
      } else {
        setError(`Camera error: ${message}`);
      }
    }
  }, [onScan]);

  // Start scanner when modal opens, stop on close
  useEffect(() => {
    mountedRef.current = true;

    if (isOpen) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          startScanner();
        }
      }, 300);
      return () => {
        clearTimeout(timer);
        mountedRef.current = false;
        stopScanner();
      };
    } else {
      stopScanner();
      return () => {
        mountedRef.current = false;
      };
    }
  }, [isOpen, startScanner, stopScanner]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-lg">
      <div className="w-full max-w-sm rounded-2xl bg-[#0c0c10] border border-[#d4a853]/40 shadow-2xl shadow-[#d4a853]/10 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#d4a853] to-[#f5cf7b] flex items-center justify-center text-[#0c0c0e] text-sm">
              📷
            </div>
            <div>
              <h2 className="text-xs font-bold text-[#f4f4f5]">
                Scan Barcode
              </h2>
              <p className="text-[10px] text-[#71717a]">
                Point camera at product barcode
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {scanCount > 0 && (
              <span className="text-[10px] font-mono text-[#d4a853] bg-[#d4a853]/10 px-2 py-0.5 rounded">
                {scanCount} scanned
              </span>
            )}
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#97979d] hover:text-[#f4f4f5] transition-colors cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Camera View */}
        <div className="relative bg-black" style={{ minHeight: 240 }}>
          <div ref={containerRef} className="w-full">
            <div id="stockpilot-barcode-reader" />
          </div>

          {/* Scanning overlay animation */}
          {isScanning && !error && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative" style={{ width: 260, height: 150 }}>
                <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#d4a853] rounded-tl" />
                <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#d4a853] rounded-tr" />
                <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#d4a853] rounded-bl" />
                <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#d4a853] rounded-br" />
                <div
                  className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-[#d4a853] to-transparent opacity-80"
                  style={{
                    animation: "scanline 2s ease-in-out infinite",
                    top: "50%",
                  }}
                />
              </div>
            </div>
          )}

          {/* Loading state */}
          {!isScanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0c0c10]">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto rounded-full border-2 border-[#d4a853]/30 border-t-[#d4a853] animate-spin mb-2" />
                <span className="text-[11px] text-[#71717a]">
                  Activating camera...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="px-4 py-2.5 bg-rose-500/10 border-t border-rose-500/20">
            <p className="text-[11px] text-rose-300 leading-relaxed">{error}</p>
            <button
              onClick={() => {
                stopScanner().then(() => startScanner());
              }}
              className="mt-1.5 px-3 py-1 rounded-lg text-[11px] font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition-colors cursor-pointer"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Live Scan Result Feedback — This is the key UX! */}
        {scanResult && (
          <div
            className={`px-4 py-2.5 border-t flex items-center gap-2 transition-all ${
              scanResult.status === "found"
                ? "bg-emerald-500/15 border-emerald-500/30"
                : scanResult.status === "not_found"
                ? "bg-amber-500/15 border-amber-500/30"
                : "bg-blue-500/10 border-blue-500/20"
            }`}
          >
            {scanResult.status === "searching" && (
              <>
                <div className="w-3 h-3 rounded-full border border-blue-400/50 border-t-blue-400 animate-spin shrink-0" />
                <span className="text-[11px] text-blue-300">
                  Looking up <span className="font-mono font-bold">{scanResult.code}</span>...
                </span>
              </>
            )}
            {scanResult.status === "found" && (
              <>
                <span className="text-sm shrink-0">✅</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-emerald-300 truncate">
                    {scanResult.productName || "Product added"}
                  </div>
                  <div className="text-[10px] text-emerald-400/70 font-mono">
                    {scanResult.code} → Added to cart
                  </div>
                </div>
              </>
            )}
            {scanResult.status === "not_found" && (
              <>
                <span className="text-sm shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-amber-300">
                    Product not found
                  </div>
                  <div className="text-[10px] text-amber-400/70 font-mono truncate">
                    {scanResult.code} — not in your store catalog
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Minimal footer */}
        <div className="px-4 py-2 border-t border-white/5 text-[10px] text-[#52525b]">
          Hold steady · Barcode detected automatically · EAN-13, UPC, Code128, QR
        </div>
      </div>

      {/* Scanline animation keyframes */}
      <style>{`
        @keyframes scanline {
          0%, 100% { top: 15%; opacity: 0.5; }
          50% { top: 85%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}

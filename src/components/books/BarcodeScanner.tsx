'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

import { normalizeIsbn } from '@/lib/books/isbn';

export interface BarcodeScannerProps {
  onDetected: (isbn: string) => void;
  onCancel: () => void;
  onManualEntry: () => void;
}

type ScannerMode = 'scanning' | 'denied' | 'no-camera' | 'timeout' | 'detected';

// Book barcodes are EAN-13; restrict the decoder so unrelated 1D/2D symbologies
// don't slow the scan or produce noise.
const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13]],
]);

// Give up if nothing decodes in this window and offer the manual fallback.
const DECODE_TIMEOUT_MS = 30_000;
// Brief success confirmation before handing the ISBN back to the search flow.
const SUCCESS_FEEDBACK_MS = 900;

function classifyCameraError(error: unknown): Exclude<ScannerMode, 'scanning' | 'detected'> {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return 'denied';
    }
  }
  // NotFoundError (no camera), NotReadableError (camera busy),
  // OverconstrainedError (no environment-facing camera), and anything else all
  // land the user on the manual-entry fallback.
  return 'no-camera';
}

export function BarcodeScanner({
  onDetected,
  onCancel,
  onManualEntry,
}: BarcodeScannerProps): React.JSX.Element {
  const [mode, setMode] = useState<ScannerMode>('scanning');
  const [detectedIsbn, setDetectedIsbn] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the latest onDetected without re-arming the success timer on every
  // parent re-render.
  const onDetectedRef = useRef(onDetected);
  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Camera lifecycle: runs only in scanning mode and always releases the stream
  // on cleanup (unmount, cancel, detection, or error) so no camera indicator
  // lingers.
  useEffect(() => {
    if (mode !== 'scanning') {
      return;
    }

    let cancelled = false;
    const reader = new BrowserMultiFormatReader(HINTS);

    function releaseStream(): void {
      controlsRef.current?.stop();
      controlsRef.current = null;
    }

    function clearDecodeTimeout(): void {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    async function start(): Promise<void> {
      const video = videoRef.current;

      if (!video) {
        return;
      }

      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: 'environment' } },
          video,
          (result) => {
            if (cancelled || !result) {
              return;
            }

            const isbn = normalizeIsbn(result.getText());

            if (!isbn) {
              // Not a book barcode — keep scanning.
              return;
            }

            clearDecodeTimeout();
            releaseStream();
            setDetectedIsbn(isbn);
            setMode('detected');
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }

        controlsRef.current = controls;
        timeoutRef.current = setTimeout(() => {
          if (cancelled) {
            return;
          }
          releaseStream();
          setMode('timeout');
        }, DECODE_TIMEOUT_MS);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setMode(classifyCameraError(error));
      }
    }

    void start();

    return () => {
      cancelled = true;
      clearDecodeTimeout();
      releaseStream();
    };
  }, [mode]);

  // After a decode, show the confirmation briefly, then hand the ISBN to the
  // search flow.
  useEffect(() => {
    if (mode !== 'detected' || !detectedIsbn) {
      return;
    }

    const timer = setTimeout(() => onDetectedRef.current(detectedIsbn), SUCCESS_FEEDBACK_MS);

    return () => clearTimeout(timer);
  }, [mode, detectedIsbn]);

  function retry(): void {
    setDetectedIsbn(null);
    setMode('scanning');
  }

  if (mode === 'detected' && detectedIsbn) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-4 bg-background px-9 text-center">
        <div className="flex h-[84px] w-[84px] items-center justify-center rounded-full bg-read text-background shadow-[0_10px_30px_rgba(48,209,88,0.35)]">
          <svg
            width="46"
            height="46"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <h3 className="text-[19px] font-bold text-primary">Barcode detected</h3>
        <p className="font-mono text-[15px] tracking-wide text-read">ISBN {detectedIsbn}</p>
        <p className="text-[13px] text-tertiary">Opening book…</p>
      </div>
    );
  }

  if (mode === 'scanning') {
    return (
      <div className="fixed inset-0 z-[80] overflow-hidden bg-black">
        <video
          ref={videoRef}
          aria-label="Camera preview"
          muted
          playsInline
          className="h-full w-full object-cover"
        />

        {/* Reticle window — the large box-shadow scrims everything outside it,
            leaving the 300×180 scan window clear over the live feed. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[180px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-lg shadow-[0_0_0_100vmax_rgba(5,5,6,0.62)]">
          <span className="absolute left-0 top-0 h-[30px] w-[30px] rounded-tl-lg border-l-4 border-t-4 border-white" />
          <span className="absolute right-0 top-0 h-[30px] w-[30px] rounded-tr-lg border-r-4 border-t-4 border-white" />
          <span className="absolute bottom-0 left-0 h-[30px] w-[30px] rounded-bl-lg border-b-4 border-l-4 border-white" />
          <span className="absolute bottom-0 right-0 h-[30px] w-[30px] rounded-br-lg border-b-4 border-r-4 border-white" />
          <span className="absolute inset-x-2.5 top-1/2 h-0.5 rounded-full bg-accent shadow-[0_0_12px_2px_rgba(10,132,255,0.8)]" />
        </div>

        <p className="absolute inset-x-0 top-[calc(50%+120px)] px-10 text-center text-[15px] font-medium text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]">
          Point at the barcode on the back cover
        </p>

        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel scan"
          className="absolute left-3 top-[calc(0.5rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center text-white"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+42px)] flex justify-center">
          <button
            type="button"
            onClick={onManualEntry}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-surface-1/70 px-[18px] py-2.5 text-[15px] font-semibold text-white backdrop-blur"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8" />
            </svg>
            Enter ISBN manually
          </button>
        </div>
      </div>
    );
  }

  // denied / no-camera / timeout share the centered state layout.
  const isDenied = mode === 'denied';
  const isTimeout = mode === 'timeout';

  const heading = isDenied
    ? 'Camera access needed'
    : isTimeout
      ? 'No barcode found'
      : 'No camera available';

  const body = isDenied
    ? 'To scan a barcode, allow camera access for BookTracker in your device Settings. You can also add the book by typing its ISBN.'
    : isTimeout
      ? "We couldn't read a barcode. Try holding the camera steady over the back cover, or type the ISBN instead."
      : "This device has no camera we can use. You can add the book by typing its ISBN.";

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      <button
        type="button"
        onClick={onCancel}
        aria-label="Close"
        className="absolute left-3 top-[calc(0.5rem+env(safe-area-inset-top))] flex h-11 w-11 items-center justify-center text-accent"
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 pb-16 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-surface-1 text-secondary">
          {isDenied ? (
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" />
              <path d="M2 2l20 20" />
            </svg>
          ) : (
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="4" y="6" width="16" height="12" rx="2" />
              <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8" />
            </svg>
          )}
        </div>
        <h3 className="text-[20px] font-bold text-primary">{heading}</h3>
        <p className="max-w-[300px] text-[15px] leading-snug text-secondary">{body}</p>

        <button
          type="button"
          onClick={onManualEntry}
          className="mt-2 flex min-h-[50px] w-full max-w-[320px] items-center justify-center gap-2 rounded-[10px] bg-accent text-base font-semibold text-white"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="4" y="6" width="16" height="12" rx="2" />
            <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h8" />
          </svg>
          Enter ISBN manually
        </button>

        {isDenied || isTimeout ? (
          <button
            type="button"
            onClick={retry}
            className="min-h-[50px] w-full max-w-[320px] text-base font-medium text-accent"
          >
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

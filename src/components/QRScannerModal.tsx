'use client';

import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';

export function QRScannerModal({ open, onClose, onScan }: { open: boolean; onClose: () => void; onScan?: (batchCode: string) => void }) {
  const router = useRouter();
  const scannerId = useId().replace(/:/g, '');
  const scanner = useRef<Html5Qrcode | null>(null);
  const startAttempted = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const [error, setError] = useState('');

  function goToTrace(value: string) {
    const cleaned = value.trim();
    const match = cleaned.match(/\/trace\/([^/?#]+)/i);
    const batchCode = decodeURIComponent(match?.[1] ?? cleaned);

    if (!batchCode) {
      setError('Enter a valid Batch ID.');
      return;
    }

    onClose();
    if (onScan) onScan(batchCode);
    else router.push(`/trace/${encodeURIComponent(batchCode)}`);
  }

  useEffect(() => {
    if (!open) {
      startAttempted.current = false;
      setError('');
      return;
    }

    if (startAttempted.current) return;
    startAttempted.current = true;

    let active = true;

    const stopScanner = async (instance: Html5Qrcode | null) => {
      if (!instance) return;

      try {
        if (instance.isScanning) await instance.stop();
      } catch {
        // Ignore cleanup errors from a stale camera instance.
      }

      try {
        await instance.clear();
      } catch {
        // Ignore clear errors from a stale camera instance.
      }
    };

    const start = async () => {
      try {
        if (scanner.current) {
          await stopScanner(scanner.current);
          scanner.current = null;
        }

        const instance = new Html5Qrcode(scannerId);
        scanner.current = instance;

        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (active) goToTrace(text);
          },
          () => undefined,
        );
      } catch {
        if (active) {
          setError('Camera access is unavailable. Enter the Batch ID manually.');
        }
      }
    };

    void start();

    return () => {
      active = false;
      const instance = scanner.current;
      scanner.current = null;
      void stopScanner(instance);
    };
  }, [open, scannerId]);

  if (!open) return null;

  function submitManual(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    goToTrace(manualCode);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Scan food QR code</h2>
          <button onClick={onClose} className="text-slate-500">Close</button>
        </div>
        <div id={scannerId} className="mt-4 overflow-hidden rounded-lg" />
        {error && <p className="mt-3 rounded bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <form onSubmit={submitManual} className="mt-4 space-y-2">
          <label className="font-semibold">Or enter Batch ID</label>
          <input value={manualCode} onChange={(event) => setManualCode(event.target.value)} placeholder="SK-2026-X1Y2" className="w-full rounded-lg border border-slate-300 p-3" />
          <button type="submit" className="w-full rounded-lg bg-green-700 py-3 font-bold text-white">Trace batch</button>
        </form>
      </div>
    </div>
  );
}

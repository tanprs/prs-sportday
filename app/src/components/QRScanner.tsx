"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";

// กล้องสแกน QR ทั่วไป — ใช้ getUserMedia + jsQR ถอดรหัสเฟรมวิดีโอบน <canvas>
// ที่มองไม่เห็น (ไม่ใช้ BarcodeDetector เพราะ Safari/iOS ยังไม่รองรับ ซึ่งเป็น
// เบราว์เซอร์หลักที่นักเรียน/ครูจะใช้สแกนในสนาม)
//
// กันสแกนซ้ำรัว ๆ ขณะ QR ตัวเดิมยังอยู่ในเฟรม ด้วย cooldown ต่อรหัส

const RESCAN_COOLDOWN_MS = 2000;

// คอมโพเนนต์นี้ตั้งใจให้ parent mount/unmount ตาม state เปิด-ปิดกล้อง (เช่น
// {scanning && <QRScanner ... />}) แทนการส่ง prop "active" เข้ามาสลับ —
// เพื่อให้ error/ready เริ่มต้นค่าใหม่ตาม useState initializer ของการ mount
// รอบใหม่เอง ไม่ต้องเรียก setState สด ๆ ในตัว effect (ติด lint
// react-hooks/set-state-in-effect และเป็น anti-pattern ตามแนวทาง React)
export function QRScanner({ onScan }: { onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastScanRef = useRef<{ text: string; at: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
        tick();
      } catch (err) {
        setError(
          "เปิดกล้องไม่ได้ — ตรวจสอบว่าอนุญาตให้เว็บนี้ใช้กล้องแล้ว (" +
            (err instanceof Error ? err.message : String(err)) +
            ")"
        );
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(frame.data, frame.width, frame.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data) {
        const now = Date.now();
        const last = lastScanRef.current;
        if (!last || last.text !== code.data || now - last.at > RESCAN_COOLDOWN_MS) {
          lastScanRef.current = { text: code.data, at: now };
          onScan(code.data);
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} className="w-full" muted playsInline />
        {ready && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1/2 w-1/2 rounded-lg border-4 border-emerald-400/80" />
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && !ready && (
        <p className="text-sm text-slate-500">กำลังเปิดกล้อง...</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

type Checkin = { name: string };

type Props = {
  matchId: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string;
  teamBName: string;
  teamACheckedIn: boolean;
  teamBCheckedIn: boolean;
  required: number | null;
  initialCheckinsA: Checkin[];
  initialCheckinsB: Checkin[];
};

type ScanResult = {
  type: "success" | "already" | "error";
  message: string;
  slot?: "a" | "b";
};

export function CheckinScanner({
  matchId,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
  teamACheckedIn: initA,
  teamBCheckedIn: initB,
  required,
  initialCheckinsA,
  initialCheckinsB,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastQrRef = useRef<string | null>(null); // debounce: หลีกเลี่ยงสแกนซ้ำทันที
  const lastQrTime = useRef<number>(0);

  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [checkinsA, setCheckinsA] = useState<Checkin[]>(initialCheckinsA);
  const [checkinsB, setCheckinsB] = useState<Checkin[]>(initialCheckinsB);
  const [checkedInA, setCheckedInA] = useState(initA);
  const [checkedInB, setCheckedInB] = useState(initB);
  const [processing, setProcessing] = useState(false);

  const countA = checkinsA.length;
  const countB = checkinsB.length;

  // ── ส่ง QR ไปยัง API ────────────────────────────────────────────────────
  const processQr = useCallback(
    async (qr: string) => {
      if (processing) return;
      // debounce 3 วินาทีต่อ QR เดิม
      const now = Date.now();
      if (qr === lastQrRef.current && now - lastQrTime.current < 3000) return;
      lastQrRef.current = qr;
      lastQrTime.current = now;

      setProcessing(true);
      try {
        const res = await fetch("/api/checkin/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ match_id: matchId, qr_code: qr }),
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          setLastResult({ type: "error", message: json.message ?? "เกิดข้อผิดพลาด" });
        } else if (json.already) {
          setLastResult({
            type: "already",
            message: `${json.student_name} เคยสแกนแล้ว`,
            slot: json.slot,
          });
        } else {
          setLastResult({
            type: "success",
            message: `✓ ${json.student_name}`,
            slot: json.slot,
          });
          // อัปเดต checkin list
          if (json.slot === "a") {
            setCheckinsA((prev) => [...prev, { name: json.student_name }]);
            if (json.auto_checked_in) setCheckedInA(true);
          } else {
            setCheckinsB((prev) => [...prev, { name: json.student_name }]);
            if (json.auto_checked_in) setCheckedInB(true);
          }
        }
      } catch {
        setLastResult({ type: "error", message: "เชื่อมต่อ server ไม่ได้" });
      } finally {
        setProcessing(false);
      }
    },
    [matchId, processing]
  );

  // ── เปิดกล้อง ────────────────────────────────────────────────────────────
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
      }
    } catch {
      setCameraError("ไม่สามารถเปิดกล้องได้ — ตรวจสอบว่าเบราว์เซอร์ได้รับอนุญาตใช้กล้อง");
    }
  }

  function stopCamera() {
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    setScanning(false);
  }

  // ── scan loop (jsQR ผ่าน CDN ที่โหลดใน useEffect) ───────────────────────
  useEffect(() => {
    if (!scanning) return;

    // โหลด jsQR จาก CDN ครั้งเดียว
    let jsQR: ((data: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

    const scriptId = "jsqr-script";
    const load = () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      jsQR = (window as any).jsQR ?? null;
      startLoop();
    };

    if (!(window as any).jsQR) { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (!document.getElementById(scriptId)) {
        const s = document.createElement("script");
        s.id = scriptId;
        s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
        s.onload = load;
        document.head.appendChild(s);
      } else {
        // รอ script โหลด
        const wait = setInterval(() => {
          if ((window as any).jsQR) { // eslint-disable-line @typescript-eslint/no-explicit-any
            clearInterval(wait);
            load();
          }
        }, 100);
      }
    } else {
      load();
    }

    function startLoop() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const tick = () => {
        if (video.readyState === video.HAVE_ENOUGH_DATA && jsQR) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code?.data) {
              processQr(code.data);
            }
          }
        }
        scanLoopRef.current = requestAnimationFrame(tick);
      };
      scanLoopRef.current = requestAnimationFrame(tick);
    }

    return () => {
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [scanning, processQr]);

  useEffect(() => stopCamera, []); // cleanup เมื่อออกจากหน้า

  // ── render ───────────────────────────────────────────────────────────────
  const resultColor =
    lastResult?.type === "success"
      ? "bg-emerald-50 border-emerald-300 text-emerald-800"
      : lastResult?.type === "already"
      ? "bg-amber-50 border-amber-300 text-amber-800"
      : "bg-red-50 border-red-300 text-red-800";

  return (
    <div className="space-y-4">
      {/* ── กล้อง ── */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-black aspect-video relative max-h-72">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startCamera}
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-500"
            >
              📷 เปิดกล้องสแกน QR
            </button>
          </div>
        )}
        {scanning && (
          <div className="absolute top-2 right-2">
            <button
              onClick={stopCamera}
              className="rounded-lg bg-black/50 px-3 py-1 text-xs text-white hover:bg-black/70"
            >
              ปิดกล้อง
            </button>
          </div>
        )}
        {scanning && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-lg bg-black/50 px-3 py-1 text-xs text-white">
            {processing ? "กำลังตรวจสอบ..." : "🔍 กำลังสแกน..."}
          </div>
        )}
      </div>

      {cameraError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cameraError}
        </p>
      )}

      {/* ── ผลสแกนล่าสุด ── */}
      {lastResult && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${resultColor}`}>
          {lastResult.message}
          {lastResult.slot && (
            <span className="ml-2 text-xs font-normal opacity-75">
              ({lastResult.slot === "a" ? teamAName : teamBName})
            </span>
          )}
        </div>
      )}

      {/* ── จำนวน check-in ต่อทีม ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* ทีม A */}
        <div className={`rounded-xl border p-4 ${checkedInA ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-800 truncate">{teamAName}</p>
            {checkedInA && <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ พร้อม</span>}
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {countA}
            {required !== null && (
              <span className="text-sm font-normal text-slate-400">/{required}</span>
            )}
          </p>
          <div className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
            {checkinsA.map((c, i) => (
              <p key={i} className="text-xs text-slate-600 truncate">· {c.name}</p>
            ))}
          </div>
        </div>

        {/* ทีม B */}
        <div className={`rounded-xl border p-4 ${checkedInB ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-slate-800 truncate">{teamBName}</p>
            {checkedInB && <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">✓ พร้อม</span>}
          </div>
          <p className="text-3xl font-bold text-slate-900">
            {countB}
            {required !== null && (
              <span className="text-sm font-normal text-slate-400">/{required}</span>
            )}
          </p>
          <div className="mt-2 space-y-0.5 max-h-28 overflow-y-auto">
            {checkinsB.map((c, i) => (
              <p key={i} className="text-xs text-slate-600 truncate">· {c.name}</p>
            ))}
          </div>
        </div>
      </div>

      {checkedInA && checkedInB && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800">
          🎉 ทั้งสองทีมรายงานตัวครบแล้ว — พร้อมแข่งขัน!
        </div>
      )}
    </div>
  );
}

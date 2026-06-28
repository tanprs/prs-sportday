"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type SyncResult = {
  success: boolean;
  message?: string;
  totalFetched?: number;
  totalUpserted?: number;
  skippedNoClassroom?: number;
};

export function SyncRosterButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({ success: false, message: "กรุณาเข้าสู่ระบบใหม่" });
        return;
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/sync-roster`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );
      const json: SyncResult = await res.json();
      setResult(json);
      if (json.success) router.refresh();
    } catch (e) {
      setResult({ success: false, message: "เชื่อมต่อไม่สำเร็จ: " + String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">
            ซิงค์นักเรียนจากระบบเช็คชื่อ
          </p>
          <p className="mt-0.5 text-sm text-slate-500">
            ดึงรายชื่อ–ชั้นเรียนล่าสุดจากระบบเช็คชื่อ QR Code มาอัปเดตตารางนักเรียน
            (มีคำนำหน้า/รูปจะคงค่าเดิม ไม่มีการลบนักเรียนที่หายไป)
          </p>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={loading}
          className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "กำลังซิงค์..." : "ซิงค์ตอนนี้"}
        </button>
      </div>

      {result && (
        <div
          className={`mt-4 rounded-md p-3 text-sm ${
            result.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {result.success ? (
            <>
              ซิงค์สำเร็จ: พบนักเรียน {result.totalFetched} คน, อัปเดต{" "}
              {result.totalUpserted} คน
              {result.skippedNoClassroom
                ? ` (ข้าม ${result.skippedNoClassroom} คน — ไม่มีข้อมูลชั้นเรียน)`
                : ""}
            </>
          ) : (
            result.message ?? "ซิงค์ไม่สำเร็จ"
          )}
        </div>
      )}
    </div>
  );
}

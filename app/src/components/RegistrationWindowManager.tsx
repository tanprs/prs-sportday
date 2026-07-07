"use client";

// RegistrationWindowManager — จัดการหน้าต่างการลงทะเบียนทีม
// ใช้เฉพาะ admin/teacher (admin/page.tsx ซ่อนให้ house_teacher อยู่แล้ว)
//
// ฟีเจอร์:
//   - เปิด/ปิดการลงทะเบียนด้วยปุ่มเดียว (toggle is_active)
//   - ตั้งเวลาต่อเวลาเฉพาะแต่ละสี (per-house extended_until)
//   - สร้างหน้าต่างใหม่ถ้ายังไม่มี หรือต้องการเปิดรอบใหม่

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const HOUSES = [
  { key: "red", label: "สีแดง", color: "#CC2222" },
  { key: "yellow", label: "สีเหลือง", color: "#E8A000" },
  { key: "green", label: "สีเขียว", color: "#1A5C2A" },
  { key: "blue", label: "สีน้ำเงิน", color: "#1A3A8F" },
] as const;

type HouseKey = "red" | "yellow" | "green" | "blue";

type WindowRow = {
  id: string;
  name: string;
  start_at: string | null;
  end_at: string | null;
  is_active: boolean | null;
  red_extended_until: string | null;
  yellow_extended_until: string | null;
  green_extended_until: string | null;
  blue_extended_until: string | null;
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDisplay(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RegistrationWindowManager({
  currentUserId,
}: {
  currentUserId: string;
}) {
  const supabase = createClient();
  const [win, setWin] = useState<WindowRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ฟอร์มต่อเวลา
  const [extendValues, setExtendValues] = useState<Record<HouseKey, string>>({
    red: "", yellow: "", green: "", blue: "",
  });

  // ฟอร์มสร้างหน้าต่างใหม่
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("การลงทะเบียนกีฬาสี 2569");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");

  const fetchWindow = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("registration_windows")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setLoading(false);
    setWin(data);
    if (data) {
      setExtendValues({
        red: data.red_extended_until ? toDatetimeLocal(data.red_extended_until) : "",
        yellow: data.yellow_extended_until ? toDatetimeLocal(data.yellow_extended_until) : "",
        green: data.green_extended_until ? toDatetimeLocal(data.green_extended_until) : "",
        blue: data.blue_extended_until ? toDatetimeLocal(data.blue_extended_until) : "",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchWindow(); }, [fetchWindow]);

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  async function toggleActive() {
    if (!win) return;
    clearMessages();
    setSaving(true);
    const { error: err } = await supabase
      .from("registration_windows")
      .update({ is_active: !win.is_active })
      .eq("id", win.id);
    setSaving(false);
    if (err) { setError("บันทึกไม่สำเร็จ: " + err.message); return; }
    setSuccess(win.is_active ? "ปิดการลงทะเบียนแล้ว" : "เปิดการลงทะเบียนแล้ว");
    fetchWindow();
  }

  async function saveExtensions() {
    if (!win) return;
    clearMessages();
    setSaving(true);
    const { error: err } = await supabase
      .from("registration_windows")
      .update({
        red_extended_until: extendValues.red ? new Date(extendValues.red).toISOString() : null,
        yellow_extended_until: extendValues.yellow ? new Date(extendValues.yellow).toISOString() : null,
        green_extended_until: extendValues.green ? new Date(extendValues.green).toISOString() : null,
        blue_extended_until: extendValues.blue ? new Date(extendValues.blue).toISOString() : null,
      })
      .eq("id", win.id);
    setSaving(false);
    if (err) { setError("บันทึกไม่สำเร็จ: " + err.message); return; }
    setSuccess("บันทึกเวลาต่อเวลาแล้ว");
    fetchWindow();
  }

  async function createWindow() {
    if (!newStart || !newEnd) { setError("กรุณาใส่วันเปิดและวันปิด"); return; }
    clearMessages();
    setSaving(true);
    const { error: err } = await supabase
      .from("registration_windows")
      .insert({
        name: newName.trim() || "การลงทะเบียนกีฬาสี 2569",
        start_at: new Date(newStart).toISOString(),
        end_at: new Date(newEnd).toISOString(),
        is_active: true,
        created_by: currentUserId,
      });
    setSaving(false);
    if (err) { setError("สร้างไม่สำเร็จ: " + err.message); return; }
    setShowCreate(false);
    setSuccess("สร้างและเปิดการลงทะเบียนแล้ว");
    fetchWindow();
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-700">หน้าต่างการลงทะเบียน</h2>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{success}</div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">
          กำลังโหลด...
        </div>
      ) : win === null ? (
        /* ยังไม่มีหน้าต่างเลย */
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <p className="text-sm text-slate-500">ยังไม่มีหน้าต่างการลงทะเบียน</p>
          <button
            onClick={() => { clearMessages(); setShowCreate(true); }}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            สร้างหน้าต่างการลงทะเบียน
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* สถานะปัจจุบัน */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{win.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  {formatDisplay(win.start_at)} — {formatDisplay(win.end_at)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    win.is_active === true
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {win.is_active ? "เปิดอยู่" : "ปิดอยู่"}
                </span>
                <button
                  onClick={toggleActive}
                  disabled={saving}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 ${
                    win.is_active === true
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-emerald-600 hover:bg-emerald-500"
                  }`}
                >
                  {saving ? "..." : win.is_active ? "ปิดการลงทะเบียน" : "เปิดการลงทะเบียน"}
                </button>
              </div>
            </div>
          </div>

          {/* ต่อเวลาแต่ละสี */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-medium text-slate-700">ต่อเวลาลงทะเบียนแต่ละสี</p>
            <p className="text-xs text-slate-400">
              ถ้าต้องการให้บางสีลงทะเบียนได้เกินกำหนดปกติ ใส่วันเวลาที่นี่
              (เว้นว่างไว้ = ไม่ต่อเวลา)
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {HOUSES.map((h) => (
                <div key={h.key} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: h.color }}
                  />
                  <label className="w-16 shrink-0 text-xs text-slate-600">{h.label}</label>
                  <input
                    type="datetime-local"
                    value={extendValues[h.key]}
                    onChange={(e) =>
                      setExtendValues((prev) => ({ ...prev, [h.key]: e.target.value }))
                    }
                    className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={saveExtensions}
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? "กำลังบันทึก..." : "บันทึกการต่อเวลา"}
            </button>
          </div>

          {/* สร้างหน้าต่างใหม่ */}
          {!showCreate ? (
            <button
              onClick={() => { clearMessages(); setShowCreate(true); }}
              className="text-xs text-slate-400 hover:text-indigo-600"
            >
              + สร้างหน้าต่างการลงทะเบียนใหม่
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 space-y-3">
              <p className="text-sm font-medium text-slate-700">สร้างหน้าต่างใหม่</p>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-slate-500">ชื่อหน้าต่าง</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="mt-1 w-full rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">วันเปิด</label>
                    <input
                      type="datetime-local"
                      value={newStart}
                      onChange={(e) => setNewStart(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">วันปิด</label>
                    <input
                      type="datetime-local"
                      value={newEnd}
                      onChange={(e) => setNewEnd(e.target.value)}
                      className="mt-1 w-full rounded border border-slate-200 px-2 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createWindow}
                  disabled={saving}
                  className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {saving ? "กำลังสร้าง..." : "สร้างและเปิดทันที"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-md border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { changeOwnPassword } from "@/lib/actions/password";

export function ChangePasswordPanel() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSave() {
    if (!pw) { setResult({ ok: false, msg: "กรุณากรอกรหัสผ่าน" }); return; }
    if (pw.length < 6) { setResult({ ok: false, msg: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }); return; }
    if (pw !== pw2) { setResult({ ok: false, msg: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" }); return; }
    setSaving(true); setResult(null);
    const { error } = await changeOwnPassword(pw);
    setSaving(false);
    if (error) { setResult({ ok: false, msg: error }); return; }
    setPw(""); setPw2("");
    setResult({ ok: true, msg: "เปลี่ยนรหัสผ่านเรียบร้อย" });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 space-y-3">
      <p className="text-sm font-medium text-slate-700">🔑 เปลี่ยนรหัสผ่าน</p>
      <p className="text-xs text-slate-400">
        ตั้งรหัสผ่านเพื่อใช้ login โดยตรง (นอกเหนือจาก SSO ระบบเช็คชื่อ)
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">รหัสผ่านใหม่</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setResult(null); }}
            placeholder="อย่างน้อย 6 ตัวอักษร"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">ยืนยันรหัสผ่าน</label>
          <input
            type="password"
            value={pw2}
            onChange={(e) => { setPw2(e.target.value); setResult(null); }}
            placeholder="กรอกอีกครั้ง"
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving || !pw || !pw2}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40 transition"
        >
          {saving ? "กำลังบันทึก…" : "เปลี่ยนรหัสผ่าน"}
        </button>
        {result && (
          <span className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
            {result.ok ? "✓ " : "✗ "}{result.msg}
          </span>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { updateMyAssignedSports } from "@/lib/actions/profile";

type Sport = { id: string; label: string };

type Props = {
  currentSports: string[];
  sports: Sport[];
};

export function RefereeProfilePanel({ currentSports, sports }: Props) {
  const [selected, setSelected] = useState<string[]>(currentSports);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    setResult(null);
  }

  async function handleSave() {
    setSaving(true);
    setResult(null);
    const { error } = await updateMyAssignedSports(selected);
    setSaving(false);
    setResult(error ? { ok: false, msg: error } : { ok: true, msg: "บันทึกแล้ว" });
  }

  return (
    <div className="space-y-4">
      {/* sport list */}
      <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-50 overflow-hidden">
        {sports.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">ยังไม่มีชนิดกีฬาในระบบ</p>
        ) : (
          sports.map((s) => {
            const checked = selected.includes(s.id);
            return (
              <label
                key={s.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-slate-50 transition"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(s.id)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
                />
                <span className={`text-sm ${checked ? "font-medium text-slate-900" : "text-slate-600"}`}>
                  {s.label}
                </span>
                {checked && (
                  <span className="ml-auto rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700 font-medium">
                    ของฉัน
                  </span>
                )}
              </label>
            );
          })
        )}
      </div>

      {/* footer */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {saving ? "กำลังบันทึก…" : `บันทึก (${selected.length} กีฬา)`}
        </button>

        {result && (
          <span className={`text-sm ${result.ok ? "text-emerald-600" : "text-red-600"}`}>
            {result.ok ? "✓ " : "✗ "}{result.msg}
          </span>
        )}
      </div>

      <p className="text-xs text-slate-400">
        กีฬาที่เลือกจะปรากฏในหน้า "ตารางแข่ง" เพื่อให้คุณบันทึกผลและจัดการการรายงานตัวได้
      </p>
    </div>
  );
}

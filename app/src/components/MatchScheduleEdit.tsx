"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  matchId: string;
  initialDate: string | null;
  initialVenue: string | null;
  initialNotes: string | null;
  initialMatchNo: string | null;
  sportLabel: string;
};

export function MatchScheduleEdit({
  matchId,
  initialDate,
  initialVenue,
  initialNotes,
  initialMatchNo,
  sportLabel,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(initialDate ?? "");
  const [venue, setVenue] = useState(initialVenue ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [matchNo, setMatchNo] = useState(initialMatchNo ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("matches")
      .update({
        match_date: date || null,
        venue: venue || null,
        notes: notes || null,
        match_no: matchNo || null,
      })
      .eq("id", matchId);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  function handleCancel() {
    // reset to original
    setDate(initialDate ?? "");
    setVenue(initialVenue ?? "");
    setNotes(initialNotes ?? "");
    setMatchNo(initialMatchNo ?? "");
    setError("");
    setOpen(false);
  }

  return (
    <>
      {/* trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
        title="แก้ไขตาราง"
      >
        ✏️ แก้ไขตาราง
      </button>

      {/* modal backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {/* header */}
            <div className="mb-4">
              <h2 className="text-base font-semibold text-slate-900">
                แก้ไขตารางแข่ง
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">{sportLabel}</p>
            </div>

            {/* fields */}
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  คู่ที่ (match_no)
                </label>
                <input
                  type="text"
                  value={matchNo}
                  onChange={(e) => setMatchNo(e.target.value)}
                  placeholder="เช่น คู่ที่ 1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  วันที่แข่ง
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  สนาม / สถานที่
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="เช่น สนามฟุตซอล อาคาร 1"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  หมายเหตุ
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="เช่น น้ำเงิน vs แดง"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                />
              </div>
            </div>

            {error && (
              <p className="mt-3 text-xs text-red-500">{error}</p>
            )}

            {/* actions */}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={handleCancel}
                disabled={saving}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

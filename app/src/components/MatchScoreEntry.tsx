"use client";

// MatchScoreEntry — ฟอร์มกรอกคะแนนและสถานะการแข่ง
// ใช้ใน matches/page.tsx สำหรับแถวที่ผู้ใช้มีสิทธิ์แก้ไข:
//   - admin / teacher  → ทุกนัด
//   - referee          → เฉพาะนัดที่ assigned_sports ตรงกัน

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type MatchStatus = "scheduled" | "ongoing" | "completed" | "cancelled";

const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "scheduled", label: "รอแข่ง" },
  { value: "ongoing", label: "กำลังแข่ง" },
  { value: "completed", label: "จบแล้ว" },
  { value: "cancelled", label: "ยกเลิก" },
];

export function MatchScoreEntry({
  matchId,
  initialScoreA,
  initialScoreB,
  initialStatus,
  teamAId,
  teamBId,
}: {
  matchId: string;
  initialScoreA: number | null;
  initialScoreB: number | null;
  initialStatus: MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(String(initialScoreA ?? 0));
  const [scoreB, setScoreB] = useState(String(initialScoreB ?? 0));
  const [status, setStatus] = useState<MatchStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);

    const sa = Math.max(0, parseInt(scoreA) || 0);
    const sb = Math.max(0, parseInt(scoreB) || 0);

    // คำนวณ winner เฉพาะตอนจบแล้ว
    let winner_id: string | null = null;
    if (status === "completed") {
      if (sa > sb && teamAId) winner_id = teamAId;
      else if (sb > sa && teamBId) winner_id = teamBId;
      // เสมอ → winner_id = null
    }

    const { error: err } = await supabase
      .from("matches")
      .update({
        score_a: sa,
        score_b: sb,
        status,
        winner_id,
        recorded_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }

    // เลื่อนผู้ชนะไปรอบถัดไปอัตโนมัติ
    if (status === "completed" && winner_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cur } = await (supabase as any)
        .from("matches")
        .select("next_match_id, next_slot")
        .eq("id", matchId)
        .single();
      if (cur?.next_match_id && cur?.next_slot) {
        const field = cur.next_slot === "a" ? "team_a_id" : "team_b_id";
        await supabase
          .from("matches")
          .update({ [field]: winner_id })
          .eq("id", cur.next_match_id);
      }
    }

    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
      >
        บันทึกผล
      </button>
    );
  }

  return (
    <div className="space-y-1.5 py-1">
      {/* คะแนน */}
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={0}
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          className="w-14 rounded border border-slate-300 px-1.5 py-1 text-center text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
        <span className="text-xs text-slate-400">vs</span>
        <input
          type="number"
          min={0}
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          className="w-14 rounded border border-slate-300 px-1.5 py-1 text-center text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        />
      </div>

      {/* สถานะ */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as MatchStatus)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* ปุ่ม */}
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {saving ? "..." : "บันทึก"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setError(null);
            setScoreA(String(initialScoreA ?? 0));
            setScoreB(String(initialScoreB ?? 0));
            setStatus(initialStatus);
          }}
          className="rounded border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-50"
        >
          ยกเลิก
        </button>
      </div>
    </div>
  );
}

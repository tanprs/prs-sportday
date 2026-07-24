"use client";

// MatchScoreEntry — ฟอร์มกรอกคะแนนและสถานะการแข่ง
// ใช้ใน matches/page.tsx สำหรับแถวที่ผู้ใช้มีสิทธิ์แก้ไข:
//   - admin / teacher  → ทุกนัด
//   - referee          → เฉพาะนัดที่ assigned_sports ตรงกัน

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
  teamAName,
  teamBName,
  initialCheckedInA,
  initialCheckedInB,
}: {
  matchId: string;
  initialScoreA: number | null;
  initialScoreB: number | null;
  initialStatus: MatchStatus;
  teamAId: string | null;
  teamBId: string | null;
  teamAName?: string;
  teamBName?: string;
  initialCheckedInA?: boolean;
  initialCheckedInB?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState(false);
  const [scoreA, setScoreA] = useState(String(initialScoreA ?? 0));
  const [scoreB, setScoreB] = useState(String(initialScoreB ?? 0));
  const [status, setStatus] = useState<MatchStatus>(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // check-in state
  const [checkedInA, setCheckedInA] = useState(initialCheckedInA ?? false);
  const [checkedInB, setCheckedInB] = useState(initialCheckedInB ?? false);
  const [savingCheckIn, setSavingCheckIn] = useState(false);

  const nameA = teamAName ?? "ทีม A";
  const nameB = teamBName ?? "ทีม B";

  async function handleCheckIn(team: "a" | "b") {
    setSavingCheckIn(true);
    const newVal = team === "a" ? !checkedInA : !checkedInB;
    const { error: err } = await supabase
      .from("matches")
      .update(
        team === "a"
          ? { team_a_checked_in: newVal }
          : { team_b_checked_in: newVal }
      )
      .eq("id", matchId);
    setSavingCheckIn(false);
    if (!err) {
      if (team === "a") setCheckedInA(newVal);
      else setCheckedInB(newVal);
    }
  }

  async function handleWalkover(loser: "a" | "b") {
    const winnerId = loser === "a" ? teamBId : teamAId;
    const loserName = loser === "a" ? nameA : nameB;
    if (!winnerId) return;

    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from("matches")
      .update({
        score_a: 0,
        score_b: 0,
        status: "completed",
        winner_id: winnerId,
        notes: `Walkover — ${loserName} ไม่รายงานตัว`,
        recorded_at: new Date().toISOString(),
      })
      .eq("id", matchId);

    if (err) { setSaving(false); setError(err.message); return; }

    // เลื่อนผู้ชนะไปรอบถัดไป
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cur } = await (supabase as any)
      .from("matches")
      .select("next_match_id, next_slot, loser_match_id, loser_slot")
      .eq("id", matchId)
      .single();

    const loserId = loser === "a" ? teamAId : teamBId;

    if (winnerId && cur?.next_match_id && cur?.next_slot) {
      const payload = cur.next_slot === "a" ? { team_a_id: winnerId } : { team_b_id: winnerId };
      await supabase.from("matches").update(payload).eq("id", cur.next_match_id);
    }
    if (loserId && cur?.loser_match_id && cur?.loser_slot) {
      const payload = cur.loser_slot === "a" ? { team_a_id: loserId } : { team_b_id: loserId };
      await supabase.from("matches").update(payload).eq("id", cur.loser_match_id);
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

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
    if (err) { setError(err.message); return; }

    // เลื่อนผู้ชนะ/ผู้แพ้ไปรอบถัดไปอัตโนมัติ
    if (status === "completed") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: cur } = await (supabase as any)
        .from("matches")
        .select("next_match_id, next_slot, loser_match_id, loser_slot")
        .eq("id", matchId)
        .single();

      const loser_id =
        winner_id === teamAId ? teamBId :
        winner_id === teamBId ? teamAId : null;

      if (winner_id && cur?.next_match_id && cur?.next_slot) {
        const winPayload = cur.next_slot === "a"
          ? { team_a_id: winner_id }
          : { team_b_id: winner_id };
        await supabase.from("matches").update(winPayload).eq("id", cur.next_match_id);
      }

      if (loser_id && cur?.loser_match_id && cur?.loser_slot) {
        const losePayload = cur.loser_slot === "a"
          ? { team_a_id: loser_id }
          : { team_b_id: loser_id };
        await supabase.from("matches").update(losePayload).eq("id", cur.loser_match_id);
      }
    }

    setEditing(false);
    router.refresh();
  }

  // ── collapsed state ──────────────────────────────────────────────────────
  if (!editing) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {/* check-in badges — แตะเพื่อ toggle */}
        <button
          onClick={() => handleCheckIn("a")}
          disabled={savingCheckIn}
          title={checkedInA ? `${nameA} รายงานตัวแล้ว (แตะเพื่อยกเลิก)` : `${nameA} ยังไม่รายงานตัว`}
          className={`rounded px-2 py-0.5 text-xs font-medium border transition ${
            checkedInA
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
          }`}
        >
          {checkedInA ? "✓" : "○"} A
        </button>
        <button
          onClick={() => handleCheckIn("b")}
          disabled={savingCheckIn}
          title={checkedInB ? `${nameB} รายงานตัวแล้ว (แตะเพื่อยกเลิก)` : `${nameB} ยังไม่รายงานตัว`}
          className={`rounded px-2 py-0.5 text-xs font-medium border transition ${
            checkedInB
              ? "bg-emerald-50 text-emerald-700 border-emerald-300"
              : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
          }`}
        >
          {checkedInB ? "✓" : "○"} B
        </button>
        <button
          onClick={() => setEditing(true)}
          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
        >
          บันทึกผล
        </button>
        <Link
          href={`/checkin/${matchId}`}
          className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
        >
          📷 สแกน
        </Link>
      </div>
    );
  }

  // ── expanded state ───────────────────────────────────────────────────────
  return (
    <div className="space-y-2.5 py-1">

      {/* ── รายงานตัว ── */}
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">รายงานตัว</p>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleCheckIn("a")}
            disabled={savingCheckIn}
            className={`flex-1 rounded border px-2 py-1.5 text-xs font-medium transition ${
              checkedInA
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {checkedInA ? "✓ " : "○ "}{nameA}
          </button>
          <button
            onClick={() => handleCheckIn("b")}
            disabled={savingCheckIn}
            className={`flex-1 rounded border px-2 py-1.5 text-xs font-medium transition ${
              checkedInB
                ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {checkedInB ? "✓ " : "○ "}{nameB}
          </button>
        </div>
      </div>

      {/* ── คะแนน ── */}
      <div>
        <p className="mb-1 text-xs font-medium text-slate-500">คะแนน</p>
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
      </div>

      {/* ── สถานะ ── */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value as MatchStatus)}
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* ── Walkover ── */}
      {(teamAId || teamBId) && (
        <div className="rounded border border-red-100 bg-red-50 p-2 space-y-1">
          <p className="text-xs font-medium text-red-600">🚩 Walkover (ทีมไม่รายงานตัว)</p>
          <div className="flex gap-1.5">
            {teamBId && (
              <button
                onClick={() => handleWalkover("a")}
                disabled={saving}
                className="flex-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {nameA} ไม่มา → {nameB} ชนะ
              </button>
            )}
            {teamAId && (
              <button
                onClick={() => handleWalkover("b")}
                disabled={saving}
                className="flex-1 rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {nameB} ไม่มา → {nameA} ชนะ
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── ปุ่ม ── */}
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

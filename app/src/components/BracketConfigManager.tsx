"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Match = {
  id: string;
  match_no: string | null;
  round: string;
  match_date: string | null;
  notes: string | null;
  next_match_id: string | null;
  next_slot: "a" | "b" | null;
  loser_match_id: string | null;
  loser_slot: "a" | "b" | null;
  sport_id: string;
};

type SportType = {
  id: string;
  name: string;
  grade_group: string;
  gender_type: string;
};

type Props = {
  matches: Match[];
  sports: SportType[];
};

const GENDER_TH: Record<string, string> = {
  male: "ชาย", female: "หญิง", both: "รวม",
};

const ROUND_TH: Record<string, string> = {
  qualifier: "รอบคัดเลือก", final: "รอบชิง",
};

function sportLabel(s: SportType) {
  return `${s.name} ${s.grade_group} (${GENDER_TH[s.gender_type] ?? s.gender_type})`;
}

export function BracketConfigManager({ matches, sports }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // local state: track edits before saving
  const [edits, setEdits] = useState<
    Record<string, { next_match_id: string; next_slot: "a" | "b" | ""; loser_match_id: string; loser_slot: "a" | "b" | "" }>
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const sportMap = new Map(sports.map((s) => [s.id, s]));

  // group matches by sport
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    (acc[m.sport_id] ??= []).push(m);
    return acc;
  }, {});

  function matchDisplay(m: Match) {
    return `${m.match_no ?? ""} ${ROUND_TH[m.round] ?? m.round} — ${m.notes ?? m.match_date ?? m.id.slice(0, 8)}`;
  }

  function getCurrent(m: Match) {
    return edits[m.id] ?? {
      next_match_id: m.next_match_id ?? "",
      next_slot: (m.next_slot ?? "") as "a" | "b" | "",
      loser_match_id: m.loser_match_id ?? "",
      loser_slot: (m.loser_slot ?? "") as "a" | "b" | "",
    };
  }

  function setField(
    matchId: string,
    field: "next_match_id" | "next_slot" | "loser_match_id" | "loser_slot",
    value: string,
    m: Match
  ) {
    setEdits((prev) => ({
      ...prev,
      [matchId]: {
        ...getCurrent(m),
        ...prev[matchId],
        [field]: value,
      },
    }));
    setSaved((prev) => ({ ...prev, [matchId]: false }));
  }

  async function handleSave(m: Match) {
    const cur = getCurrent(m);
    if (!cur.next_match_id || !cur.next_slot) {
      setErrors((p) => ({ ...p, [m.id]: "ต้องเลือกแมตช์ผู้ชนะและ slot" }));
      return;
    }
    setSaving((p) => ({ ...p, [m.id]: true }));
    setErrors((p) => ({ ...p, [m.id]: "" }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: err } = await (supabase as any)
      .from("matches")
      .update({
        next_match_id: cur.next_match_id || null,
        next_slot: cur.next_slot || null,
        loser_match_id: cur.loser_match_id || null,
        loser_slot: cur.loser_slot || null,
      })
      .eq("id", m.id);

    setSaving((p) => ({ ...p, [m.id]: false }));
    if (err) {
      setErrors((p) => ({ ...p, [m.id]: err.message }));
      return;
    }
    setSaved((p) => ({ ...p, [m.id]: true }));
    router.refresh();
  }

  async function handleClear(m: Match) {
    setSaving((p) => ({ ...p, [m.id]: true }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("matches")
      .update({ next_match_id: null, next_slot: null })
      .eq("id", m.id);
    setSaving((p) => ({ ...p, [m.id]: false }));
    setEdits((p) => ({ ...p, [m.id]: { next_match_id: "", next_slot: "", loser_match_id: "", loser_slot: "" } }));
    setSaved((p) => ({ ...p, [m.id]: false }));
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-slate-900">
          ตั้งค่า Bracket — เลื่อนผู้ชนะอัตโนมัติ
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          กำหนดว่าผู้ชนะของแต่ละแมตช์จะไปเป็น{" "}
          <span className="font-medium">ทีม A</span> หรือ{" "}
          <span className="font-medium">ทีม B</span>{" "}
          ของแมตช์ถัดไป — ระบบจะเติมข้อมูลให้อัตโนมัติเมื่อบันทึกผล
        </p>
      </div>

      {Object.entries(grouped).map(([sportId, sportMatches]) => {
        const sport = sportMap.get(sportId);
        if (!sport) return null;

        // เฉพาะ qualifier มีรอบถัดไป (final)
        const qualifiers = sportMatches.filter((m) => m.round === "qualifier");
        const finals = sportMatches.filter((m) => m.round === "final");
        if (qualifiers.length === 0) return null;

        return (
          <div
            key={sportId}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <h3 className="text-sm font-semibold text-slate-700">
                {sportLabel(sport)}
              </h3>
              <p className="text-xs text-slate-400">
                {qualifiers.length} qualifier → {finals.length} final
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {qualifiers.map((m) => {
                const cur = getCurrent(m);
                const isSaving = saving[m.id];
                const isSaved = saved[m.id];
                const errMsg = errors[m.id];
                const hasLink = !!(m.next_match_id || cur.next_match_id);

                return (
                  <div key={m.id} className="px-4 py-3">
                    {/* match label */}
                    <p className="mb-2 text-xs font-medium text-slate-700">
                      {matchDisplay(m)}
                      {hasLink && (
                        <span className="ml-2 text-emerald-600">✓ เชื่อมแล้ว</span>
                      )}
                    </p>

                    <div className="flex flex-wrap items-center gap-4">
                      {/* ─ ผู้ชนะ ─ */}
                      <div className="flex items-end gap-2">
                        <span className="mb-1.5 text-xs font-medium text-emerald-700">🏆 ผู้ชนะ</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">ไปแมตช์</span>
                          <select
                            value={cur.next_match_id}
                            onChange={(e) => setField(m.id, "next_match_id", e.target.value, m)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="">— เลือก —</option>
                            {finals.map((f) => (
                              <option key={f.id} value={f.id}>{matchDisplay(f)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">เป็น</span>
                          <select
                            value={cur.next_slot}
                            onChange={(e) => setField(m.id, "next_slot", e.target.value, m)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="">— slot —</option>
                            <option value="a">ทีม A</option>
                            <option value="b">ทีม B</option>
                          </select>
                        </div>
                      </div>

                      {/* ─ ผู้แพ้ ─ */}
                      <div className="flex items-end gap-2">
                        <span className="mb-1.5 text-xs font-medium text-slate-400">🥉 ผู้แพ้</span>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">ไปแมตช์</span>
                          <select
                            value={cur.loser_match_id}
                            onChange={(e) => setField(m.id, "loser_match_id", e.target.value, m)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="">— เลือก —</option>
                            {finals.map((f) => (
                              <option key={f.id} value={f.id}>{matchDisplay(f)}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-400">เป็น</span>
                          <select
                            value={cur.loser_slot}
                            onChange={(e) => setField(m.id, "loser_slot", e.target.value, m)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-400 focus:outline-none"
                          >
                            <option value="">— slot —</option>
                            <option value="a">ทีม A</option>
                            <option value="b">ทีม B</option>
                          </select>
                        </div>
                      </div>

                      {/* save */}
                      <div className="flex flex-col gap-1">
                        <span className="text-xs text-transparent">-</span>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleSave(m)}
                            disabled={isSaving}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {isSaving ? "..." : isSaved ? "✓ บันทึกแล้ว" : "บันทึก"}
                          </button>
                          {hasLink && (
                            <button
                              onClick={() => handleClear(m)}
                              disabled={isSaving}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            >
                              ล้าง
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {errMsg && (
                      <p className="mt-1 text-xs text-red-500">{errMsg}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

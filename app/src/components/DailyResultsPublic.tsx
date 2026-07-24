"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { GENDER_TYPE_LABELS_TH } from "@/lib/labels";

// ─── constants ───────────────────────────────────────────────────────────────

const HOUSE_HEX: Record<string, string> = {
  red: "#CC2222", yellow: "#E8A000", green: "#1A5C2A", blue: "#1A3A8F",
};
const HOUSE_BG: Record<string, string> = {
  red: "#FEE2E2", yellow: "#FEF9C3", green: "#DCFCE7", blue: "#DBEAFE",
};
const HOUSE_LABELS: Record<string, string> = {
  red: "แดง", yellow: "เหลือง/ทอง", green: "เขียว", blue: "น้ำเงิน",
};
const STATUS_LABELS: Record<string, string> = {
  scheduled: "รอแข่ง", ongoing: "กำลังแข่ง", completed: "จบแล้ว", cancelled: "ยกเลิก",
};
const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-500",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-500",
};

// ─── types ───────────────────────────────────────────────────────────────────

type TeamRef = { team_name: string | null; house_color: string } | null;
type Match = {
  id: string;
  round: string;
  match_no: string | null;
  score_a: number | null;
  score_b: number | null;
  status: string | null;
  notes: string | null;
  winner_id: string | null;
  team_a_id: string | null;
  team_b_id: string | null;
  sport_types: { name: string; grade_group: string; gender_type: string } | null;
  team_a: TeamRef;
  team_b: TeamRef;
};

function todayLocal() {
  return new Date().toLocaleDateString("sv-SE");
}

function sportKey(m: Match) {
  const s = m.sport_types;
  if (!s) return "ไม่ระบุชนิดกีฬา";
  return `${s.name} ${s.grade_group} (${GENDER_TYPE_LABELS_TH[s.gender_type] ?? s.gender_type})`;
}

function teamLabel(team: TeamRef, color?: string): string {
  if (!team) {
    if (color) return HOUSE_LABELS[color] ?? color;
    return "-";
  }
  return team.team_name ?? HOUSE_LABELS[team.house_color] ?? team.house_color;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function DailyResultsPublic() {
  const supabase = createClient();
  const [date, setDate] = useState(todayLocal());
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("matches")
      .select(`
        id, round, match_no, score_a, score_b, status, notes, winner_id, team_a_id, team_b_id,
        sport_types(name, grade_group, gender_type),
        team_a:teams!team_a_id(team_name, house_color),
        team_b:teams!team_b_id(team_name, house_color)
      `)
      .eq("match_date", date)
      .order("match_no", { ascending: true });
    setMatches((data ?? []) as unknown as Match[]);
    setLoading(false);
  }, [date]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const k = sportKey(m);
    (acc[k] ??= []).push(m);
    return acc;
  }, {});

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const totalCount = matches.length;

  return (
    <div className="mt-10 space-y-5">
      {/* section header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">ผลการแข่งขันรายวัน</h2>
          <p className="text-sm text-slate-500">
            {loading
              ? "กำลังโหลด..."
              : totalCount === 0
              ? "ไม่มีการแข่งขันในวันที่เลือก"
              : `จบแล้ว ${completedCount} / ${totalCount} แมตช์`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <button
            onClick={fetchMatches}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            ↻
          </button>
        </div>
      </div>

      {/* match list */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          กำลังโหลด...
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          ไม่มีการแข่งขันในวันที่เลือก
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([label, ms]) => {
            const doneInGroup = ms.filter((m) => m.status === "completed").length;
            return (
              <div
                key={label}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <h3 className="text-sm font-semibold text-slate-700">{label}</h3>
                  <span className="text-xs text-slate-400">
                    {doneInGroup}/{ms.length} แมตช์
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {ms.map((m) => {
                    const hasTeams = m.team_a_id && m.team_b_id;
                    const isCompleted = m.status === "completed";
                    const aWon = isCompleted && m.winner_id === m.team_a_id;
                    const bWon = isCompleted && m.winner_id === m.team_b_id;
                    const colorA = m.team_a?.house_color;
                    const colorB = m.team_b?.house_color;

                    return (
                      <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                        {/* match no */}
                        <span className="w-14 shrink-0 text-xs text-slate-400">
                          {m.match_no ?? ""}
                        </span>

                        {hasTeams ? (
                          <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                            {/* team A */}
                            <div className="flex min-w-0 items-center gap-2">
                              {colorA && (
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{ backgroundColor: HOUSE_HEX[colorA] ?? "#888" }}
                                />
                              )}
                              <span
                                className={`truncate text-sm font-medium ${
                                  aWon ? "text-emerald-700" : "text-slate-800"
                                }`}
                              >
                                {teamLabel(m.team_a)}
                                {aWon && " ✓"}
                              </span>
                            </div>

                            {/* score / vs */}
                            <span className="shrink-0 px-2 font-mono text-sm font-semibold text-slate-700">
                              {isCompleted
                                ? `${m.score_a ?? 0} – ${m.score_b ?? 0}`
                                : "vs"}
                            </span>

                            {/* team B */}
                            <div className="flex min-w-0 items-center justify-end gap-2">
                              <span
                                className={`truncate text-sm font-medium ${
                                  bWon ? "text-emerald-700" : "text-slate-800"
                                }`}
                              >
                                {bWon && "✓ "}
                                {teamLabel(m.team_b)}
                              </span>
                              {colorB && (
                                <span
                                  className="h-3 w-3 shrink-0 rounded-full"
                                  style={{ backgroundColor: HOUSE_HEX[colorB] ?? "#888" }}
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          /* no teams yet — show notes */
                          <span className="flex-1 text-sm italic text-slate-500">
                            {m.notes ?? "ยังไม่กำหนดทีม"}
                          </span>
                        )}

                        {/* status */}
                        <span
                          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            STATUS_BADGE[m.status ?? "scheduled"] ?? "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {STATUS_LABELS[m.status ?? "scheduled"]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

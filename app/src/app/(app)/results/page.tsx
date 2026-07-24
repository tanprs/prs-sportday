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
  red: "สีแดง", yellow: "สีเหลือง", green: "สีเขียว", blue: "สีน้ำเงิน",
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

// ─── helpers ─────────────────────────────────────────────────────────────────

function todayLocal(): string {
  return new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
}

function teamLabel(team: TeamRef): string {
  if (!team) return "-";
  return team.team_name ?? HOUSE_LABELS[team.house_color] ?? team.house_color;
}

function sportKey(m: Match): string {
  const s = m.sport_types;
  if (!s) return "ไม่ระบุชนิดกีฬา";
  return `${s.name} ${s.grade_group} (${GENDER_TYPE_LABELS_TH[s.gender_type] ?? s.gender_type})`;
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function ResultsPage() {
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

  // group by sport label
  const grouped = matches.reduce<Record<string, Match[]>>((acc, m) => {
    const k = sportKey(m);
    (acc[k] ??= []).push(m);
    return acc;
  }, {});

  // house wins summary (only meaningful once teams are registered)
  const houseWins: Record<string, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const m of matches) {
    if (m.status === "completed" && m.winner_id) {
      const winColor =
        m.team_a_id === m.winner_id ? m.team_a?.house_color :
        m.team_b_id === m.winner_id ? m.team_b?.house_color : null;
      if (winColor) houseWins[winColor] = (houseWins[winColor] ?? 0) + 1;
    }
  }

  const completedCount = matches.filter((m) => m.status === "completed").length;
  const totalCount = matches.length;
  const anyWinners = Object.values(houseWins).some((v) => v > 0);

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">
            สรุปผลการแข่งขันรายวัน
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <button
            onClick={fetchMatches}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            รีเฟรช
          </button>
        </div>
      </div>

      {/* house score summary */}
      {anyWinners && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(["red", "yellow", "green", "blue"] as const).map((color) => (
            <div
              key={color}
              className="rounded-xl border p-4 text-center"
              style={{
                borderColor: HOUSE_HEX[color],
                backgroundColor: HOUSE_BG[color],
              }}
            >
              <p className="text-xs font-semibold" style={{ color: HOUSE_HEX[color] }}>
                {HOUSE_LABELS[color]}
              </p>
              <p
                className="mt-1 text-3xl font-bold"
                style={{ color: HOUSE_HEX[color] }}
              >
                {houseWins[color]}
              </p>
              <p className="text-xs text-slate-500">ชนะ</p>
            </div>
          ))}
        </div>
      )}

      {/* match list */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          กำลังโหลด...
        </div>
      ) : totalCount === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          ไม่มีการแข่งขันในวันที่เลือก — ลองเลือกวันอื่น
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
                {/* sport header */}
                <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                  <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
                  <span className="text-xs text-slate-400">
                    {doneInGroup}/{ms.length} แมตช์
                  </span>
                </div>

                <table className="w-full text-sm">
                  <tbody>
                    {ms.map((m) => {
                      const hasTeams = m.team_a_id && m.team_b_id;
                      const isCompleted = m.status === "completed";
                      const aWon = isCompleted && m.winner_id && m.winner_id === m.team_a_id;
                      const bWon = isCompleted && m.winner_id && m.winner_id === m.team_b_id;

                      return (
                        <tr
                          key={m.id}
                          className="border-t border-slate-100 hover:bg-slate-50"
                        >
                          {/* match no */}
                          <td className="w-20 px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {m.match_no ?? ""}
                          </td>

                          {hasTeams ? (
                            <>
                              {/* team A */}
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  {m.team_a?.house_color && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor:
                                          HOUSE_HEX[m.team_a.house_color] ?? "#888",
                                      }}
                                    />
                                  )}
                                  <span
                                    className={`font-medium ${
                                      aWon ? "text-emerald-700" : "text-slate-800"
                                    }`}
                                  >
                                    {teamLabel(m.team_a)}
                                  </span>
                                  {aWon && (
                                    <span className="text-xs text-emerald-600">✓</span>
                                  )}
                                </div>
                              </td>
                              {/* score */}
                              <td className="w-20 px-2 py-3 text-center font-mono font-semibold text-slate-800">
                                {isCompleted
                                  ? `${m.score_a ?? 0} – ${m.score_b ?? 0}`
                                  : "vs"}
                              </td>
                              {/* team B */}
                              <td className="px-3 py-3">
                                <div className="flex items-center gap-2">
                                  {m.team_b?.house_color && (
                                    <span
                                      className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                                      style={{
                                        backgroundColor:
                                          HOUSE_HEX[m.team_b.house_color] ?? "#888",
                                      }}
                                    />
                                  )}
                                  <span
                                    className={`font-medium ${
                                      bWon ? "text-emerald-700" : "text-slate-800"
                                    }`}
                                  >
                                    {teamLabel(m.team_b)}
                                  </span>
                                  {bWon && (
                                    <span className="text-xs text-emerald-600">✓</span>
                                  )}
                                </div>
                              </td>
                            </>
                          ) : (
                            /* no teams yet — show notes */
                            <td
                              colSpan={3}
                              className="px-3 py-3 text-slate-500 italic"
                            >
                              {m.notes ?? "ยังไม่กำหนดทีม"}
                            </td>
                          )}

                          {/* status badge */}
                          <td className="w-28 px-4 py-3 text-right">
                            <span
                              className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
                                STATUS_BADGE[m.status ?? "scheduled"] ??
                                "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {STATUS_LABELS[m.status ?? "scheduled"]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

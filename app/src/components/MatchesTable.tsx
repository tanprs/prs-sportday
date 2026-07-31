"use client";

import { useState, useMemo } from "react";
import { MatchScoreEntry } from "@/components/MatchScoreEntry";
import { MatchScheduleEdit } from "@/components/MatchScheduleEdit";

// ─── types ───────────────────────────────────────────────────────────────────

type Match = {
  id: string;
  round: string;
  match_no: string | null;
  score_a: number | null;
  score_b: number | null;
  status: string | null;
  match_date: string | null;
  venue: string | null;
  notes: string | null;
  sport_id: string;
  team_a_id: string | null;
  team_b_id: string | null;
  team_a_checked_in: boolean;
  team_b_checked_in: boolean;
};

type Props = {
  matches: Match[];
  sportLabel: Record<string, string>;   // sport_id → label
  sportName: Record<string, string>;    // sport_id → name only (for filter grouping)
  teamLabel: Record<string, string>;    // team_id  → label
  canEditAny: boolean;
  showActions: boolean;
  assignedSports: string[];
  isReferee: boolean;
};

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  scheduled: "รอแข่ง", ongoing: "กำลังแข่ง", completed: "จบแล้ว", cancelled: "ยกเลิก",
};
const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-600",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};
const ROUND_LABELS: Record<string, string> = {
  qualifier: "รอบคัดเลือก", final: "รอบชิง",
};

// ─── component ───────────────────────────────────────────────────────────────

export function MatchesTable({
  matches,
  sportLabel,
  sportName,
  teamLabel,
  canEditAny,
  showActions,
  assignedSports,
  isReferee,
}: Props) {
  const [filterDate, setFilterDate] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterRound, setFilterRound] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // unique dates & sport names for dropdowns
  const dates = useMemo(
    () => [...new Set(matches.map((m) => m.match_date).filter(Boolean))].sort() as string[],
    [matches]
  );
  const sportNames = useMemo(
    () => [...new Set(matches.map((m) => sportName[m.sport_id]).filter(Boolean))].sort() as string[],
    [matches, sportName]
  );

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (filterDate && m.match_date !== filterDate) return false;
      if (filterSport && sportName[m.sport_id] !== filterSport) return false;
      if (filterRound && m.round !== filterRound) return false;
      if (filterStatus && m.status !== filterStatus) return false;
      return true;
    });
  }, [matches, filterDate, filterSport, filterRound, filterStatus, sportName]);

  function clearFilters() {
    setFilterDate("");
    setFilterSport("");
    setFilterRound("");
    setFilterStatus("");
  }

  const hasFilter = filterDate || filterSport || filterRound || filterStatus;
  const colSpan = showActions && canEditAny ? 8 : showActions ? 7 : canEditAny ? 7 : 6;

  return (
    <div className="space-y-3">
      {/* ─ filter bar ─ */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
        {/* วันที่ */}
        <select
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">📅 ทุกวัน</option>
          {dates.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        {/* ชนิดกีฬา */}
        <select
          value={filterSport}
          onChange={(e) => setFilterSport(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">🏅 ทุกชนิดกีฬา</option>
          {sportNames.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>

        {/* รอบ */}
        <select
          value={filterRound}
          onChange={(e) => setFilterRound(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">🔄 ทุกรอบ</option>
          <option value="qualifier">รอบคัดเลือก</option>
          <option value="final">รอบชิง</option>
        </select>

        {/* สถานะ */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">📋 ทุกสถานะ</option>
          <option value="scheduled">รอแข่ง</option>
          <option value="ongoing">กำลังแข่ง</option>
          <option value="completed">จบแล้ว</option>
          <option value="cancelled">ยกเลิก</option>
        </select>

        {hasFilter && (
          <button
            onClick={clearFilters}
            className="col-span-2 sm:col-span-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
          >
            ✕ ล้างตัวกรอง
          </button>
        )}

        <span className="col-span-2 sm:col-span-1 sm:ml-auto text-xs text-slate-400">
          {filtered.length} / {matches.length} แมตช์
        </span>
      </div>

      {/* ─ mobile card view ─ */}
      <div className="md:hidden space-y-2">
        {filtered.length > 0 ? (
          filtered.map((m) => {
            const editable =
              m.status !== "completed" &&
              m.status !== "cancelled" &&
              (canEditAny || (isReferee && assignedSports.includes(m.sport_id)));
            const teamA = m.team_a_id ? teamLabel[m.team_a_id] : "-";
            const teamB = m.team_b_id ? teamLabel[m.team_b_id] : "-";

            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                {/* header row */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{sportLabel[m.sport_id] ?? "-"}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {ROUND_LABELS[m.round] ?? m.round}
                      {m.match_no ? ` · ${m.match_no}` : ""}
                      {m.match_date ? ` · ${m.match_date}` : ""}
                      {m.venue ? ` · ${m.venue}` : ""}
                    </p>
                  </div>
                  {m.status && (
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] ?? "bg-slate-100"}`}>
                      {STATUS_LABELS[m.status]}
                    </span>
                  )}
                </div>

                {/* score row */}
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-center text-sm font-medium text-slate-700 truncate">{teamA}</span>
                  <span className="shrink-0 font-mono text-lg font-bold text-slate-900 px-2">
                    {m.score_a ?? 0} - {m.score_b ?? 0}
                  </span>
                  <span className="flex-1 text-center text-sm font-medium text-slate-700 truncate">{teamB}</span>
                </div>

                {/* actions */}
                {(showActions && editable) && (
                  <div className="border-t border-slate-100 pt-3">
                    <MatchScoreEntry
                      matchId={m.id}
                      initialScoreA={m.score_a}
                      initialScoreB={m.score_b}
                      initialStatus={m.status as "scheduled" | "ongoing" | "completed" | "cancelled"}
                      teamAId={m.team_a_id}
                      teamBId={m.team_b_id}
                      teamAName={m.team_a_id ? teamLabel[m.team_a_id] : undefined}
                      teamBName={m.team_b_id ? teamLabel[m.team_b_id] : undefined}
                      initialCheckedInA={m.team_a_checked_in}
                      initialCheckedInB={m.team_b_checked_in}
                    />
                  </div>
                )}
                {canEditAny && (
                  <div className={showActions && editable ? "" : "border-t border-slate-100 pt-3"}>
                    <MatchScheduleEdit
                      matchId={m.id}
                      initialDate={m.match_date ?? null}
                      initialVenue={m.venue ?? null}
                      initialNotes={m.notes ?? null}
                      initialMatchNo={m.match_no ?? null}
                      sportLabel={sportLabel[m.sport_id] ?? ""}
                    />
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-400 text-sm">
            {hasFilter ? "ไม่มีแมตช์ที่ตรงกับตัวกรองที่เลือก" : "ยังไม่มีตารางแข่งในระบบ"}
          </div>
        )}
      </div>

      {/* ─ desktop table ─ */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ชนิดกีฬา</th>
              <th className="px-4 py-3">รอบ</th>
              <th className="px-4 py-3">คู่แข่ง</th>
              <th className="px-4 py-3 text-center">ผล</th>
              <th className="px-4 py-3">สถานะ</th>
              {showActions && <th className="px-4 py-3">ดำเนินการ</th>}
              {canEditAny && <th className="px-4 py-3">ตาราง</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((m) => {
                const editable =
                  m.status !== "completed" &&
                  m.status !== "cancelled" &&
                  (canEditAny || (isReferee && assignedSports.includes(m.sport_id)));

                return (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{m.match_date ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-800">{sportLabel[m.sport_id] ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{ROUND_LABELS[m.round] ?? m.round}</div>
                      {m.match_no && <div className="text-xs text-slate-400">{m.match_no}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {m.team_a_id || m.team_b_id
                        ? (m.team_a_id ? teamLabel[m.team_a_id] : "-") +
                          " vs " +
                          (m.team_b_id ? teamLabel[m.team_b_id] : "-")
                        : (m.notes ?? "- vs -")}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-800">
                      {m.score_a ?? 0} - {m.score_b ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {m.status ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] ?? "bg-slate-100"}`}>
                          {STATUS_LABELS[m.status]}
                        </span>
                      ) : "-"}
                    </td>
                    {showActions && (
                      <td className="px-4 py-3">
                        {editable ? (
                          <MatchScoreEntry
                            matchId={m.id}
                            initialScoreA={m.score_a}
                            initialScoreB={m.score_b}
                            initialStatus={m.status as "scheduled" | "ongoing" | "completed" | "cancelled"}
                            teamAId={m.team_a_id}
                            teamBId={m.team_b_id}
                            teamAName={m.team_a_id ? teamLabel[m.team_a_id] : undefined}
                            teamBName={m.team_b_id ? teamLabel[m.team_b_id] : undefined}
                            initialCheckedInA={m.team_a_checked_in}
                            initialCheckedInB={m.team_b_checked_in}
                          />
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                    )}
                    {canEditAny && (
                      <td className="px-4 py-3">
                        <MatchScheduleEdit
                          matchId={m.id}
                          initialDate={m.match_date ?? null}
                          initialVenue={m.venue ?? null}
                          initialNotes={m.notes ?? null}
                          initialMatchNo={m.match_no ?? null}
                          sportLabel={sportLabel[m.sport_id] ?? ""}
                        />
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-slate-400">
                  {hasFilter ? "ไม่มีแมตช์ที่ตรงกับตัวกรองที่เลือก" : "ยังไม่มีตารางแข่งในระบบ"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

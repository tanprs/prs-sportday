"use client";

import { useState, useMemo } from "react";

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
};

type Props = {
  matches: Match[];
  sportLabel: Record<string, string>; // sport_id → full label
  sportName: Record<string, string>;  // sport_id → name (for filter)
  teamLabel: Record<string, string>;  // team_id → label
};

const STATUS_LABELS: Record<string, string> = {
  scheduled: "รอแข่ง", ongoing: "กำลังแข่ง", completed: "จบแล้ว", cancelled: "ยกเลิก",
};
const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-500",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};
const ROUND_LABELS: Record<string, string> = {
  qualifier: "รอบคัดเลือก", final: "รอบชิง",
};

export default function PublicSchedule({ matches, sportLabel, sportName, teamLabel }: Props) {
  const [filterDate, setFilterDate] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterRound, setFilterRound] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

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

  const hasFilter = filterDate || filterSport || filterRound || filterStatus;

  function clear() {
    setFilterDate(""); setFilterSport(""); setFilterRound(""); setFilterStatus("");
  }

  return (
    <div className="space-y-3">
      {/* filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">📅 ทุกวัน</option>
          {dates.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <select value={filterSport} onChange={(e) => setFilterSport(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">🏅 ทุกชนิดกีฬา</option>
          {sportNames.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        <select value={filterRound} onChange={(e) => setFilterRound(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">🔄 ทุกรอบ</option>
          <option value="qualifier">รอบคัดเลือก</option>
          <option value="final">รอบชิง</option>
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">
          <option value="">📋 ทุกสถานะ</option>
          <option value="scheduled">รอแข่ง</option>
          <option value="ongoing">กำลังแข่ง</option>
          <option value="completed">จบแล้ว</option>
          <option value="cancelled">ยกเลิก</option>
        </select>

        {hasFilter && (
          <button onClick={clear}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
            ✕ ล้าง
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{filtered.length} / {matches.length} แมตช์</span>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3">วันที่</th>
              <th className="px-4 py-3">ชนิดกีฬา</th>
              <th className="px-4 py-3">รอบ</th>
              <th className="px-4 py-3">คู่แข่ง</th>
              <th className="px-4 py-3 text-center">ผล</th>
              <th className="px-4 py-3">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? filtered.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{m.match_date ?? "-"}</td>
                <td className="px-4 py-3 text-slate-800">{sportLabel[m.sport_id] ?? "-"}</td>
                <td className="px-4 py-3 text-slate-600">
                  <div>{ROUND_LABELS[m.round] ?? m.round}</div>
                  {m.match_no && <div className="text-xs text-slate-400">{m.match_no}</div>}
                </td>
                <td className="px-4 py-3 text-slate-800">
                  {m.team_a_id || m.team_b_id
                    ? (m.team_a_id ? teamLabel[m.team_a_id] ?? "-" : "-") +
                      " vs " +
                      (m.team_b_id ? teamLabel[m.team_b_id] ?? "-" : "-")
                    : (m.notes ?? "- vs -")}
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-700">
                  {m.status === "completed" ? `${m.score_a ?? 0} - ${m.score_b ?? 0}` : "-"}
                </td>
                <td className="px-4 py-3">
                  {m.status ? (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] ?? "bg-slate-100"}`}>
                      {STATUS_LABELS[m.status]}
                    </span>
                  ) : "-"}
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {hasFilter ? "ไม่มีแมตช์ที่ตรงกับตัวกรอง" : "ยังไม่มีตารางแข่งขัน"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

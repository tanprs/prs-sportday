import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DailyResultsPublic from "@/components/DailyResultsPublic";
import PublicSchedule from "@/components/PublicSchedule";

export default async function ScoreboardPage() {
  const supabase = await createClient();

  // ── 1. Standings ──────────────────────────────────────────────────────────
  const { data: houses } = await supabase
    .from("houses")
    .select("house_color, name_th, primary_hex");

  const { data: completedMatches } = await supabase
    .from("matches")
    .select("winner_id")
    .eq("status", "completed");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, house_color, team_name")
    .in("status", ["approved", "locked"]);

  const houseColorByTeamId = new Map(
    (teams ?? []).map((t) => [t.id, t.house_color])
  );
  const teamLabelMap = new Map(
    (teams ?? []).map((t) => [t.id, t.team_name ?? t.house_color ?? "-"])
  );

  const wins: Record<string, number> = {};
  for (const m of completedMatches ?? []) {
    if (!m.winner_id) continue;
    const color = houseColorByTeamId.get(m.winner_id);
    if (!color) continue;
    wins[color] = (wins[color] ?? 0) + 1;
  }

  const standings = (houses ?? [])
    .map((h) => ({ ...h, wins: wins[h.house_color] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  // ── 2. Schedule ───────────────────────────────────────────────────────────
  const { data: allMatches } = await supabase
    .from("matches")
    .select(
      "id, round, match_no, score_a, score_b, status, match_date, venue, notes, sport_id, team_a_id, team_b_id"
    )
    .order("match_date", { ascending: true })
    .limit(300);

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name, gender_type");

  const sportLabel: Record<string, string> = {};
  const sportName: Record<string, string> = {};
  for (const s of sports ?? []) {
    const gender = s.gender_type === "male" ? " (ชาย)" : s.gender_type === "female" ? " (หญิง)" : "";
    sportLabel[s.id] = `${s.name}${gender}`;
    sportName[s.id] = s.name;
  }

  const teamLabel: Record<string, string> = Object.fromEntries(teamLabelMap);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-10">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            กีฬาสี 2569 — โรงเรียนผดุงราษฎร์
          </h1>
          <Link href="/login" className="text-sm text-slate-500 underline">
            เข้าสู่ระบบ
          </Link>
        </div>

        {/* ── Section 1: กระดานคะแนน ─────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">🏆 กระดานคะแนน</h2>
          <div className="space-y-3">
            {standings.length > 0 ? (
              standings.map((h, i) => (
                <div
                  key={h.house_color}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-sm text-slate-400">#{i + 1}</span>
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: h.primary_hex }} />
                    <span className="font-medium text-slate-900">{h.name_th}</span>
                  </div>
                  <span className="text-sm text-slate-500">{h.wins} ชนะ</span>
                </div>
              ))
            ) : (
              <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-400">
                ยังไม่มีผลการแข่งขัน
              </p>
            )}
          </div>
        </section>

        {/* ── Section 2: ตารางการแข่งขัน ─────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">📋 ตารางการแข่งขัน</h2>
          <PublicSchedule
            matches={allMatches ?? []}
            sportLabel={sportLabel}
            sportName={sportName}
            teamLabel={teamLabel}
          />
        </section>

        {/* ── Section 3: ผลการแข่งขันรายวัน ─────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">📅 ผลการแข่งขันรายวัน</h2>
          <DailyResultsPublic />
        </section>

      </div>
    </main>
  );
}

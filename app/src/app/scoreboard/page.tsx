import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ScoreboardPage() {
  const supabase = await createClient();

  const { data: houses } = await supabase
    .from("houses")
    .select("house_color, name_th, primary_hex");

  const { data: matches } = await supabase
    .from("matches")
    .select("status, winner_id")
    .eq("status", "completed");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, house_color")
    .in("status", ["approved", "locked"]);

  const houseColorByTeamId = new Map(
    (teams ?? []).map((t) => [t.id, t.house_color])
  );

  const wins: Record<string, number> = {};
  for (const m of matches ?? []) {
    if (!m.winner_id) continue;
    const color = houseColorByTeamId.get(m.winner_id);
    if (!color) continue;
    wins[color] = (wins[color] ?? 0) + 1;
  }

  const standings = (houses ?? [])
    .map((h) => ({ ...h, wins: wins[h.house_color] ?? 0 }))
    .sort((a, b) => b.wins - a.wins);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">
            กระดานคะแนน — กีฬาสี 2569
          </h1>
          <Link href="/login" className="text-sm text-slate-500 underline">
            เข้าสู่ระบบ
          </Link>
        </div>

        <div className="mt-6 space-y-3">
          {standings.length > 0 ? (
            standings.map((h, i) => (
              <div
                key={h.house_color}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">#{i + 1}</span>
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: h.primary_hex }}
                  />
                  <span className="font-medium text-slate-900">
                    {h.name_th}
                  </span>
                </div>
                <span className="text-sm text-slate-500">{h.wins} ชนะ</span>
              </div>
            ))
          ) : (
            <p className="text-center text-slate-400">ยังไม่มีผลการแข่งขัน</p>
          )}
        </div>
      </div>
    </main>
  );
}

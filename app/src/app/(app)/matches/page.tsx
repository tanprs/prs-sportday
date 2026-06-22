import { createClient } from "@/lib/supabase/server";

const STATUS_LABELS_TH: Record<string, string> = {
  scheduled: "รอแข่ง",
  ongoing: "กำลังแข่ง",
  completed: "จบแล้ว",
  cancelled: "ยกเลิก",
};

const ROUND_LABELS_TH: Record<string, string> = {
  qualifier: "รอบคัดเลือก",
  final: "รอบชิงชนะเลิศ",
};

export default async function MatchesPage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, round, score_a, score_b, status, match_date, sport_id, team_a_id, team_b_id"
    )
    .order("match_date", { ascending: true })
    .limit(50);

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name");
  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, house_color");

  const sportName = new Map((sports ?? []).map((s) => [s.id, s.name]));
  const teamLabel = new Map(
    (teams ?? []).map((t) => [t.id, t.team_name ?? t.house_color ?? "-"])
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          ตารางแข่ง / ผลการแข่ง
        </h1>
        <p className="text-sm text-slate-500">
          แสดงรายการแข่งล่าสุด — ฟอร์มบันทึกผลสำหรับผู้ตัดสินจะเปิดใช้งานในเฟสถัดไป
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">วันที่</th>
              <th className="px-4 py-2">ชนิดกีฬา</th>
              <th className="px-4 py-2">รอบ</th>
              <th className="px-4 py-2">คู่แข่ง</th>
              <th className="px-4 py-2">ผล</th>
              <th className="px-4 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {matches && matches.length > 0 ? (
              matches.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{m.match_date ?? "-"}</td>
                  <td className="px-4 py-2">
                    {sportName.get(m.sport_id) ?? "-"}
                  </td>
                  <td className="px-4 py-2">{ROUND_LABELS_TH[m.round]}</td>
                  <td className="px-4 py-2">
                    {(m.team_a_id ? teamLabel.get(m.team_a_id) : "-") +
                      " vs " +
                      (m.team_b_id ? teamLabel.get(m.team_b_id) : "-")}
                  </td>
                  <td className="px-4 py-2">
                    {m.score_a ?? 0} - {m.score_b ?? 0}
                  </td>
                  <td className="px-4 py-2">
                    {m.status ? STATUS_LABELS_TH[m.status] : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  ยังไม่มีตารางแข่งในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { HOUSE_LABELS_TH } from "@/lib/auth";

const STATUS_LABELS_TH: Record<string, string> = {
  draft: "ฉบับร่าง",
  submitted: "ส่งแล้ว รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกตีกลับ",
  locked: "ปิดรายชื่อ",
};

export default async function TeamsPage() {
  const supabase = await createClient();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, house_color, status, sport_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name");

  const sportName = new Map((sports ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          ทีม / การลงทะเบียน
        </h1>
        <p className="text-sm text-slate-500">
          แสดงรายการทีมล่าสุด — ฟอร์มลงทะเบียนทีมจะเปิดใช้งานในเฟสถัดไป
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-2">ชนิดกีฬา</th>
              <th className="px-4 py-2">สี</th>
              <th className="px-4 py-2">ชื่อทีม</th>
              <th className="px-4 py-2">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {teams && teams.length > 0 ? (
              teams.map((team) => (
                <tr key={team.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    {sportName.get(team.sport_id) ?? "-"}
                  </td>
                  <td className="px-4 py-2">
                    {team.house_color
                      ? HOUSE_LABELS_TH[team.house_color] ?? team.house_color
                      : "-"}
                  </td>
                  <td className="px-4 py-2">{team.team_name ?? "-"}</td>
                  <td className="px-4 py-2">
                    {team.status ? STATUS_LABELS_TH[team.status] : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                  ยังไม่มีทีมในระบบ
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

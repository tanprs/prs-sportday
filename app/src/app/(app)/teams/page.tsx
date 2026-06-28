import { createClient } from "@/lib/supabase/server";
import { HOUSE_LABELS_TH, getCurrentProfile } from "@/lib/auth";
import { TeamRegistration } from "@/components/TeamRegistration";

const STATUS_LABELS_TH: Record<string, string> = {
  draft: "ฉบับร่าง",
  submitted: "ส่งแล้ว รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ถูกตีกลับ",
  locked: "ปิดรายชื่อ",
};

const CAN_REGISTER_ROLES = ["admin", "teacher", "house_teacher", "sport_captain", "house_captain"];

export default async function TeamsPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, house_color, status, sport_id")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name, category, grade_group, gender_type, team_size, sub_grade_quota, is_active, sort_order");

  const sportName = new Map((sports ?? []).map((s) => [s.id, s.name]));

  // ส่งรายชื่อกีฬาที่ active (เรียงตาม sort_order) ลงไปให้ TeamRegistration ใช้ได้
  // ตั้งแต่ render แรก — ไม่ต้องให้ client component ไป fetch เองตอน mount
  const initialSports = (sports ?? [])
    .filter((s) => s.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      grade_group: s.grade_group,
      gender_type: s.gender_type,
      team_size: s.team_size,
      sub_grade_quota: s.sub_grade_quota as Record<string, number> | null,
    }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          ทีม / การลงทะเบียน
        </h1>
        <p className="text-sm text-slate-500">
          แสดงรายการทีมล่าสุด {!profile || !CAN_REGISTER_ROLES.includes(profile.role) ? "" : "— เลื่อนลงเพื่อลงทะเบียนทีมด้วยการสแกน QR"}
        </p>
      </div>

      {profile && CAN_REGISTER_ROLES.includes(profile.role) && (
        <TeamRegistration
          currentUserId={profile.id}
          role={profile.role}
          houseColor={profile.house_color}
          initialSports={initialSports}
        />
      )}

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

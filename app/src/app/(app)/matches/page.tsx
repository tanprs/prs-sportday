import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { MatchesTable } from "@/components/MatchesTable";

export default async function MatchesPage() {
  const supabase = await createClient();
  const profile = await getCurrentProfile();

  const canEditAny = !!profile && ["admin", "teacher"].includes(profile.role);
  const isReferee = profile?.role === "referee";
  const assignedSports: string[] = profile?.assigned_sports ?? [];
  const showActions = canEditAny || isReferee;

  const { data: matches } = await supabase
    .from("matches")
    .select(
      "id, round, match_no, score_a, score_b, status, match_date, venue, notes, sport_id, team_a_id, team_b_id"
    )
    .order("match_date", { ascending: true })
    .limit(200);

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name, gender_type");
  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, house_color");

  // sport_id → full label (ฟุตซอล ม.1-2 (ชาย))
  const sportLabel: Record<string, string> = {};
  // sport_id → name only (ฟุตซอล) — for filter grouping
  const sportName: Record<string, string> = {};
  for (const s of sports ?? []) {
    const gender = s.gender_type === "male" ? " (ชาย)" : s.gender_type === "female" ? " (หญิง)" : "";
    sportLabel[s.id] = `${s.name}${gender}`;
    sportName[s.id] = s.name;
  }

  const teamLabel: Record<string, string> = {};
  for (const t of teams ?? []) {
    teamLabel[t.id] = t.team_name ?? t.house_color ?? "-";
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          ตารางแข่ง / ผลการแข่ง
        </h1>
        {showActions && (
          <p className="mt-1 text-sm text-slate-500">
            {canEditAny
              ? "กดปุ่ม 'บันทึกผล' เพื่อบันทึกคะแนนและสถานะ"
              : "กดปุ่ม 'บันทึกผล' สำหรับกีฬาที่ได้รับมอบหมาย"}
          </p>
        )}
      </div>

      <MatchesTable
        matches={matches ?? []}
        sportLabel={sportLabel}
        sportName={sportName}
        teamLabel={teamLabel}
        canEditAny={canEditAny}
        showActions={showActions}
        assignedSports={assignedSports}
        isReferee={isReferee}
      />
    </div>
  );
}

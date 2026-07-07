import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { MatchScoreEntry } from "@/components/MatchScoreEntry";

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

const STATUS_BADGE: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-600",
  ongoing: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-600",
};

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
      "id, round, score_a, score_b, status, match_date, venue, sport_id, team_a_id, team_b_id"
    )
    .order("match_date", { ascending: true })
    .limit(200);

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name, gender_type");
  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, house_color");

  const sportLabel = new Map(
    (sports ?? []).map((s) => [s.id, `${s.name}${s.gender_type === "male" ? " (ชาย)" : s.gender_type === "female" ? " (หญิง)" : ""}`])
  );
  const teamLabel = new Map(
    (teams ?? []).map((t) => [t.id, t.team_name ?? t.house_color ?? "-"])
  );

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
              {showActions && <th className="px-4 py-3">ดำเนินการ</th>}
            </tr>
          </thead>
          <tbody>
            {matches && matches.length > 0 ? (
              matches.map((m) => {
                const editable =
                  m.status !== "completed" &&
                  m.status !== "cancelled" &&
                  (canEditAny ||
                    (isReferee && assignedSports.includes(m.sport_id)));

                return (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">
                      {m.match_date ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {sportLabel.get(m.sport_id) ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ROUND_LABELS_TH[m.round] ?? m.round}
                    </td>
                    <td className="px-4 py-3 text-slate-800">
                      {(m.team_a_id ? teamLabel.get(m.team_a_id) : "-") +
                        " vs " +
                        (m.team_b_id ? teamLabel.get(m.team_b_id) : "-")}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-slate-800">
                      {m.score_a ?? 0} - {m.score_b ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {m.status ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[m.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {STATUS_LABELS_TH[m.status]}
                        </span>
                      ) : (
                        "-"
                      )}
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
                          />
                        ) : (
                          <span className="text-xs text-slate-300">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={showActions ? 7 : 6}
                  className="px-4 py-8 text-center text-slate-400"
                >
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

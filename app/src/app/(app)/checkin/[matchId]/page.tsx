import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CheckinScanner } from "@/components/CheckinScanner";

export default async function CheckinPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params;
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "teacher", "referee"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: match } = await supabase
    .from("matches")
    .select("id, sport_id, round, match_no, team_a_id, team_b_id, team_a_checked_in, team_b_checked_in, match_date, venue")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) redirect("/matches");

  const { data: sport } = await supabase
    .from("sport_types")
    .select("name, grade_group, gender_type, team_size")
    .eq("id", match.sport_id)
    .maybeSingle();

  const { data: teams } = await supabase
    .from("teams")
    .select("id, team_name, house_color")
    .in("id", [match.team_a_id, match.team_b_id].filter(Boolean) as string[]);

  // นับ check-in ปัจจุบัน
  const { data: checkins } = await supabase
    .from("match_checkins")
    .select("student_id, team_id, students(full_name)")
    .eq("match_id", matchId);

  const teamMap = Object.fromEntries((teams ?? []).map((t) => [t.id, t]));

  const teamA = match.team_a_id ? teamMap[match.team_a_id] : null;
  const teamB = match.team_b_id ? teamMap[match.team_b_id] : null;

  const checkinsA = (checkins ?? []).filter((c) => c.team_id === match.team_a_id);
  const checkinsB = (checkins ?? []).filter((c) => c.team_id === match.team_b_id);

  const sportLabel = sport
    ? `${sport.name} ${sport.grade_group}${sport.gender_type === "male" ? " (ชาย)" : sport.gender_type === "female" ? " (หญิง)" : ""}`
    : "–";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">📋 รายงานตัวก่อนแข่ง</h1>
        <p className="mt-0.5 text-sm text-slate-500">{sportLabel} · {match.match_date ?? "–"} · {match.venue ?? "–"}</p>
      </div>

      <CheckinScanner
        matchId={matchId}
        teamAId={match.team_a_id}
        teamBId={match.team_b_id}
        teamAName={teamA?.team_name ?? teamA?.house_color ?? "ทีม A"}
        teamBName={teamB?.team_name ?? teamB?.house_color ?? "ทีม B"}
        teamACheckedIn={match.team_a_checked_in}
        teamBCheckedIn={match.team_b_checked_in}
        required={sport?.team_size ?? null}
        initialCheckinsA={checkinsA.map((c) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (c.students as any)?.full_name ?? "–",
        }))}
        initialCheckinsB={checkinsB.map((c) => ({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          name: (c.students as any)?.full_name ?? "–",
        }))}
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getCurrentProfile, ROLE_LABELS_TH } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { RefereeProfilePanel } from "@/components/RefereeProfilePanel";
import { ChangePasswordPanel } from "@/components/ChangePasswordPanel";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const isReferee = profile.role === "referee";

  const sportOptions = isReferee
    ? await (async () => {
        const { data: sports } = await supabase
          .from("sport_types")
          .select("id, name, grade_group, gender_type")
          .order("name")
          .order("grade_group");
        return (sports ?? []).map((s) => {
          const gender =
            s.gender_type === "male" ? " (ชาย)" : s.gender_type === "female" ? " (หญิง)" : "";
          return { id: s.id, label: `${s.name} ${s.grade_group}${gender}` };
        });
      })()
    : [];

  const currentSports = (profile.assigned_sports as string[] | null) ?? [];

  return (
    <div className="max-w-xl space-y-6">
      {/* header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">โปรไฟล์</h1>
      </div>

      {/* profile card */}
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm shrink-0">
          {profile.full_name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-900">{profile.full_name}</p>
          <p className="text-xs text-slate-400">{ROLE_LABELS_TH[profile.role] ?? profile.role}</p>
        </div>
      </div>

      {/* เปลี่ยนรหัสผ่าน (ทุก role) */}
      <ChangePasswordPanel />

      {/* sport picker — referee เท่านั้น */}
      {isReferee && (
        <>
          <div>
            <h2 className="text-base font-semibold text-slate-900">กีฬาที่ฉันรับผิดชอบ</h2>
            <p className="mt-1 text-sm text-slate-500">
              เลือกชนิดกีฬาที่คุณเป็นผู้ตัดสิน — จะปรากฏในหน้าตารางแข่งเพื่อบันทึกผลได้
            </p>
          </div>
          <RefereeProfilePanel currentSports={currentSports} sports={sportOptions} />
        </>
      )}
    </div>
  );
}

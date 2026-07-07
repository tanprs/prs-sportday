import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SyncRosterButton } from "@/components/SyncRosterButton";
import { StudentInviteManager } from "@/components/StudentInviteManager";
import { TeamApprovalManager } from "@/components/TeamApprovalManager";
import { RegistrationWindowManager } from "@/components/RegistrationWindowManager";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "teacher", "house_teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const isHouseTeacher = profile.role === "house_teacher";
  const supabase = await createClient();

  // pending count — house_teacher เห็นเฉพาะสีตัวเอง
  let pendingQuery = supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("status", "submitted");
  if (isHouseTeacher && profile.house_color) {
    pendingQuery = pendingQuery.eq("house_color", profile.house_color);
  }

  const [
    { count: pendingTeams },
    { count: totalStudents },
    { count: totalUsers },
  ] = await Promise.all([
    pendingQuery,
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">ผู้ดูแลระบบ</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">ทีมรออนุมัติ</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {pendingTeams ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">นักเรียนในระบบ</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totalStudents ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">ผู้ใช้งานทั้งหมด</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {totalUsers ?? 0}
          </p>
        </div>
      </div>

      <TeamApprovalManager
        currentUserId={profile.id}
        currentUserRole={profile.role}
        currentHouseColor={profile.house_color ?? null}
      />

      {/* RegistrationWindowManager แสดงเฉพาะ admin/teacher */}
      {!isHouseTeacher && (
        <>
          <RegistrationWindowManager currentUserId={profile.id} />
          <SyncRosterButton />
          <StudentInviteManager currentUserId={profile.id} />
        </>
      )}
    </div>
  );
}

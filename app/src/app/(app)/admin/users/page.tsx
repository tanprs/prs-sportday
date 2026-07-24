import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { UserManagePanel } from "@/components/UserManagePanel";

export default async function UserManagePage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const supabase = await createClient();

  // ดึงผู้ใช้ทั้งหมด + username จาก sso_identities
  const { data: users } = await supabase
    .from("user_profiles")
    .select("id, full_name, role, house_color, assigned_sports, is_active")
    .order("role")
    .order("full_name");

  const { data: ssoLinks } = await supabase
    .from("sso_identities")
    .select("auth_user_id, username");

  const usernameMap = new Map(
    (ssoLinks ?? []).map((s) => [s.auth_user_id, s.username])
  );

  const userRows = (users ?? []).map((u) => ({
    ...u,
    username: usernameMap.get(u.id) ?? null,
    assigned_sports: u.assigned_sports as string[] | null,
    is_active: u.is_active ?? true,
  }));

  // ดึง sport_types สำหรับ multi-select ของ referee
  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name, grade_group, gender_type")
    .order("name")
    .order("grade_group");

  const sportOptions = (sports ?? []).map((s) => {
    const gender = s.gender_type === "male" ? " (ชาย)" : s.gender_type === "female" ? " (หญิง)" : "";
    return { id: s.id, label: `${s.name} ${s.grade_group}${gender}` };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-sm text-slate-400 hover:text-slate-600">
          ← ผู้ดูแลระบบ
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">จัดการผู้ใช้งาน</h1>
        <p className="mt-1 text-sm text-slate-500">
          ครู/กรรมการต้อง <strong>login ผ่าน SSO ก่อน</strong> จึงจะปรากฏรายชื่อที่นี่
          — จากนั้นแอดมินตั้งค่าบทบาท/สี/กีฬาที่รับผิดชอบได้
        </p>
      </div>

      {/* สรุป */}
      <div className="grid gap-3 sm:grid-cols-4 text-center">
        {["admin","teacher","house_teacher","referee"].map((r) => {
          const count = userRows.filter((u) => u.role === r).length;
          const labels: Record<string, string> = {
            admin: "แอดมิน", teacher: "ครูกีฬาสี",
            house_teacher: "ครูประจำสี", referee: "กรรมการ",
          };
          return (
            <div key={r} className="rounded-xl border border-slate-200 bg-white py-3">
              <p className="text-2xl font-semibold text-slate-900">{count}</p>
              <p className="text-xs text-slate-500 mt-0.5">{labels[r]}</p>
            </div>
          );
        })}
      </div>

      <UserManagePanel
        users={userRows}
        sports={sportOptions}
        currentUserId={profile.id}
      />
    </div>
  );
}

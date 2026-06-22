import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const [
    { count: pendingTeams },
    { count: totalStudents },
    { count: totalUsers },
  ] = await Promise.all([
    supabase
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("status", "submitted"),
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

      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
        การจัดการผู้ใช้ การอนุมัติทีม และการตั้งค่าช่วงเวลาลงทะเบียน จะเปิดใช้งานในเฟสถัดไป
        นักเรียนจะถูกซิงค์เข้าระบบอัตโนมัติจากระบบเช็คชื่อ QR Code
        เมื่อตั้งค่า Edge Function เสร็จสมบูรณ์ (ดู Phase 2 ขั้นต่อไป)
      </div>
    </div>
  );
}

import Link from "next/link";
import { getCurrentProfile, ROLE_LABELS_TH } from "@/lib/auth";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const isStaff = !!profile && ["admin", "teacher"].includes(profile.role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          สวัสดี, {profile?.full_name}
        </h1>
        <p className="text-slate-500">
          บทบาท: {profile ? ROLE_LABELS_TH[profile.role] ?? profile.role : "-"}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/teams"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
        >
          <h2 className="font-medium text-slate-900">ทีม / การลงทะเบียน</h2>
          <p className="mt-1 text-sm text-slate-500">
            ดูทีมและการลงทะเบียนนักกีฬาในระบบ
          </p>
        </Link>
        <Link
          href="/matches"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
        >
          <h2 className="font-medium text-slate-900">ตารางแข่ง / ผลการแข่ง</h2>
          <p className="mt-1 text-sm text-slate-500">
            ดูตารางการแข่งขันและผลล่าสุด
          </p>
        </Link>
        <Link
          href="/scoreboard"
          className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
        >
          <h2 className="font-medium text-slate-900">กระดานคะแนน</h2>
          <p className="mt-1 text-sm text-slate-500">
            หน้าสาธารณะสำหรับแสดงผลคะแนนรวมแต่ละสี
          </p>
        </Link>
        {isStaff && (
          <Link
            href="/admin"
            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-slate-300"
          >
            <h2 className="font-medium text-slate-900">ผู้ดูแลระบบ</h2>
            <p className="mt-1 text-sm text-slate-500">
              จัดการผู้ใช้ ทีม และการตั้งค่าการลงทะเบียน
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

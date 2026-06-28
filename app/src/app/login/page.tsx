import Link from "next/link";
import { ssoLogin } from "@/lib/actions/sso";
import { claimStudentAccount, studentLogin } from "@/lib/actions/studentAuth";
import { LoginTabs } from "@/components/LoginTabs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
    studentError?: string;
    studentCode?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-slate-500">กีฬาสี 2569</p>

        <div className="mt-6">
          <LoginTabs
            ssoLoginAction={ssoLogin}
            studentLoginAction={studentLogin}
            claimStudentAccountAction={claimStudentAccount}
            next={params.next ?? ""}
            staffError={params.error}
            staffMessage={params.message}
            studentError={params.studentError}
            studentCodePrefill={params.studentCode}
            defaultTab={params.studentError || params.studentCode ? "student" : "staff"}
          />
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          <Link href="/scoreboard" className="underline">
            ดูผลการแข่งขัน (ไม่ต้องเข้าสู่ระบบ)
          </Link>
        </p>
      </div>
    </main>
  );
}

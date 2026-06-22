import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">กีฬาสี 2569</h1>
        <p className="mt-2 text-slate-500">ระบบบริหารจัดการกีฬาสีโรงเรียน</p>
      </div>
      <div className="flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          เข้าสู่ระบบ
        </Link>
        <Link
          href="/scoreboard"
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ดูกระดานคะแนน
        </Link>
      </div>
    </main>
  );
}

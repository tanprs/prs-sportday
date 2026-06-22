import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, ROLE_LABELS_TH, HOUSE_LABELS_TH } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

const NAV_ITEMS: { href: string; label: string; roles: string[] | null }[] = [
  { href: "/dashboard", label: "หน้าหลัก", roles: null },
  { href: "/teams", label: "ทีม / การลงทะเบียน", roles: null },
  { href: "/matches", label: "ตารางแข่ง / ผลการแข่ง", roles: null },
  { href: "/admin", label: "ผู้ดูแลระบบ", roles: ["admin", "teacher"] },
];

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-wrap items-center gap-6">
            <span className="font-semibold text-slate-900">กีฬาสี 2569</span>
            <nav className="flex flex-wrap gap-4 text-sm">
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-slate-600 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>
              {profile.full_name} · {ROLE_LABELS_TH[profile.role] ?? profile.role}
              {profile.house_color
                ? ` · ${HOUSE_LABELS_TH[profile.house_color] ?? profile.house_color}`
                : ""}
            </span>
            <form action={logout}>
              <button className="rounded-md border border-slate-300 px-3 py-1 hover:bg-slate-100">
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}

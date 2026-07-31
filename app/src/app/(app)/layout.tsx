import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentProfile, ROLE_LABELS_TH, HOUSE_LABELS_TH } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";
import { getTheme } from "@/lib/theme";
import { MobileNav } from "@/components/MobileNav";

const NAV_ITEMS: { href: string; label: string; roles: string[] | null }[] = [
  { href: "/dashboard", label: "หน้าหลัก", roles: null },
  { href: "/teams", label: "ทีม / การลงทะเบียน", roles: null },
  { href: "/matches", label: "ตารางแข่ง / ผลการแข่ง", roles: null },
  { href: "/results", label: "สรุปผลรายวัน", roles: null },
  { href: "/admin", label: "ผู้ดูแลระบบ", roles: ["admin", "teacher"] },
  { href: "/profile", label: "โปรไฟล์", roles: null },
];

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const theme = getTheme(profile.house_color);

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(profile.role)
  );

  const userSub = [
    ROLE_LABELS_TH[profile.role] ?? profile.role,
    profile.house_color ? (HOUSE_LABELS_TH[profile.house_color] ?? profile.house_color) : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Header ── */}
      <header
        style={{
          backgroundColor: theme.headerBg,
          borderBottomColor: theme.headerBorder,
        }}
        className="border-b sticky top-0 z-30"
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          {/* Left: logo + title + desktop nav */}
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-white/30">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={theme.logoSrc}
                  alt={theme.logoName}
                  className="h-full w-full object-cover"
                />
              </div>
              <span className="font-semibold text-white text-sm sm:text-base">กีฬาสี 2569</span>
            </div>

            {/* Desktop nav — ซ่อนบนมือถือ */}
            <nav className="hidden md:flex flex-wrap gap-4 text-sm">
              {visibleNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-white/75 transition hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* user info — desktop only */}
            <span className="hidden md:block text-sm text-white/80">
              {profile.full_name} · {userSub}
            </span>

            {/* logout — desktop only */}
            <form action={logout} className="hidden md:block">
              <button
                style={{ borderColor: "rgba(255,255,255,0.35)" }}
                className="rounded-md border px-3 py-1 text-sm text-white/90 transition hover:bg-white/10"
              >
                ออกจากระบบ
              </button>
            </form>

            {/* hamburger — mobile only */}
            <MobileNav
              items={visibleNav}
              userName={profile.full_name}
              userSub={userSub}
              logoutAction={logout}
              headerBg={theme.headerBg}
            />
          </div>
        </div>

        {/* House color stripe */}
        {profile.house_color && (
          <div
            style={{ backgroundColor: theme.accent }}
            className="h-1 w-full opacity-80"
          />
        )}
      </header>

      <main className="mx-auto max-w-5xl px-3 sm:px-4 py-4 sm:py-8">{children}</main>
    </div>
  );
}

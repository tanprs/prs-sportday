"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = { href: string; label: string };

export function MobileNav({
  items,
  userName,
  userSub,
  logoutAction,
  headerBg,
}: {
  items: NavItem[];
  userName: string;
  userSub: string;
  logoutAction: () => Promise<void>;
  headerBg: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // ปิดเมนูเมื่อเปลี่ยนหน้า
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* hamburger button — แสดงเฉพาะมือถือ */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="เมนู"
        className="md:hidden flex flex-col justify-center items-center w-9 h-9 gap-1.5 rounded-lg hover:bg-white/10 transition"
      >
        <span
          className={`block h-0.5 w-5 bg-white transition-transform duration-200 ${open ? "translate-y-2 rotate-45" : ""}`}
        />
        <span
          className={`block h-0.5 w-5 bg-white transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
        />
        <span
          className={`block h-0.5 w-5 bg-white transition-transform duration-200 ${open ? "-translate-y-2 -rotate-45" : ""}`}
        />
      </button>

      {/* dropdown overlay */}
      {open && (
        <>
          {/* backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* menu panel */}
          <div
            style={{ backgroundColor: headerBg }}
            className="md:hidden fixed left-0 right-0 top-[57px] z-50 border-t border-white/10 shadow-xl"
          >
            <nav>
              {items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-5 py-3.5 text-sm border-b border-white/10 transition ${
                    pathname.startsWith(item.href)
                      ? "text-white font-medium bg-white/10"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            {/* user info + logout */}
            <div className="px-5 py-3 flex items-center justify-between">
              <span className="text-xs text-white/60">{userName} · {userSub}</span>
              <form action={logoutAction}>
                <button
                  className="rounded-md border border-white/30 px-3 py-1.5 text-xs text-white/90 hover:bg-white/10"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}

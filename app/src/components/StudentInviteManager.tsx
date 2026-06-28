"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS_TH } from "@/lib/labels";

// แอดมิน/ครูค้นหานักเรียนจากตาราง students (sync มาจากระบบเช็คชื่อ) แล้วออก
// "รหัสยืนยัน" (claim_code) ให้เฉพาะคนที่ต้องใช้งานจริง (หัวหน้าชนิดกีฬา/
// หัวหน้าสี) — นักเรียนเอารหัสนี้ไปผูกบัญชีเองที่หน้า /login (ดู
// studentAuth.ts: claimStudentAccount) อ่าน/เขียนตรงผ่าน RLS ของตาราง
// student_login_invites ไม่ต้องผ่าน server action ใหม่

// ตัดอักษรที่อ่านสับสนง่ายออก (0/O, 1/I/l) เพราะนักเรียนต้องพิมพ์กลับเอง
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateClaimCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

type StudentRow = {
  id: string;
  student_code: string;
  full_name: string;
  classroom: string;
  house_color: string | null;
};

type InviteRow = {
  id: string;
  student_code: string;
  claim_code: string;
  role: string;
  claimed_at: string | null;
  expires_at: string;
  created_at: string;
  students: { full_name: string; classroom: string } | null;
};

const ISSUABLE_ROLES = ["sport_captain", "house_captain"] as const;

function inviteStatus(invite: InviteRow): { label: string; className: string } {
  if (invite.claimed_at) {
    return { label: "ใช้แล้ว", className: "bg-slate-100 text-slate-600" };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { label: "หมดอายุ", className: "bg-amber-50 text-amber-700" };
  }
  return { label: "รอใช้งาน", className: "bg-emerald-50 text-emerald-700" };
}

export function StudentInviteManager({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<StudentRow[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [role, setRole] = useState<(typeof ISSUABLE_ROLES)[number]>("sport_captain");
  const [issuing, setIssuing] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issueError, setIssueError] = useState<string | null>(null);

  const [invites, setInvites] = useState<InviteRow[] | null>(null);
  const [loadingInvites, setLoadingInvites] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    setSearching(true);
    setSearchError(null);
    setResults([]);
    const { data, error } = await supabase
      .from("students")
      .select("id, student_code, full_name, classroom, house_color")
      .or(`student_code.ilike.%${term}%,full_name.ilike.%${term}%`)
      .limit(10);
    setSearching(false);
    if (error) {
      setSearchError("ค้นหาไม่สำเร็จ: " + error.message);
      return;
    }
    setResults(data ?? []);
  }

  async function loadInvites() {
    setLoadingInvites(true);
    const { data } = await supabase
      .from("student_login_invites")
      .select("id, student_code, claim_code, role, claimed_at, expires_at, created_at, students(full_name, classroom)")
      .order("created_at", { ascending: false })
      .limit(20);
    setLoadingInvites(false);
    setInvites((data as unknown as InviteRow[]) ?? []);
  }

  async function handleIssue() {
    if (!selected) return;
    setIssuing(true);
    setIssueError(null);
    setIssuedCode(null);

    // ลบรหัสที่ยังไม่ถูกใช้ของนักเรียนคนนี้ก่อน (ถ้ามี) — กันชนกับ unique
    // index ที่อนุญาตรหัสค้างอยู่ได้แค่ 1 รหัสต่อคน (ดู 0007 migration)
    await supabase
      .from("student_login_invites")
      .delete()
      .eq("student_code", selected.student_code)
      .is("claimed_at", null);

    const code = generateClaimCode();
    const { error } = await supabase.from("student_login_invites").insert({
      student_code: selected.student_code,
      claim_code: code,
      role,
      created_by: currentUserId,
    });

    setIssuing(false);
    if (error) {
      setIssueError("ออกรหัสไม่สำเร็จ: " + error.message);
      return;
    }
    setIssuedCode(code);
    if (invites) loadInvites();
  }

  async function handleRevoke(inviteId: string) {
    await supabase.from("student_login_invites").delete().eq("id", inviteId);
    loadInvites();
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-medium text-slate-900">ออกรหัสเข้าระบบให้นักเรียน</p>
        <p className="mt-0.5 text-sm text-slate-500">
          ใช้สำหรับนักเรียนที่ต้องล็อกอินเข้าระบบกีฬาสี (หัวหน้าชนิดกีฬา/หัวหน้าสี) แต่ไม่มีบัญชีในระบบเช็คชื่อ
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาด้วยรหัสนักเรียนหรือชื่อ"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={searching}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {searching ? "กำลังค้นหา..." : "ค้นหา"}
        </button>
      </form>

      {searchError && <p className="text-sm text-red-600">{searchError}</p>}

      {results.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
          {results.map((s) => (
            <li
              key={s.id}
              className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                selected?.id === s.id ? "bg-indigo-50" : ""
              }`}
            >
              <div>
                <span className="font-medium text-slate-900">{s.full_name}</span>{" "}
                <span className="text-slate-500">
                  ({s.student_code} · {s.classroom})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelected(s);
                  setIssuedCode(null);
                  setIssueError(null);
                }}
                className="shrink-0 rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                เลือก
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="rounded-md border border-indigo-200 bg-indigo-50/50 p-4">
          <p className="text-sm text-slate-700">
            กำลังออกรหัสให้ <span className="font-semibold">{selected.full_name}</span> ({selected.student_code})
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="text-sm text-slate-600">บทบาท</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            >
              {ISSUABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS_TH[r] ?? r}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleIssue}
              disabled={issuing}
              className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {issuing ? "กำลังออกรหัส..." : "ออกรหัส"}
            </button>
          </div>

          {issueError && <p className="mt-2 text-sm text-red-600">{issueError}</p>}

          {issuedCode && (
            <div className="mt-3 rounded-md bg-white p-3 text-sm">
              <p className="text-slate-600">
                รหัสยืนยัน (แสดงครั้งนี้ครั้งเดียว — คัดลอก/แจ้งนักเรียนตอนนี้):
              </p>
              <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-indigo-700">
                {issuedCode}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                รหัสนักเรียน: {selected.student_code} · หมดอายุใน 14 วัน
              </p>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={loadInvites}
          className="text-sm font-medium text-indigo-600 hover:underline"
        >
          {invites ? "รีเฟรชรายการรหัสที่ออกไปแล้ว" : "ดูรายการรหัสที่ออกไปแล้ว"}
        </button>

        {loadingInvites && <p className="mt-2 text-sm text-slate-500">กำลังโหลด...</p>}

        {invites && invites.length === 0 && !loadingInvites && (
          <p className="mt-2 text-sm text-slate-500">ยังไม่มีรหัสที่ออกไป</p>
        )}

        {invites && invites.length > 0 && (
          <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
            {invites.map((inv) => {
              const status = inviteStatus(inv);
              return (
                <li key={inv.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-900">
                      {inv.students?.full_name ?? inv.student_code}
                    </span>{" "}
                    <span className="text-slate-500">
                      ({inv.student_code}) · {ROLE_LABELS_TH[inv.role] ?? inv.role}
                    </span>
                    <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  {!inv.claimed_at && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(inv.id)}
                      className="shrink-0 rounded-md border border-red-200 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      ยกเลิกรหัส
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

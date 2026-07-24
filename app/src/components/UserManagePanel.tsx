"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ROLE_LABELS_TH, HOUSE_LABELS_TH } from "@/lib/labels";

type UserRow = {
  id: string;
  full_name: string;
  role: string;
  house_color: string | null;
  assigned_sports: string[] | null;
  is_active: boolean;
  username: string | null;
};

type Sport = {
  id: string;
  label: string; // "ฟุตซอล ม.1-2 (ชาย)"
};

type Props = {
  users: UserRow[];
  sports: Sport[];
  currentUserId: string;
};

const EDITABLE_ROLES = [
  "teacher", "house_teacher", "sport_captain", "house_captain", "referee",
] as const;

const HOUSE_COLORS = ["red", "yellow", "green", "blue"] as const;

const ROLE_NEEDS_HOUSE: Record<string, boolean> = {
  house_teacher: true, house_captain: true, sport_captain: true,
};
const ROLE_NEEDS_SPORTS: Record<string, boolean> = {
  referee: true,
};

export function UserManagePanel({ users, sports, currentUserId }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [editing, setEditing] = useState<string | null>(null); // user id being edited
  const [draft, setDraft] = useState<Partial<UserRow>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  function openEdit(u: UserRow) {
    setEditing(u.id);
    setDraft({
      role: u.role,
      house_color: u.house_color,
      assigned_sports: u.assigned_sports ?? [],
      is_active: u.is_active,
      full_name: u.full_name,
    });
    setError(null);
    setSaved(null);
  }

  function toggleSport(sportId: string) {
    const cur = draft.assigned_sports ?? [];
    setDraft((d) => ({
      ...d,
      assigned_sports: cur.includes(sportId)
        ? cur.filter((s) => s !== sportId)
        : [...cur, sportId],
    }));
  }

  async function handleSave(userId: string) {
    setSaving(true);
    setError(null);

    const { error: err } = await supabase
      .from("user_profiles")
      .update({
        role: draft.role as "admin" | "teacher" | "house_teacher" | "sport_captain" | "house_captain" | "referee",
        is_active: draft.is_active ?? true,
        full_name: draft.full_name ?? "",
        house_color: ROLE_NEEDS_HOUSE[draft.role ?? ""] ? (draft.house_color ?? null) : null,
        assigned_sports: ROLE_NEEDS_SPORTS[draft.role ?? ""]
          ? (draft.assigned_sports?.length ? draft.assigned_sports : null)
          : null,
      })
      .eq("id", userId);

    setSaving(false);
    if (err) { setError(err.message); return; }
    setSaved(userId);
    setEditing(null);
    router.refresh();
  }

  const roleLabel = (r: string) => ROLE_LABELS_TH[r] ?? r;

  return (
    <div className="space-y-3">
      {users.map((u) => {
        const isMe = u.id === currentUserId;
        const isOpen = editing === u.id;

        return (
          <div
            key={u.id}
            className={`overflow-hidden rounded-xl border bg-white transition-all ${
              isOpen ? "border-indigo-300 shadow-sm" : "border-slate-200"
            }`}
          >
            {/* ── row ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex items-center gap-3">
                {/* active dot */}
                <span className={`h-2 w-2 rounded-full ${u.is_active ? "bg-emerald-400" : "bg-slate-300"}`} />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {u.full_name}
                    {isMe && <span className="ml-1.5 text-xs text-indigo-500">(คุณ)</span>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {u.username ? `@${u.username} · ` : ""}
                    {roleLabel(u.role)}
                    {u.house_color ? ` · ${HOUSE_LABELS_TH[u.house_color] ?? u.house_color}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {saved === u.id && (
                  <span className="text-xs text-emerald-600">✓ บันทึกแล้ว</span>
                )}
                {!isMe && (
                  <button
                    onClick={() => isOpen ? setEditing(null) : openEdit(u)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      isOpen
                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    {isOpen ? "ยกเลิก" : "แก้ไข"}
                  </button>
                )}
              </div>
            </div>

            {/* ── edit panel ── */}
            {isOpen && (
              <div className="border-t border-slate-100 bg-slate-50 px-4 py-4 space-y-4">
                {/* ชื่อ */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">ชื่อ-สกุล</label>
                  <input
                    type="text"
                    value={draft.full_name ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, full_name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>

                {/* บทบาท */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">บทบาท</label>
                  <select
                    value={draft.role ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value, house_color: null, assigned_sports: [] }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  >
                    {EDITABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS_TH[r] ?? r}</option>
                    ))}
                  </select>
                </div>

                {/* สี (ถ้าต้องการ) */}
                {ROLE_NEEDS_HOUSE[draft.role ?? ""] && (
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">สีบ้าน</label>
                    <select
                      value={draft.house_color ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, house_color: e.target.value || null }))}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    >
                      <option value="">— ไม่ระบุ —</option>
                      {HOUSE_COLORS.map((c) => (
                        <option key={c} value={c}>{HOUSE_LABELS_TH[c] ?? c}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* กีฬาที่รับผิดชอบ (referee) */}
                {ROLE_NEEDS_SPORTS[draft.role ?? ""] && (
                  <div>
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      กีฬาที่รับผิดชอบ ({(draft.assigned_sports ?? []).length} รายการ)
                    </label>
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-50">
                      {sports.map((s) => {
                        const checked = (draft.assigned_sports ?? []).includes(s.id);
                        return (
                          <label key={s.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-slate-50">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSport(s.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
                            />
                            <span className="text-sm text-slate-700">{s.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* สถานะ */}
                <div className="flex items-center gap-3">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={draft.is_active ?? true}
                      onChange={(e) => setDraft((d) => ({ ...d, is_active: e.target.checked }))}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-300"
                    />
                    เปิดใช้งานบัญชีนี้
                  </label>
                </div>

                {error && <p className="text-xs text-red-600">{error}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSave(u.id)}
                    disabled={saving}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {saving ? "กำลังบันทึก…" : "บันทึก"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {users.length === 0 && (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          ยังไม่มีผู้ใช้ในระบบ (ให้ครู/กรรมการ login ผ่าน SSO ก่อน แล้วมาตั้งค่าบทบาทที่นี่)
        </p>
      )}
    </div>
  );
}

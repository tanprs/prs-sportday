"use client";

// TeamApprovalManager — แสดงรายการทีมที่ส่งรออนุมัติ (status = submitted)
// พร้อมปุ่ม "อนุมัติ" และ "ตีกลับ" (มีช่องใส่เหตุผลก่อนยืนยัน)
//
// สิทธิ์:
//   - admin / teacher   → เห็นทุกทีม ทุกสี
//   - house_teacher     → เห็นเฉพาะทีมของสีตัวเอง (กรองตาม currentHouseColor)

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { HOUSE_LABELS_TH, GENDER_TYPE_LABELS_TH } from "@/lib/labels";

type SportRef = { name: string; gender_type: string };
type MemberRef = { id: string };

type TeamRow = {
  id: string;
  team_name: string | null;
  house_color: string;
  status: string;
  created_at: string;
  reject_note: string | null;
  sport_id: string;
  sport_types: SportRef | null;
  team_members: MemberRef[];
};

const HOUSE_COLOR_HEX: Record<string, string> = {
  red: "#CC2222",
  yellow: "#E8A000",
  green: "#1A5C2A",
  blue: "#1A3A8F",
};

export function TeamApprovalManager({
  currentUserId,
  currentUserRole,
  currentHouseColor,
}: {
  currentUserId: string;
  currentUserRole: string;
  currentHouseColor: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isHouseTeacher = currentUserRole === "house_teacher";

  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    setError(null);
    let query = supabase
      .from("teams")
      .select(
        "id, team_name, house_color, status, created_at, reject_note, sport_id, sport_types(name, gender_type), team_members(id)"
      )
      .eq("status", "submitted")
      .order("created_at", { ascending: true });

    // house_teacher เห็นเฉพาะสีตัวเอง
    if (isHouseTeacher && currentHouseColor) {
      query = query.eq("house_color", currentHouseColor);
    }

    const { data, error: err } = await query;
    setLoading(false);
    if (err) {
      setError("โหลดรายการทีมไม่สำเร็จ: " + err.message);
      return;
    }
    setTeams((data ?? []) as unknown as TeamRow[]);
  }, [isHouseTeacher, currentHouseColor]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  async function handleApprove(teamId: string) {
    setActionId(teamId);
    setError(null);
    setSuccessMsg(null);
    const { error: err } = await supabase
      .from("teams")
      .update({
        status: "approved",
        approved_by: currentUserId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", teamId);
    setActionId(null);
    if (err) {
      setError("อนุมัติไม่สำเร็จ: " + err.message);
      return;
    }
    setSuccessMsg("อนุมัติทีมสำเร็จ");
    router.refresh();
    fetchTeams();
  }

  async function handleReject(teamId: string) {
    setActionId(teamId);
    setError(null);
    setSuccessMsg(null);
    const { error: err } = await supabase
      .from("teams")
      .update({
        status: "rejected",
        reject_note: rejectNote.trim() || null,
      })
      .eq("id", teamId);
    setActionId(null);
    if (err) {
      setError("ตีกลับไม่สำเร็จ: " + err.message);
      return;
    }
    setRejectTarget(null);
    setRejectNote("");
    setSuccessMsg("ตีกลับทีมแล้ว");
    router.refresh();
    fetchTeams();
  }

  const sectionTitle = isHouseTeacher
    ? `อนุมัติทีม${currentHouseColor ? ` (${HOUSE_LABELS_TH[currentHouseColor] ?? currentHouseColor})` : ""}`
    : "อนุมัติทีม";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">
          {sectionTitle}{" "}
          {!loading && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
              {teams.length} ทีมรออยู่
            </span>
          )}
        </h2>
        <button
          onClick={() => fetchTeams()}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          รีเฟรช
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {successMsg && (
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">
          กำลังโหลด...
        </div>
      ) : teams.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">
          ไม่มีทีมรออนุมัติขณะนี้
        </div>
      ) : (
        <div className="space-y-2">
          {teams.map((team) => {
            const sport = team.sport_types;
            const memberCount = team.team_members.length;
            const isActing = actionId === team.id;
            const isRejecting = rejectTarget === team.id;

            return (
              <div
                key={team.id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 h-4 w-4 shrink-0 rounded-full"
                      style={{
                        backgroundColor: HOUSE_COLOR_HEX[team.house_color] ?? "#888",
                      }}
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {team.team_name ?? "(ไม่มีชื่อทีม)"}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {sport?.name ?? "-"}
                        {sport?.gender_type
                          ? ` · ${GENDER_TYPE_LABELS_TH[sport.gender_type] ?? sport.gender_type}`
                          : ""}
                        {" · "}
                        {HOUSE_LABELS_TH[team.house_color] ?? team.house_color}
                        {" · "}
                        {memberCount} คน
                      </p>
                    </div>
                  </div>

                  {!isRejecting && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => handleApprove(team.id)}
                        disabled={isActing}
                        className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isActing ? "กำลังอนุมัติ..." : "อนุมัติ ✓"}
                      </button>
                      <button
                        onClick={() => {
                          setRejectTarget(team.id);
                          setRejectNote("");
                          setSuccessMsg(null);
                        }}
                        disabled={isActing}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        ตีกลับ
                      </button>
                    </div>
                  )}
                </div>

                {isRejecting && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-medium text-slate-600">
                      เหตุผลที่ตีกลับ (ไม่บังคับ — จะแสดงให้ผู้ลงทะเบียนเห็น)
                    </p>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="เช่น จำนวนนักเรียนไม่ครบ / ซ้ำกับทีมที่ลงไปแล้ว"
                      rows={2}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleReject(team.id)}
                        disabled={isActing}
                        className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isActing ? "กำลังตีกลับ..." : "ยืนยันตีกลับ"}
                      </button>
                      <button
                        onClick={() => {
                          setRejectTarget(null);
                          setRejectNote("");
                        }}
                        className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

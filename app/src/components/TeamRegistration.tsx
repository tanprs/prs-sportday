"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HOUSE_LABELS_TH } from "@/lib/labels";
import { QRScanner } from "@/components/QRScanner";

// ลงทะเบียนนักเรียนเข้าทีมด้วยการสแกน QR (บัตร/QR เดิมจากระบบเช็คชื่อ —
// payload คือ "STD_<รหัสนักเรียน>") กัปตันชนิดกีฬา/หัวหน้าสี/ครูเลือกชนิด
// กีฬาก่อน ระบบหาทีมของสีตัวเองสำหรับกีฬานั้น (สร้างให้อัตโนมัติถ้ายังไม่มี)
// แล้วค่อยสแกนเพิ่มสมาชิกทีละคน กฎทั้งหมด (โควตา/เพศ/ชั้น/สีตรงกัน) ถูกบังคับ
// โดย trigger ในฐานข้อมูลอยู่แล้ว (ดู 0003_business_rules.sql) เป็นชั้นป้องกัน
// สุดท้ายเสมอ — แต่ UI นี้ตรวจกฎเดียวกัน (สี/ชั้น/เพศ/โควตา) ซ้ำฝั่ง client
// ก่อน insert ด้วย แล้วโชว์เป็นป๊อปอัพให้กดยืนยันทีละคน เพื่อให้เห็นเหตุผล
// ที่ไม่ผ่านได้ทันทีโดยไม่ต้องรอ round-trip ไปฐานข้อมูล และกันสแกนผิดคน/ผิดทีม

type SportRow = {
  id: string;
  name: string;
  category: string;
  grade_group: string;
  gender_type: string;
  team_size: number | null;
  sub_grade_quota: Record<string, number> | null;
};

type StudentRow = {
  id: string;
  student_code: string;
  full_name: string;
  classroom: string;
  grade_level: string;
  house_color: string | null;
  gender: string;
};

type CheckItem = { key: string; label: string; ok: boolean };

type PendingScan = {
  student: StudentRow;
  checks: CheckItem[];
  allOk: boolean;
};

type RosterRow = {
  id: string;
  role: string | null;
  student_id: string;
  student_code: string;
  full_name: string;
  classroom: string;
};

type TeamRow = {
  id: string;
  team_name: string | null;
  status: string | null;
};

const GENDER_LABELS_TH: Record<string, string> = {
  both: "ชาย/หญิง",
  male: "ชาย",
  female: "หญิง",
};

const HOUSE_OPTIONS = ["red", "yellow", "green", "blue"] as const;

// mirror ของฟังก์ชัน grade_in_group() ใน 0003_business_rules.sql ทุกตัวอักษร —
// ถ้าแก้กฎที่ฝั่ง DB ต้องแก้ตรงนี้ให้ตรงกันด้วย ไม่งั้นป๊อปอัพกับ trigger จะขัดกัน
const GRADE_GROUP_SETS: Record<string, string[]> = {
  "ม.1-2": ["ม.1", "ม.2"],
  "ม.3-4": ["ม.3", "ม.4"],
  "ม.5-6": ["ม.5", "ม.6"],
  "ม.ต้น": ["ม.1", "ม.2", "ม.3"],
  "ม.ปลาย": ["ม.4", "ม.5", "ม.6"],
  "รวม": ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"],
};

function gradeInGroup(grade: string, group: string): boolean {
  const set = GRADE_GROUP_SETS[group];
  return set ? set.includes(grade) : grade === group;
}

function genLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function TeamRegistration({
  currentUserId,
  role,
  houseColor,
  initialSports,
}: {
  currentUserId: string;
  role: string;
  houseColor: string | null;
  initialSports: SportRow[];
}) {
  const supabase = createClient();
  const canPickHouse = houseColor === null; // admin/teacher ไม่ผูกกับสีใดสีหนึ่ง

  // sport_types โหลดมาจาก server component (teams/page.tsx) แล้วตั้งแต่
  // render แรก ไม่ต้อง fetch ซ้ำฝั่ง client — เลยไม่มี state/setter ของตัวเอง
  const sports = initialSports;
  const [house, setHouse] = useState<string>(houseColor ?? "");
  const [gradeGroup, setGradeGroup] = useState<string>("");
  const [sportId, setSportId] = useState<string>("");

  const [loadingTeam, setLoadingTeam] = useState(false);
  const [team, setTeam] = useState<TeamRow | null | undefined>(undefined); // undefined = ยังไม่เลือก
  const [roster, setRoster] = useState<RosterRow[]>([]);
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null);

  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanLog, setScanLog] = useState<{ id: string; ok: boolean; text: string }[]>([]);
  const pendingCodes = useRef<Set<string>>(new Set());

  const [pendingScan, setPendingScan] = useState<PendingScan | null>(null);
  const [confirming, setConfirming] = useState(false);

  function pushLog(ok: boolean, text: string) {
    setScanLog((prev) => [{ id: genLogId(), ok, text }, ...prev].slice(0, 30));
  }

  async function refresh(nextSportId: string, nextHouse: string) {
    setActionError(null);
    if (!nextSportId || !nextHouse) {
      setTeam(undefined);
      setRoster([]);
      return;
    }
    setLoadingTeam(true);

    const [{ data: existing }, { data: openData }] = await Promise.all([
      supabase
        .from("teams")
        .select("id, team_name, status")
        .eq("sport_id", nextSportId)
        .eq("house_color", nextHouse)
        .neq("status", "rejected")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase.rpc("registration_is_open", { p_house: nextHouse }),
    ]);

    setWindowOpen(typeof openData === "boolean" ? openData : null);

    const found = existing && existing.length > 0 ? existing[0] : null;
    setTeam(found);
    if (found) {
      await loadRoster(found.id);
    } else {
      setRoster([]);
    }
    setLoadingTeam(false);
  }

  async function loadRoster(teamId: string) {
    const { data } = await supabase
      .from("team_members")
      .select("id, role, student_id, students(student_code, full_name, classroom)")
      .eq("team_id", teamId)
      .order("created_at", { ascending: true });

    type Joined = {
      id: string;
      role: string | null;
      student_id: string;
      students: { student_code: string; full_name: string; classroom: string } | null;
    };
    const rows = ((data as unknown as Joined[]) ?? []).map((r) => ({
      id: r.id,
      role: r.role,
      student_id: r.student_id,
      student_code: r.students?.student_code ?? "",
      full_name: r.students?.full_name ?? "(ไม่พบชื่อ)",
      classroom: r.students?.classroom ?? "",
    }));
    setRoster(rows);
  }

  function handleSportChange(id: string) {
    setSportId(id);
    refresh(id, house);
  }

  function handleHouseChange(h: string) {
    setHouse(h);
    refresh(sportId, h);
  }

  function handleGradeChange(g: string) {
    setGradeGroup(g);
    setSportId(""); // เปลี่ยนระดับชั้นแล้วต้องเลือกชนิดกีฬาใหม่
    refresh("", house);
  }

  async function handleCreateTeam() {
    if (!sportId || !house) return;
    setCreating(true);
    setActionError(null);
    const sport = sports.find((s) => s.id === sportId);
    const teamName = sport ? `${HOUSE_LABELS_TH[house] ?? house} - ${sport.name}` : null;

    const { data, error } = await supabase
      .from("teams")
      .insert({ sport_id: sportId, house_color: house, team_name: teamName, created_by: currentUserId })
      .select("id, team_name, status")
      .single();

    setCreating(false);
    if (error) {
      setActionError("สร้างทีมไม่สำเร็จ: " + error.message);
      return;
    }
    setTeam(data);
    setRoster([]);
  }

  // ตรวจกฎเดียวกับ check_team_quota() ใน 0003_business_rules.sql ฝั่ง client
  // ก่อนยิง insert จริง — ใช้ทั้งตัดสินใจว่าปุ่ม "ยืนยัน" กดได้ไหม และโชว์เหตุผล
  // ให้คนสแกนเห็นในป๊อปอัพทันที ไม่ต้องรอ error จาก DB
  function buildPendingScan(student: StudentRow): PendingScan {
    const checks: CheckItem[] = [];

    checks.push({
      key: "color",
      label: `สีตรงกับทีม (ทีมนี้: ${(HOUSE_LABELS_TH[house] ?? house) || "-"})`,
      ok: student.house_color === house,
    });

    if (selectedSport) {
      checks.push({
        key: "grade",
        label: `ชั้นอยู่ในรุ่นที่แข่ง (${selectedSport.grade_group})`,
        ok: gradeInGroup(student.grade_level, selectedSport.grade_group),
      });

      if (selectedSport.gender_type !== "both") {
        const wantGender = selectedSport.gender_type === "male" ? "M" : "F";
        checks.push({
          key: "gender",
          label: `เพศตรงกับรุ่นแข่งขัน (${GENDER_LABELS_TH[selectedSport.gender_type]})`,
          ok: student.gender === wantGender,
        });
      }

      const mainCount = roster.filter((r) => r.role === "main").length;
      if (selectedSport.team_size != null) {
        checks.push({
          key: "teamSize",
          label: `ทีมยังไม่เต็มจำนวนตัวจริง (${mainCount}/${selectedSport.team_size} คน)`,
          ok: mainCount < selectedSport.team_size,
        });
      }

      const quota = selectedSport.sub_grade_quota?.[student.grade_level];
      if (quota != null) {
        const gradeCount = roster.filter(
          (r) => r.role === "main" && r.classroom.split("/")[0] === student.grade_level
        ).length;
        checks.push({
          key: "quota",
          label: `โควตาชั้น ${student.grade_level} ในทีมนี้ (${gradeCount}/${quota} คน)`,
          ok: gradeCount < quota,
        });
      }
    }

    return { student, checks, allOk: checks.every((c) => c.ok) };
  }

  async function handleScan(text: string) {
    if (!team || pendingScan) return; // มีป๊อปอัพค้างอยู่ — กันสแกนทับ
    if (!text.startsWith("STD_")) {
      pushLog(false, `QR นี้ไม่ใช่บัตรนักเรียน (${text.slice(0, 20)})`);
      return;
    }
    const code = text.slice(4);
    if (pendingCodes.current.has(code)) return;

    if (roster.some((r) => r.student_code === code)) {
      pushLog(false, `${code} ลงทะเบียนทีมนี้ไปแล้ว`);
      return;
    }

    pendingCodes.current.add(code);
    try {
      const { data: student, error: lookupError } = await supabase
        .from("students")
        .select("id, student_code, full_name, classroom, grade_level, house_color, gender")
        .eq("student_code", code)
        .single();

      if (lookupError || !student) {
        pushLog(false, `ไม่พบนักเรียนรหัส ${code} ในระบบ`);
        return;
      }

      setPendingScan(buildPendingScan(student as StudentRow));
    } finally {
      pendingCodes.current.delete(code);
    }
  }

  async function handleConfirmScan() {
    if (!pendingScan || !team || !pendingScan.allOk) return;
    const student = pendingScan.student;
    setConfirming(true);

    const { error: insertError } = await supabase
      .from("team_members")
      .insert({ team_id: team.id, student_id: student.id, role: "main", added_by: currentUserId });

    setConfirming(false);

    if (insertError) {
      pushLog(false, `${student.full_name}: ${insertError.message}`);
      setPendingScan(null);
      return;
    }

    setRoster((prev) => [
      ...prev,
      {
        id: `temp-${student.id}`,
        role: "main",
        student_id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
        classroom: student.classroom,
      },
    ]);
    pushLog(true, `เพิ่ม ${student.full_name} (${student.classroom}) เข้าทีมแล้ว`);
    // sync ค่า id จริงจาก DB เผื่อต้องลบทีหลัง (temp- ใช้ลบไม่ได้)
    loadRoster(team.id);
    setPendingScan(null);
  }

  function handleCancelScan() {
    if (pendingScan) {
      pushLog(false, `ยกเลิกการเพิ่ม ${pendingScan.student.full_name}`);
    }
    setPendingScan(null);
  }

  async function handleRemove(memberId: string) {
    if (memberId.startsWith("temp-")) return;
    const { error } = await supabase.from("team_members").delete().eq("id", memberId);
    if (error) {
      setActionError("ลบไม่สำเร็จ: " + error.message);
      return;
    }
    setRoster((prev) => prev.filter((r) => r.id !== memberId));
  }

  async function handleSubmitTeam() {
    if (!team) return;
    setSubmitting(true);
    setActionError(null);
    const { data, error } = await supabase
      .from("teams")
      .update({ status: "submitted" })
      .eq("id", team.id)
      .select("id, team_name, status")
      .single();
    setSubmitting(false);
    if (error) {
      setActionError("ส่งทีมไม่สำเร็จ: " + error.message);
      return;
    }
    setTeam(data);
  }

  const selectedSport = sports.find((s) => s.id === sportId) ?? null;
  // เรียงตามลำดับที่ sports มาแล้ว (server ส่งมาเรียงตาม sort_order) ไม่ใช้ sort
  // ตามตัวอักษรเพราะลำดับ ม.1-2/3-4/5-6/ม.ต้น/ม.ปลาย/รวม ที่ตั้งใจไว้จะเพี้ยนได้
  // ถ้าเรียง locale
  const gradeGroups = Array.from(new Set(sports.map((s) => s.grade_group)));
  const sportsForGrade = sports.filter((s) => s.grade_group === gradeGroup);

  const canEditRoster =
    !!team &&
    (role === "admin" ||
      role === "teacher" ||
      (role === "house_teacher" && team.status !== "locked") ||
      ((role === "sport_captain" || role === "house_captain") &&
        team.status === "draft" &&
        windowOpen === true));

  const canCreateTeam =
    role === "admin" ||
    role === "teacher" ||
    role === "house_teacher" ||
    ((role === "sport_captain" || role === "house_captain") && windowOpen === true);

  const canSubmit = !!team && team.status === "draft" && roster.length > 0 && canEditRoster;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <p className="text-sm font-medium text-slate-900">ลงทะเบียนทีม (สแกน QR)</p>
        <p className="mt-0.5 text-sm text-slate-500">
          เลือกสี → เลือกระดับชั้น → เลือกชนิดกีฬา แล้วสแกน QR บัตรนักเรียน (ใบเดิมจากระบบเช็คชื่อ) เพื่อเพิ่มเข้าทีม
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {canPickHouse && (
          <select
            value={house}
            onChange={(e) => handleHouseChange(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">เลือกสี</option>
            {HOUSE_OPTIONS.map((h) => (
              <option key={h} value={h}>
                {HOUSE_LABELS_TH[h]}
              </option>
            ))}
          </select>
        )}

        <select
          value={gradeGroup}
          onChange={(e) => handleGradeChange(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">เลือกระดับชั้น</option>
          {gradeGroups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>

        <select
          value={sportId}
          onChange={(e) => handleSportChange(e.target.value)}
          disabled={!gradeGroup}
          className="min-w-[220px] rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{gradeGroup ? "เลือกชนิดกีฬา" : "เลือกระดับชั้นก่อน"}</option>
          {sportsForGrade.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSport && (
        <p className="text-xs text-slate-500">
          {selectedSport.grade_group} · {GENDER_LABELS_TH[selectedSport.gender_type] ?? selectedSport.gender_type}
          {selectedSport.team_size ? ` · ตัวจริง ${selectedSport.team_size} คน` : ""}
        </p>
      )}

      {!canPickHouse && windowOpen === false && (role === "sport_captain" || role === "house_captain") && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          ปิดรับลงทะเบียนสำหรับสีนี้แล้ว (ติดต่อครูประจำสีหรือแอดมินถ้าต้องการแก้ไขเพิ่มเติม)
        </p>
      )}

      {actionError && <p className="text-sm text-red-600">{actionError}</p>}

      {loadingTeam && <p className="text-sm text-slate-500">กำลังโหลด...</p>}

      {!loadingTeam && sportId && house && team === null && (
        <div className="rounded-md border border-dashed border-slate-300 p-4 text-center">
          <p className="text-sm text-slate-600">ยังไม่มีทีมชนิดกีฬานี้สำหรับสีนี้</p>
          <button
            type="button"
            onClick={handleCreateTeam}
            disabled={creating || !canCreateTeam}
            className="mt-2 rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {creating ? "กำลังสร้าง..." : "สร้างทีม"}
          </button>
        </div>
      )}

      {team && (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
            <span className="text-sm font-medium text-slate-800">
              {team.team_name ?? "(ไม่มีชื่อทีม)"}
            </span>
            <span className="text-xs text-slate-500">สถานะ: {team.status}</span>
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700">รายชื่อ ({roster.length} คน)</p>
            {roster.length === 0 ? (
              <p className="mt-1 text-sm text-slate-400">ยังไม่มีสมาชิก — สแกน QR ด้านล่างเพื่อเพิ่ม</p>
            ) : (
              <ul className="mt-1 divide-y divide-slate-100 rounded-md border border-slate-200">
                {roster.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-3 py-1.5 text-sm">
                    <span>
                      {r.full_name} <span className="text-slate-400">({r.student_code} · {r.classroom})</span>
                    </span>
                    {canEditRoster && (
                      <button
                        type="button"
                        onClick={() => handleRemove(r.id)}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        ลบ
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEditRoster ? (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setScanning((s) => !s)}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              >
                {scanning ? "ปิดกล้อง" : "เปิดกล้องสแกน QR"}
              </button>

              {scanning && <QRScanner onScan={handleScan} />}

              {scanLog.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-100 bg-slate-50 p-2 text-xs">
                  {scanLog.map((l) => (
                    <li key={l.id} className={l.ok ? "text-emerald-700" : "text-red-600"}>
                      {l.text}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">ทีมนี้แก้ไขรายชื่อไม่ได้แล้ว (สถานะ: {team.status})</p>
          )}

          {canSubmit && (
            <button
              type="button"
              onClick={handleSubmitTeam}
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {submitting ? "กำลังส่ง..." : "ส่งทีม (ปิดรับสมาชิกเพิ่ม)"}
            </button>
          )}
        </div>
      )}

      {pendingScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <p className="text-sm text-slate-500">ยืนยันเพิ่มเข้าทีม</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{pendingScan.student.full_name}</p>
            <p className="text-sm text-slate-500">
              {pendingScan.student.student_code} · {pendingScan.student.classroom} ·{" "}
              {HOUSE_LABELS_TH[pendingScan.student.house_color ?? ""] ?? pendingScan.student.house_color ?? "ไม่มีสี"}
            </p>

            <ul className="mt-3 space-y-1 text-sm">
              {pendingScan.checks.map((c) => (
                <li key={c.key} className={c.ok ? "text-emerald-700" : "text-red-600"}>
                  {c.ok ? "✓" : "✕"} {c.label}
                </li>
              ))}
            </ul>

            {!pendingScan.allOk && (
              <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                มีรายการไม่ผ่านการตรวจสอบด้านบน — เพิ่มเข้าทีมนี้ไม่ได้
              </p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelScan}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmScan}
                disabled={!pendingScan.allOk || confirming}
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
              >
                {confirming ? "กำลังเพิ่ม..." : "ยืนยันเพิ่มเข้าทีม"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// supabase/functions/sync-roster/index.ts
//
// ซิงค์รายชื่อนักเรียนจากระบบเช็คชื่อ (attendance-system) เข้าตาราง `students`
// ของกีฬาสี 2569 — เรียกได้ 2 ทาง:
//   1) ปุ่ม "ซิงค์นักเรียน" ในหน้า /admin (ส่ง JWT ของผู้ใช้ที่ login มา ต้องมี
//      role เป็น admin หรือ teacher)
//   2) Cron รายวัน ผ่าน pg_cron + pg_net (ส่ง service_role key ตรง ๆ — ดู
//      migration 0006_sync_roster_cron.sql)
//
// ENV ที่ต้องตั้งเป็น Edge Function secret (Dashboard > Edge Functions > Secrets):
//   ATTENDANCE_API_URL, ATTENDANCE_SERVICE_USERNAME, ATTENDANCE_SERVICE_PASSWORD
// (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ถูก inject ให้อัตโนมัติโดย Supabase อยู่แล้ว)
//
// ── อัปเดต (มิ.ย. 2569): incremental sync ด้วย updatedSince ──────────────────
// ทีมระบบเช็คชื่อส่งคำแนะนำมาว่า Supabase egress (free tier 5GB/เดือน) และ
// Render bandwidth ใช้ร่วมกันทั้งโรงเรียน เคยถูกพักให้บริการมาแล้วเพราะมีคน
// ดึงข้อมูลทั้งหมดซ้ำ ๆ — ฟังก์ชันนี้เคยดึงนักเรียน "ทั้งหมด" (1,300+ คน) ใหม่
// ทุกรอบ ทั้ง cron รายวันและตอนกดปุ่มมือ ตอนนี้แก้ให้เก็บเวลาซิงค์สำเร็จล่าสุด
// ไว้ในตาราง `roster_sync_state` (migration 0010) แล้วส่งเป็น `updatedSince`
// ในรอบถัดไป เพื่อดึงเฉพาะนักเรียนที่ข้อมูลเปลี่ยนจริง รอบแรก (ยังไม่มี
// checkpoint) จะดึงทั้งหมดเหมือนเดิมครั้งเดียว หลังจากนั้นจะเป็น incremental
// ตลอด เวลาที่บันทึกเป็น checkpoint คือเวลา "ก่อนเริ่มดึง" ของรอบนั้น
// (ไม่ใช่เวลาที่ทำเสร็จ) เพื่อไม่ให้พลาดนักเรียนที่ข้อมูลเปลี่ยนระหว่างรอบกำลังรัน

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ATTENDANCE_API_URL = Deno.env.get("ATTENDANCE_API_URL");
const ATTENDANCE_SERVICE_USERNAME = Deno.env.get("ATTENDANCE_SERVICE_USERNAME");
const ATTENDANCE_SERVICE_PASSWORD = Deno.env.get("ATTENDANCE_SERVICE_PASSWORD");

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// CORS — จำเป็นเพราะปุ่มในหน้า /admin เรียกฟังก์ชันนี้ตรงจากเบราว์เซอร์
// (ถ้าไม่มี header เหล่านี้ เบราว์เซอร์จะบล็อก preflight แล้ว fetch จะ error
// แบบ "Failed to fetch" โดยไม่ขึ้นข้อความจาก response เลย)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

// แยก grade_level จาก classroom เช่น "ม.3/1" -> "ม.3", "ต.1/1" -> "ต.1"
function gradeLevelOf(classroom: string): string {
  const idx = classroom.indexOf("/");
  return idx === -1 ? classroom : classroom.slice(0, idx);
}

function mapGender(g: string | null | undefined): "M" | "F" | null {
  if (g === "MALE") return "M";
  if (g === "FEMALE") return "F";
  return null; // OTHER หรือไม่มีข้อมูล — ตาราง students ของเรารับได้แค่ M/F
}

type AttStudent = {
  studentCode: string;
  firstName: string;
  lastName: string;
  gender: string | null;
  className: string | null;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ success: false, message: "Method not allowed" }, 405);
  }

  // ── ตรวจสิทธิ์ผู้เรียก ───────────────────────────────────────────────────
  // อนุญาต 2 ทาง: เรียกด้วย service_role key ตรง ๆ (cron ภายใน) หรือเรียกด้วย
  // JWT ของผู้ใช้ที่มี role admin/teacher (ปุ่มในหน้า /admin)
  const authHeader = req.headers.get("Authorization") ?? "";
  const callerToken = authHeader.replace(/^Bearer\s+/i, "").trim();

  let authorized = false;
  if (callerToken && callerToken === SERVICE_ROLE_KEY) {
    authorized = true;
  } else if (callerToken) {
    const { data } = await admin.auth.getUser(callerToken);
    if (data.user) {
      const { data: profile } = await admin
        .from("user_profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (profile && ["admin", "teacher"].includes(profile.role)) {
        authorized = true;
      }
    }
  }

  if (!authorized) {
    return json({ success: false, message: "Unauthorized" }, 403);
  }

  if (!ATTENDANCE_API_URL || !ATTENDANCE_SERVICE_USERNAME || !ATTENDANCE_SERVICE_PASSWORD) {
    return json(
      {
        success: false,
        message:
          "ยังไม่ได้ตั้งค่า secret ของ Edge Function: ATTENDANCE_API_URL / ATTENDANCE_SERVICE_USERNAME / ATTENDANCE_SERVICE_PASSWORD",
      },
      500
    );
  }

  const startedAt = Date.now();
  // checkpoint เวลา "ก่อนเริ่มดึง" ของรอบนี้ — ใช้เป็น last_synced_at ใหม่
  // ถ้ารอบนี้สำเร็จทั้งหมด (ดู comment ด้านบนไฟล์ว่าทำไมต้องเป็นเวลาเริ่ม)
  const runStartedAt = new Date(startedAt);

  // ── 0) อ่าน checkpoint ซิงค์ล่าสุด (roster_sync_state) ────────────────────
  let updatedSince: string | null = null;
  {
    const { data: stateRow, error: stateErr } = await admin
      .from("roster_sync_state")
      .select("last_synced_at")
      .eq("id", true)
      .maybeSingle();
    if (stateErr) {
      return json(
        { success: false, message: "อ่าน roster_sync_state ไม่สำเร็จ: " + stateErr.message },
        500
      );
    }
    updatedSince = stateRow?.last_synced_at ?? null;
  }
  const isIncremental = updatedSince !== null;

  // ── 1) login เข้า attendance-system ด้วยบัญชีบริการ ──────────────────────
  let accessToken: string;
  try {
    const loginRes = await fetch(`${ATTENDANCE_API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: ATTENDANCE_SERVICE_USERNAME,
        password: ATTENDANCE_SERVICE_PASSWORD,
      }),
    });
    const loginJson = await loginRes.json();
    if (!loginRes.ok || !loginJson.success || !loginJson.data?.accessToken) {
      return json(
        {
          success: false,
          message:
            "เข้าสู่ระบบเช็คชื่อด้วยบัญชีบริการไม่สำเร็จ: " +
            (loginJson.message ?? loginRes.statusText),
        },
        502
      );
    }
    accessToken = loginJson.data.accessToken;
  } catch (e) {
    return json({ success: false, message: "เชื่อมต่อระบบเช็คชื่อไม่ได้: " + String(e) }, 502);
  }

  // ── 2) ดึงนักเรียน (วนหน้า) — ถ้ามี checkpoint ส่ง updatedSince ไปด้วย ────
  // เพื่อให้ระบบเช็คชื่อกรองมาให้เฉพาะนักเรียนที่ข้อมูลเปลี่ยนหลัง checkpoint
  // เท่านั้น ไม่ใช่ทั้งโรงเรียนทุกรอบ (ดู comment บนสุดของไฟล์)
  const allStudents: AttStudent[] = [];
  let page = 1;
  const limit = 1000;
  let totalPages = 1;

  try {
    do {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (updatedSince) params.set("updatedSince", updatedSince);
      const res = await fetch(
        `${ATTENDANCE_API_URL}/api/integration/students?${params.toString()}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const j = await res.json();
      if (!res.ok || !j.success) {
        return json(
          { success: false, message: "ดึงรายชื่อนักเรียนไม่สำเร็จ: " + (j.message ?? res.statusText) },
          502
        );
      }
      allStudents.push(...j.data);
      totalPages = j.pagination?.totalPages ?? 1;
      page++;
    } while (page <= totalPages);
  } catch (e) {
    return json({ success: false, message: "ดึงรายชื่อนักเรียนไม่สำเร็จ: " + String(e) }, 502);
  }

  // ── 3) โหลด classroom_house_mapping ทั้งหมด ──────────────────────────────
  const { data: mappingRows, error: mappingErr } = await admin
    .from("classroom_house_mapping")
    .select("grade_level, classroom, house_color");
  if (mappingErr) {
    return json(
      { success: false, message: "โหลด classroom_house_mapping ไม่สำเร็จ: " + mappingErr.message },
      500
    );
  }
  const houseMap = new Map<string, string>();
  for (const r of mappingRows ?? []) {
    houseMap.set(`${r.grade_level}|${r.classroom}`, r.house_color);
  }

  // ── 4) แปลงข้อมูล + upsert เป็นชุด (อิง student_code, ไม่ลบของเดิม) ──────
  let skipped = 0;
  const rows: {
    student_code: string;
    full_name: string;
    classroom: string;
    grade_level: string;
    gender: "M" | "F" | null;
    house_color: string | null;
  }[] = [];

  for (const s of allStudents) {
    if (!s.className) {
      skipped++;
      continue;
    }
    const gradeLevel = gradeLevelOf(s.className);
    rows.push({
      student_code: s.studentCode,
      full_name: `${s.firstName} ${s.lastName}`.trim(),
      classroom: s.className,
      grade_level: gradeLevel,
      gender: mapGender(s.gender),
      house_color: houseMap.get(`${gradeLevel}|${s.className}`) ?? null,
    });
  }

  const BATCH = 500;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await admin.from("students").upsert(chunk, { onConflict: "student_code" });
    if (error) {
      return json(
        {
          success: false,
          message: "บันทึกนักเรียนล้มเหลวระหว่างทาง: " + error.message,
          upsertedBeforeFail: upserted,
        },
        500
      );
    }
    upserted += chunk.length;
  }

  // ── 5) บันทึก checkpoint ใหม่ — เฉพาะตอนรอบนี้สำเร็จทั้งหมดเท่านั้น ───────
  const { error: checkpointErr } = await admin
    .from("roster_sync_state")
    .upsert({ id: true, last_synced_at: runStartedAt.toISOString() }, { onConflict: "id" });
  if (checkpointErr) {
    // ข้อมูลนักเรียนบันทึกสำเร็จไปแล้ว แค่ checkpoint เขียนไม่ได้ — แจ้งเตือน
    // แต่ไม่ต้องถือว่าทั้งรอบ fail (รอบถัดไปจะ fallback เป็น full sync แทน)
    return json({
      success: true,
      mode: isIncremental ? "incremental" : "full",
      updatedSince,
      totalFetched: allStudents.length,
      totalUpserted: upserted,
      skippedNoClassroom: skipped,
      durationMs: Date.now() - startedAt,
      warning: "บันทึก checkpoint ซิงค์ไม่สำเร็จ (รอบถัดไปจะดึงทั้งหมดใหม่): " + checkpointErr.message,
    });
  }

  return json({
    success: true,
    mode: isIncremental ? "incremental" : "full",
    updatedSince,
    totalFetched: allStudents.length,
    totalUpserted: upserted,
    skippedNoClassroom: skipped,
    durationMs: Date.now() - startedAt,
  });
});

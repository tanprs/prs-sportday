"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── SSO proxy login ──────────────────────────────────────────────────────
// คนใช้ Sportday ล็อกอินด้วย username/password ของระบบเช็คชื่อ (attendance-system)
// เซิร์ฟเวอร์ฝั่ง Sportday ส่ง credential นั้นต่อให้ attendance-system ตรวจสอบเอง
// (เราไม่เก็บ/เทียบรหัสผ่านเอง) แล้วใช้ identity ที่ได้กลับมา mint session ของ
// Supabase Auth เองแยกต่างหาก — ไม่ได้เอา JWT ของ attendance-system มาใช้เป็น
// session ของ Sportday ตรง ๆ
//
// ความปลอดภัย: รหัสผ่านที่ผู้ใช้กรอกจะถูกส่งต่อครั้งเดียวผ่าน HTTPS ไปยัง
// ATTENDANCE_API_URL แล้วทิ้งทันที (ไม่ log, ไม่บันทึกที่ใดในระบบ Sportday)

type AttendanceLoginResult = {
  success: boolean;
  message?: string;
  data?: {
    user: {
      id: number;
      username: string;
      email: string;
      fullName: string;
      role: string;
    };
    accessToken: string;
    refreshToken: string;
  };
};
// หมายเหตุ: attendance-system ไม่ส่ง isActive กลับมาใน user object ตอน login
// สำเร็จ (เช็คแล้วตั้งแต่ใน loginUser() — ถ้าปิดใช้งานจะ throw error ออกไปก่อน
// ถึงขั้นตอนนี้แล้ว) จึงไม่ต้องเช็คซ้ำฝั่งนี้

const GENERIC_ERROR = "เข้าสู่ระบบไม่สำเร็จ ตรวจสอบชื่อผู้ใช้/รหัสผ่านของระบบเช็คชื่อ";
const RETRY_ERROR = "เชื่อมต่อระบบเช็คชื่อไม่ได้ในขณะนี้ ลองใหม่อีกครั้ง";

function syntheticEmailFor(attendanceUserId: number) {
  // อีเมลนี้ไม่มีใครเห็น/ใช้รับเมลจริง ใช้แค่เป็น identity key ใน Supabase Auth
  return `att-${attendanceUserId}@sso.prs-sportday.internal`;
}

export async function ssoLogin(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!username || !password) {
    redirect(`/login?error=${encodeURIComponent("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน")}`);
  }

  const apiUrl = process.env.ATTENDANCE_API_URL;
  if (!apiUrl) {
    throw new Error("Missing ATTENDANCE_API_URL env var");
  }

  let attendanceUser: NonNullable<AttendanceLoginResult["data"]>["user"];
  try {
    const res = await fetch(`${apiUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const json = (await res.json()) as AttendanceLoginResult;

    if (!res.ok || !json.success || !json.data) {
      redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`);
    }

    attendanceUser = json.data.user;
  } catch (err) {
    // ข้อผิดพลาดจาก redirect() ของ Next ก็โผล่มาทาง catch นี้ได้ — โยนต่อไป
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    redirect(`/login?error=${encodeURIComponent(RETRY_ERROR)}`);
  }

  const admin = createAdminClient();
  const syntheticEmail = syntheticEmailFor(attendanceUser.id);

  // หา mapping เดิม (เคย SSO มาก่อนหรือยัง) ด้วย attendance_user_id
  const { data: existingLink } = await admin
    .from("sso_identities")
    .select("auth_user_id")
    .eq("attendance_user_id", attendanceUser.id)
    .maybeSingle();

  let authUserId = existingLink?.auth_user_id ?? null;

  if (!authUserId) {
    // ครั้งแรกที่คนนี้ SSO เข้ามา — สร้าง auth user ใหม่
    // (trigger handle_new_user() จะสร้างแถวใน user_profiles ให้อัตโนมัติ
    // ด้วย role เริ่มต้น 'sport_captain' — แอดมินไปกำหนดบทบาท/สีจริงทีหลัง
    // เหมือนฟลว์สมัครสมาชิกเดิม)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: syntheticEmail,
      email_confirm: true,
      user_metadata: { full_name: attendanceUser.fullName },
    });

    if (createErr || !created?.user) {
      redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`);
    }

    authUserId = created.user.id;

    const { error: linkInsertErr } = await admin.from("sso_identities").insert({
      attendance_user_id: attendanceUser.id,
      username: attendanceUser.username,
      auth_user_id: authUserId,
    });

    if (linkInsertErr) {
      redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`);
    }
  } else {
    await admin
      .from("sso_identities")
      .update({
        username: attendanceUser.username,
        last_login_at: new Date().toISOString(),
      })
      .eq("attendance_user_id", attendanceUser.id);
  }

  // ขอ magic link จาก Supabase แล้วแลกเป็น session ทันทีฝั่งเซิร์ฟเวอร์
  // ผู้ใช้ไม่เห็น email/ลิงก์นี้เลย — เป็นแค่กลไกภายในสำหรับ mint session
  // โดยไม่ต้องรู้/ตั้งรหัสผ่านใน Supabase Auth
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: syntheticEmail,
  });

  const tokenHash = linkData?.properties?.hashed_token;
  if (linkErr || !tokenHash) {
    redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`);
  }

  const supabase = await createClient();
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });

  if (verifyErr) {
    redirect(`/login?error=${encodeURIComponent(GENERIC_ERROR)}`);
  }

  redirect(next);
}

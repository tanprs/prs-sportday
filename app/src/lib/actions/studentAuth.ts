"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Student claim-code login ──────────────────────────────────────────────
// นักเรียนไม่มีบัญชีในระบบเช็คชื่อมาเรียน (attendance-system ไม่มี role
// STUDENT) จึงเข้าทาง SSO (sso.ts) ไม่ได้ — แอดมิน/ครูจึงออก "รหัสยืนยัน"
// (claim_code) ให้เฉพาะนักเรียนที่ต้องใช้งานจริง (ดูตาราง
// student_login_invites ใน 0007_student_login_invites.sql) นักเรียนใช้รหัส
// นี้ผูกบัญชีครั้งแรกพร้อมตั้งรหัสผ่านของตัวเอง — ครั้งต่อไป login ด้วย
// รหัสนักเรียน + รหัสผ่านนั้นตรง ๆ ไม่ต้องพึ่ง claim_code อีก
//
// ต่างจาก sso.ts ตรงที่นักเรียน "มี" รหัสผ่านจริงที่ตัวเองตั้ง (ไม่ใช่รหัสผ่าน
// ของระบบอื่นที่ต้อง proxy ไปเช็ค) จึงใช้ signInWithPassword() ตรง ๆ ได้เลย
// ไม่ต้องผ่านขั้น generateLink()/verifyOtp() แบบ SSO

const GENERIC_CODE_ERROR =
  "รหัสยืนยันไม่ถูกต้องหรือหมดอายุแล้ว ติดต่อแอดมิน/ครูเพื่อขอรหัสใหม่";
const GENERIC_SERVER_ERROR = "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง หรือติดต่อแอดมิน";
const LOGIN_ERROR = "รหัสนักเรียนหรือรหัสผ่านไม่ถูกต้อง";

function syntheticEmailFor(studentCode: string) {
  // อีเมลนี้ไม่มีใครเห็น/ใช้รับเมลจริง ใช้แค่เป็น identity key ใน Supabase Auth
  // แยก namespace จากของ staff (sso.ts ใช้ @sso.prs-sportday.internal)
  return `student-${studentCode}@student.prs-sportday.internal`;
}

// ผูกบัญชีครั้งแรกด้วย claim_code ที่แอดมิน/ครูออกให้
export async function claimStudentAccount(formData: FormData) {
  const studentCode = String(formData.get("studentCode") ?? "").trim();
  const claimCode = String(formData.get("claimCode") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  const fail = (message: string) =>
    redirect(
      `/login?studentError=${encodeURIComponent(message)}&studentCode=${encodeURIComponent(
        studentCode
      )}`
    );

  if (!studentCode || !claimCode || !password || !confirmPassword) {
    fail("กรุณากรอกข้อมูลให้ครบถ้วน");
  }
  if (password !== confirmPassword) {
    fail("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
  }
  if (password.length < 6) {
    fail("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
  }

  const admin = createAdminClient();

  try {
    // 1) ตรวจรหัสยืนยัน — ต้องยังไม่ถูกใช้ (claimed_at is null) และไม่หมดอายุ
    const { data: invite } = await admin
      .from("student_login_invites")
      .select("id, role, expires_at")
      .eq("student_code", studentCode)
      .eq("claim_code", claimCode)
      .is("claimed_at", null)
      .maybeSingle();

    if (!invite || new Date(invite.expires_at) < new Date()) {
      fail(GENERIC_CODE_ERROR);
    }

    // 2) ดึงข้อมูลนักเรียนจริงจากตาราง students (sync มาจากระบบเช็คชื่อ)
    const { data: student } = await admin
      .from("students")
      .select("full_name, house_color")
      .eq("student_code", studentCode)
      .single();

    if (!student) {
      fail(GENERIC_CODE_ERROR);
    }

    const syntheticEmail = syntheticEmailFor(studentCode);

    // 3) นักเรียนคนนี้เคยผูกบัญชีมาก่อนหรือยัง (เช่น ลืมรหัสผ่าน แอดมิน revoke
    //    แล้วออกรหัสใหม่ให้) — เช็คจากประวัติ claimed_by ของรหัสที่ใช้ไปแล้ว
    //    ถ้าเคยมี ให้ตั้งรหัสผ่านใหม่ทับของเดิม ไม่สร้าง auth user ซ้ำ
    const { data: priorClaim } = await admin
      .from("student_login_invites")
      .select("claimed_by")
      .eq("student_code", studentCode)
      .not("claimed_by", "is", null)
      .order("claimed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let authUserId = priorClaim?.claimed_by ?? null;

    if (authUserId) {
      const { error: updateErr } = await admin.auth.admin.updateUserById(authUserId, {
        password,
      });
      if (updateErr) fail(GENERIC_SERVER_ERROR);
    } else {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: syntheticEmail,
        password,
        email_confirm: true,
        user_metadata: { full_name: student!.full_name },
      });
      if (createErr || !created?.user) fail(GENERIC_SERVER_ERROR);
      authUserId = created!.user!.id;
    }

    // 4) handle_new_user() trigger สร้าง user_profiles ให้อัตโนมัติด้วย role
    //    เริ่มต้น 'sport_captain' เสมอ (ดู 0003_business_rules.sql) — ต้อง
    //    update ทับด้วย role จริงจาก invite และ house_color จาก students
    const { error: profileErr } = await admin
      .from("user_profiles")
      .update({
        full_name: student!.full_name,
        role: invite!.role,
        house_color: student!.house_color,
      })
      .eq("id", authUserId!);
    if (profileErr) fail(GENERIC_SERVER_ERROR);

    // 5) ปิดรหัสยืนยันนี้ (ใช้แล้ว) — เก็บ claimed_by ไว้เป็นประวัติสำหรับ
    //    ตรวจตอนออกรหัสใหม่ในอนาคต
    await admin
      .from("student_login_invites")
      .update({ claimed_at: new Date().toISOString(), claimed_by: authUserId! })
      .eq("id", invite!.id);

    // 6) login ให้ทันทีด้วยรหัสผ่านที่ตั้งไป
    const supabase = await createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password,
    });
    if (signInErr) fail(GENERIC_SERVER_ERROR);
  } catch (err) {
    if (err instanceof Error && err.message === "NEXT_REDIRECT") throw err;
    fail(GENERIC_SERVER_ERROR);
  }

  redirect(next);
}

// login ปกติของนักเรียนที่ผูกบัญชีไปแล้ว (รหัสนักเรียน + รหัสผ่านที่ตั้งไว้)
export async function studentLogin(formData: FormData) {
  const studentCode = String(formData.get("studentCode") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/dashboard";

  if (!studentCode || !password) {
    redirect(`/login?studentError=${encodeURIComponent("กรุณากรอกรหัสนักเรียนและรหัสผ่าน")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmailFor(studentCode),
    password,
  });

  if (error) {
    redirect(`/login?studentError=${encodeURIComponent(LOGIN_ERROR)}`);
  }

  redirect(next);
}

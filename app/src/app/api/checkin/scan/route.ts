// POST /api/checkin/scan
// รับ QR code ของนักเรียน + match_id → บันทึก check-in + คืน count ต่อทีม
// ใช้ admin client เพราะ RLS ของ match_checkins ต้องการสิทธิ์เพิ่มข้อมูล

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentProfile } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // ตรวจสอบว่า login แล้ว + เป็น role ที่ดูแลกีฬา
  const profile = await getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ success: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  }
  const allowed = ["admin", "teacher", "referee"];
  if (!allowed.includes(profile.role)) {
    return NextResponse.json({ success: false, message: "ไม่มีสิทธิ์" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const { match_id, qr_code } = body ?? {};
  if (!match_id || !qr_code) {
    return NextResponse.json({ success: false, message: "ข้อมูลไม่ครบ" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1) หานักเรียนจาก qr_code_data
  const { data: student } = await supabase
    .from("students")
    .select("id, full_name, student_code")
    .eq("qr_code_data", qr_code)
    .maybeSingle();

  if (!student) {
    return NextResponse.json({ success: false, message: "ไม่พบนักเรียนที่ตรงกับ QR นี้" }, { status: 404 });
  }

  // 2) หาข้อมูล match (team_a_id, team_b_id, sport_id)
  const { data: match } = await supabase
    .from("matches")
    .select("id, sport_id, team_a_id, team_b_id")
    .eq("id", match_id)
    .maybeSingle();

  if (!match) {
    return NextResponse.json({ success: false, message: "ไม่พบแมตช์นี้" }, { status: 404 });
  }

  // 3) หาว่านักเรียนอยู่ทีมไหน ในแมตช์นี้
  const teamIds = [match.team_a_id, match.team_b_id].filter(Boolean) as string[];
  const { data: membership } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("student_id", student.id)
    .in("team_id", teamIds)
    .maybeSingle();

  if (!membership) {
    return NextResponse.json(
      { success: false, message: `${student.full_name} ไม่ได้อยู่ในทีมที่แข่งขันแมตช์นี้` },
      { status: 422 }
    );
  }

  const teamId = membership.team_id;
  const slot = teamId === match.team_a_id ? "a" : "b";

  // 4) บันทึก check-in (ถ้าสแกนซ้ำ → unique constraint จะ error)
  const { error: insertErr } = await supabase
    .from("match_checkins")
    .insert({ match_id, student_id: student.id, team_id: teamId });

  const alreadyCheckedIn = insertErr?.code === "23505"; // unique violation
  if (insertErr && !alreadyCheckedIn) {
    return NextResponse.json({ success: false, message: insertErr.message }, { status: 500 });
  }

  // 5) นับ check-in ของทีมนี้
  const { count: checkinCount } = await supabase
    .from("match_checkins")
    .select("id", { count: "exact", head: true })
    .eq("match_id", match_id)
    .eq("team_id", teamId);

  // 6) ดึง team_size ของกีฬานี้
  const { data: sport } = await supabase
    .from("sport_types")
    .select("team_size")
    .eq("id", match.sport_id)
    .maybeSingle();

  const required = sport?.team_size ?? null;
  const count = checkinCount ?? 0;

  // 7) ถ้าครบตาม team_size → auto-mark checked_in
  let autoCheckedIn = false;
  if (required !== null && count >= required) {
    const updateField = slot === "a"
      ? { team_a_checked_in: true }
      : { team_b_checked_in: true };
    await supabase.from("matches").update(updateField).eq("id", match_id);
    autoCheckedIn = true;
  }

  return NextResponse.json({
    success: true,
    already: alreadyCheckedIn,
    student_name: student.full_name,
    team_id: teamId,
    slot,
    count,
    required,
    auto_checked_in: autoCheckedIn,
  });
}

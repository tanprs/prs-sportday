-- ============================================================
-- 0007: student_login_invites
--
-- เปิดทางให้นักเรียน (ที่ไม่มีบัญชีในระบบเช็คชื่อมาเรียนเลย) เข้าระบบกีฬาสีได้
-- โดยแอดมิน/ครูเป็นคนออกรหัสให้เฉพาะคนที่ต้องใช้งานจริง (หัวหน้าชนิดกีฬา/
-- หัวหน้าสี) — ไม่เปิดสมัครเองอิสระ ตรวจกับตาราง `students` (sync มาจาก
-- ระบบเช็คชื่อแล้วใน 0006) ว่ามีตัวตนจริงก่อนออกรหัสทุกครั้ง
--
-- Flow เต็มอยู่ใน src/lib/actions/studentAuth.ts (claimStudentAccount,
-- studentLogin) — การออก/ดูรหัส (issue/list/revoke) ทำตรงจากฝั่ง client
-- ผ่าน RLS ปกติ (เหมือนหน้าจัดการทีมอื่น ๆ ในแอป) ไม่ต้องผ่าน service role
-- ============================================================

create table student_login_invites (
  id            uuid primary key default gen_random_uuid(),
  student_code  text not null references students(student_code),
  claim_code    text not null,
  role          user_role not null default 'sport_captain',
  created_by    uuid references user_profiles(id),
  claimed_at    timestamptz,
  claimed_by    uuid references auth.users(id),
  expires_at    timestamptz not null default (now() + interval '14 days'),
  created_at    timestamptz not null default now()
);

comment on table student_login_invites is
  'รหัสที่แอดมิน/ครูออกให้นักเรียนใช้ผูกบัญชีครั้งแรก (ดู studentAuth.ts). claimed_by ที่ไม่เป็น null = ใช้ไปแล้ว/เคยผูกบัญชีคนนี้มาก่อน (ใช้เป็นประวัติเวลาออกรหัสใหม่กรณีนักเรียนลืมรหัสผ่าน)';

-- กันออกรหัสซ้ำซ้อนสำหรับนักเรียนคนเดียวกันในเวลาเดียวกัน (ยังไม่ใช้)
-- แอดมินที่จะออกรหัสใหม่ให้คนเดิม ต้องลบของเก่าที่ยังไม่ใช้ก่อน (revoke)
create unique index student_invites_one_active_idx
  on student_login_invites (student_code)
  where claimed_at is null;

create index student_invites_student_code_idx on student_login_invites (student_code);
create index student_invites_claimed_by_idx on student_login_invites (claimed_by);

alter table student_login_invites enable row level security;

-- เฉพาะ admin/teacher เห็น/ออก/ลบรหัสได้ — เป็นการสร้างสิทธิ์เข้าระบบให้คนอื่น
-- จึงให้สิทธิ์เท่าระดับเดียวกับการแก้ไข user_profiles (profiles_insert_admin
-- เข้มกว่านี้คือ admin อย่างเดียว แต่ที่นี่ให้ teacher ออกรหัสได้ด้วยเพราะเป็น
-- งานที่ต้องทำบ่อยตอนเปิดให้ลงทะเบียนทีม ไม่อยากให้ติดที่แอดมินคนเดียว)
create policy "invites_select_staff" on student_login_invites
  for select to authenticated using (auth_role() in ('admin','teacher'));

create policy "invites_insert_staff" on student_login_invites
  for insert to authenticated with check (auth_role() in ('admin','teacher'));

create policy "invites_delete_staff" on student_login_invites
  for delete to authenticated using (auth_role() in ('admin','teacher'));

-- ไม่มี policy สำหรับ update/สำหรับ anon โดยตั้งใจ:
-- - นักเรียนตอนผูกบัญชียังไม่มี session (anon) เลยอ่าน/เขียนตารางนี้ตรง ๆ
--   ไม่ได้อยู่แล้วจาก RLS — claimStudentAccount() ใช้ service-role client
--   (createAdminClient) ข้าม RLS ไปจัดการแทน เหมือนแพทเทิร์นเดียวกับ
--   sso.ts
-- - แอดมิน/ครูออกรหัสใหม่ด้วยการลบของเก่า (revoke) แล้ว insert ใหม่
--   ไม่ต้อง update แถวเดิม

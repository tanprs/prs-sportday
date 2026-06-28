-- ============================================================
-- 0009: open up students SELECT to all authenticated staff roles
--
-- Bug report from Tan: scanning a QR card during team registration
-- said "ไม่พบนักเรียนรหัส ... ในระบบ" (student not found) for codes
-- that DO exist in the students table. Root cause: the original
-- students_select_own_house_or_staff policy (0004_rls_policies.sql)
-- restricted SELECT to admin/teacher OR house_color = auth_house_color().
-- A sport_captain/house_captain scanning a student from a DIFFERENT
-- house got zero rows back from RLS — indistinguishable from "doesn't
-- exist" — instead of the intended "ไม่ใช่สีเดียวกัน" mismatch message
-- that TeamRegistration.tsx's buildPendingScan() is supposed to show.
--
-- This was inconsistent with every other table in the schema (teams,
-- team_members, sport_types all use "select ... using (true)" for
-- authenticated users, restricting only writes by role/house — see
-- 0004_rls_policies.sql). Matching that pattern here: read access is
-- opened to all authenticated app roles (all of which are staff/captain/
-- referee accounts, never a public "student" role), while insert/update/
-- delete on students remains admin/teacher only (unchanged).
-- ============================================================

drop policy if exists "students_select_own_house_or_staff" on students;

create policy "students_select_authenticated" on students
  for select to authenticated
  using (true);

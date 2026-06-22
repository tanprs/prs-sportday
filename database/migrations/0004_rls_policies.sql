-- ============================================================
-- 0004: Row Level Security
-- auth_role() / auth_house_color() / registration_is_open() are
-- defined in 0003_business_rules.sql
-- ============================================================

alter table students enable row level security;
alter table classroom_house_mapping enable row level security;
alter table houses enable row level security;
alter table sport_types enable row level security;
alter table registration_windows enable row level security;
alter table user_profiles enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table registrations enable row level security;
alter table matches enable row level security;
alter table audit_logs enable row level security;

-- ------------------------------------------------------------
-- houses: public reference data (colors/hex codes for the UI)
-- ------------------------------------------------------------
create policy "houses_select_all" on houses
  for select to anon, authenticated using (true);

-- split into per-command policies (rather than "for all") so this
-- doesn't duplicate-evaluate against houses_select_all on every SELECT
create policy "houses_insert_admin" on houses
  for insert to authenticated with check (auth_role() = 'admin');
create policy "houses_update_admin" on houses
  for update to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "houses_delete_admin" on houses
  for delete to authenticated using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- students
-- ------------------------------------------------------------
create policy "students_select_own_house_or_staff" on students
  for select to authenticated
  using (auth_role() in ('admin','teacher') or house_color = auth_house_color());

create policy "students_insert_staff" on students
  for insert to authenticated with check (auth_role() in ('admin','teacher'));
create policy "students_update_staff" on students
  for update to authenticated using (auth_role() in ('admin','teacher')) with check (auth_role() in ('admin','teacher'));
create policy "students_delete_staff" on students
  for delete to authenticated using (auth_role() in ('admin','teacher'));

-- ------------------------------------------------------------
-- classroom_house_mapping
-- ------------------------------------------------------------
create policy "mapping_select_staff" on classroom_house_mapping
  for select to authenticated
  using (auth_role() in ('admin','teacher','house_teacher'));

create policy "mapping_insert_admin" on classroom_house_mapping
  for insert to authenticated with check (auth_role() = 'admin');
create policy "mapping_update_admin" on classroom_house_mapping
  for update to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "mapping_delete_admin" on classroom_house_mapping
  for delete to authenticated using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- sport_types: public read (scoreboard/results pages need names),
-- admin-only write
-- ------------------------------------------------------------
create policy "sport_types_select_all" on sport_types
  for select to anon, authenticated using (true);

create policy "sport_types_insert_admin" on sport_types
  for insert to authenticated with check (auth_role() = 'admin');
create policy "sport_types_update_admin" on sport_types
  for update to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "sport_types_delete_admin" on sport_types
  for delete to authenticated using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- registration_windows
-- column-level restriction for teacher is enforced by the
-- trg_restrict_window_update trigger, not by RLS
-- ------------------------------------------------------------
create policy "windows_select_all" on registration_windows
  for select to anon, authenticated using (true);

create policy "windows_insert_admin" on registration_windows
  for insert to authenticated
  with check (auth_role() = 'admin');

create policy "windows_update_admin_or_teacher" on registration_windows
  for update to authenticated
  using (auth_role() in ('admin','teacher'))
  with check (auth_role() in ('admin','teacher'));

create policy "windows_delete_admin" on registration_windows
  for delete to authenticated
  using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- user_profiles
-- ------------------------------------------------------------
-- (select auth.uid()) instead of bare auth.uid() lets Postgres cache the
-- result once per statement instead of re-evaluating it per row
create policy "profiles_select_self_or_staff" on user_profiles
  for select to authenticated
  using ((select auth.uid()) = id or auth_role() in ('admin','teacher'));

create policy "profiles_insert_admin" on user_profiles
  for insert to authenticated with check (auth_role() = 'admin');
create policy "profiles_update_admin" on user_profiles
  for update to authenticated using (auth_role() = 'admin') with check (auth_role() = 'admin');
create policy "profiles_delete_admin" on user_profiles
  for delete to authenticated using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- teams
-- ------------------------------------------------------------
create policy "teams_select_public" on teams
  for select to anon
  using (status in ('approved','locked'));

create policy "teams_select_authenticated" on teams
  for select to authenticated using (true);

create policy "teams_insert" on teams
  for insert to authenticated
  with check (
    house_color = auth_house_color()
    and (
      auth_role() in ('admin','teacher','house_teacher')
      or (auth_role() = 'sport_captain' and registration_is_open(house_color))
    )
  );

-- status-transition legality is enforced by trg_team_status_transition;
-- this policy just gates *who may attempt* to touch the row at all
create policy "teams_update" on teams
  for update to authenticated
  using (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'house_teacher' and house_color = auth_house_color())
    or (auth_role() = 'sport_captain' and house_color = auth_house_color()
        and status = 'draft' and registration_is_open(house_color))
  )
  with check (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'house_teacher' and house_color = auth_house_color())
    or (auth_role() = 'sport_captain' and house_color = auth_house_color())
  );

create policy "teams_delete_admin" on teams
  for delete to authenticated
  using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- team_members
-- house_teacher/sport_captain may not touch a locked team's roster
-- ------------------------------------------------------------
create policy "members_select_authenticated" on team_members
  for select to authenticated using (true);

create policy "members_insert" on team_members
  for insert to authenticated
  with check (
    auth_role() in ('admin','teacher')
    or (
      auth_role() = 'house_teacher'
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) <> 'locked'
    )
    or (
      auth_role() = 'sport_captain'
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) = 'draft'
      and registration_is_open(auth_house_color())
    )
  );

create policy "members_update" on team_members
  for update to authenticated
  using (
    auth_role() in ('admin','teacher')
    or (
      auth_role() = 'house_teacher'
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) <> 'locked'
    )
    or (
      auth_role() = 'sport_captain'
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) = 'draft'
      and registration_is_open(auth_house_color())
    )
  )
  with check (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'house_teacher' and (select house_color from teams where id = team_id) = auth_house_color())
    or (auth_role() = 'sport_captain' and (select house_color from teams where id = team_id) = auth_house_color())
  );

create policy "members_delete" on team_members
  for delete to authenticated
  using (
    auth_role() in ('admin','teacher')
    or (
      auth_role() = 'house_teacher'
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) <> 'locked'
    )
    or (
      auth_role() = 'sport_captain'
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) = 'draft'
      and registration_is_open(auth_house_color())
    )
  );

-- ------------------------------------------------------------
-- registrations: read-only ledger. All writes happen via the
-- security-definer trg_sync_registration trigger, so no client
-- role gets an insert/update/delete policy here at all.
-- ------------------------------------------------------------
create policy "registrations_select_staff_or_own_house" on registrations
  for select to authenticated
  using (
    auth_role() in ('admin','teacher')
    or (select house_color from students where id = student_id) = auth_house_color()
  );

-- ------------------------------------------------------------
-- matches: public read (scoreboard/results), staff write,
-- referees limited to their own assigned sports and can't reopen
-- a match once it's marked completed
-- ------------------------------------------------------------
create policy "matches_select_public" on matches
  for select to anon using (true);

create policy "matches_select_authenticated" on matches
  for select to authenticated using (true);

create policy "matches_insert_staff" on matches
  for insert to authenticated
  with check (auth_role() in ('admin','teacher'));

-- staff and referees merged into one UPDATE policy (two separate
-- permissive policies for the same command/role both get evaluated on
-- every row, which the linter flags as redundant)
create policy "matches_update" on matches
  for update to authenticated
  using (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'referee' and status <> 'completed' and sport_id = any (auth_assigned_sports()))
  )
  with check (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'referee' and sport_id = any (auth_assigned_sports()))
  );

create policy "matches_delete_admin" on matches
  for delete to authenticated
  using (auth_role() = 'admin');

-- ------------------------------------------------------------
-- audit_logs: read-only for admin/teacher. Writes only ever come
-- from the security-definer audit_* trigger functions.
-- ------------------------------------------------------------
create policy "audit_select_staff" on audit_logs
  for select to authenticated
  using (auth_role() in ('admin','teacher'));

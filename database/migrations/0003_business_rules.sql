-- ============================================================
-- 0003: helper functions + business-rule triggers
-- Goal: enforce as much tournament logic as possible at the DB
-- level so the app (and a non-technical admin poking at the data)
-- cannot accidentally create an invalid registration.
-- ============================================================

-- ------------------------------------------------------------
-- auth helpers (security definer so they can read user_profiles
-- even though user_profiles itself has RLS enabled — avoids
-- recursive-policy chicken/egg problems)
-- ------------------------------------------------------------
create or replace function auth_role()
returns user_role
language sql stable security definer set search_path = public as $$
  select role from user_profiles where id = auth.uid();
$$;

create or replace function auth_house_color()
returns text
language sql stable security definer set search_path = public as $$
  select house_color from user_profiles where id = auth.uid();
$$;

-- Needed because `x = ANY (subquery)` in Postgres treats the subquery as
-- a row-set (comparing uuid to each row of type uuid[], which errors),
-- not as "is x an element of this array". Wrapping the lookup in a
-- function avoids that parsing ambiguity wherever assigned_sports is checked.
create or replace function auth_assigned_sports()
returns uuid[]
language sql stable security definer set search_path = public as $$
  select assigned_sports from user_profiles where id = auth.uid();
$$;

-- is registration currently open for a given house, honoring
-- the per-house extension columns on the active window
create or replace function registration_is_open(p_house text)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from registration_windows w
    where w.is_active = true
      and now() >= w.start_at
      and now() <= coalesce(
            case p_house
              when 'red'    then w.red_extended_until
              when 'yellow' then w.yellow_extended_until
              when 'green'  then w.green_extended_until
              when 'blue'   then w.blue_extended_until
            end,
            w.end_at)
  );
$$;

-- does a student's grade_level fall inside a sport's grade_group label?
-- 'รวม' is a label this migration introduces for esports that combine
-- ม.ต้น + ม.ปลาย into a single division (Valorant, Free Fire) — see
-- ASSUMPTIONS.md for why.
create or replace function grade_in_group(p_grade text, p_group text)
returns boolean
language sql immutable set search_path = public as $$
  select case p_group
    when 'ม.1-2' then p_grade in ('ม.1','ม.2')
    when 'ม.3-4' then p_grade in ('ม.3','ม.4')
    when 'ม.5-6' then p_grade in ('ม.5','ม.6')
    when 'ม.ต้น' then p_grade in ('ม.1','ม.2','ม.3')
    when 'ม.ปลาย' then p_grade in ('ม.4','ม.5','ม.6')
    when 'รวม' then p_grade in ('ม.1','ม.2','ม.3','ม.4','ม.5','ม.6')
    else p_grade = p_group
  end;
$$;

-- ------------------------------------------------------------
-- max 2 sports per student (from the brief, applied to `registrations`)
-- ------------------------------------------------------------
create or replace function check_max_sports_per_student()
returns trigger as $$
begin
  if (select count(*) from registrations where student_id = new.student_id) >= 2 then
    raise exception 'นักเรียนคนนี้ลงทะเบียนครบ 2 ชนิดกีฬาแล้ว';
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_max_sports
  before insert on registrations
  for each row execute function check_max_sports_per_student();

-- ------------------------------------------------------------
-- team_members: house-color match + gender/grade eligibility +
-- per-grade quota + roster size cap, all in one BEFORE INSERT check
-- ------------------------------------------------------------
create or replace function check_team_quota()
returns trigger as $$
declare
  v_team    teams;
  v_sport   sport_types;
  v_student students;
  v_grade_quota   int;
  v_current_count int;
  v_total_count   int;
begin
  select * into v_team from teams where id = new.team_id;
  select * into v_sport from sport_types where id = v_team.sport_id;
  select * into v_student from students where id = new.student_id;

  if v_student.house_color is distinct from v_team.house_color then
    raise exception 'นักเรียนสี % ลงทีมสี % ไม่ได้', v_student.house_color, v_team.house_color;
  end if;

  if v_sport.gender_type <> 'both' then
    if (v_sport.gender_type = 'male' and v_student.gender <> 'M')
       or (v_sport.gender_type = 'female' and v_student.gender <> 'F') then
      raise exception 'เพศของนักเรียนไม่ตรงกับรุ่นการแข่งขัน (%)', v_sport.gender_type;
    end if;
  end if;

  if not grade_in_group(v_student.grade_level, v_sport.grade_group) then
    raise exception 'นักเรียนชั้น % ไม่อยู่ในรุ่นที่แข่งขันนี้ (%)', v_student.grade_level, v_sport.grade_group;
  end if;

  if new.role = 'main' and v_sport.team_size is not null then
    select count(*) into v_total_count from team_members
      where team_id = new.team_id and role = 'main';
    if v_total_count >= v_sport.team_size then
      raise exception 'ทีมนี้มีผู้เล่นตัวจริงครบ % คนแล้ว', v_sport.team_size;
    end if;
  end if;

  if new.role = 'main' and v_sport.sub_grade_quota is not null then
    v_grade_quota := (v_sport.sub_grade_quota ->> v_student.grade_level)::int;
    if v_grade_quota is not null then
      select count(*) into v_current_count
        from team_members tm join students s on s.id = tm.student_id
        where tm.team_id = new.team_id and tm.role = 'main' and s.grade_level = v_student.grade_level;
      if v_current_count >= v_grade_quota then
        raise exception 'โควตาชั้น % ในทีมนี้ครบ % คนแล้ว', v_student.grade_level, v_grade_quota;
      end if;
    end if;
  end if;

  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_team_quota
  before insert on team_members
  for each row execute function check_team_quota();

-- ------------------------------------------------------------
-- teams: cap number of teams per color per sport (e.g. Free Fire = 4)
-- ------------------------------------------------------------
create or replace function check_max_teams_per_color()
returns trigger as $$
declare
  v_max   int;
  v_count int;
begin
  select max_teams_per_color into v_max from sport_types where id = new.sport_id;
  select count(*) into v_count from teams
    where sport_id = new.sport_id and house_color = new.house_color and status <> 'rejected';
  if v_max is not null and v_count >= v_max then
    raise exception 'สี % มีทีมกีฬานี้ครบ % ทีมแล้ว', new.house_color, v_max;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_max_teams
  before insert on teams
  for each row execute function check_max_teams_per_color();

-- ------------------------------------------------------------
-- only admin/teacher may jump statuses freely; house_teacher and
-- sport_captain may only submit a draft (draft -> submitted) or
-- edit content without changing status. Approve/reject/unlock/lock
-- always require teacher or admin.
-- ------------------------------------------------------------
create or replace function enforce_team_status_transition()
returns trigger as $$
begin
  if auth_role() in ('admin','teacher') then
    return new;
  end if;
  if new.status = old.status then
    return new;
  end if;
  if old.status = 'draft' and new.status = 'submitted' then
    return new;
  end if;
  raise exception 'ไม่สามารถเปลี่ยนสถานะทีมจาก % เป็น % ได้ ต้องให้กรรมการดำเนินการ', old.status, new.status;
end;
$$ language plpgsql set search_path = public;

create trigger trg_team_status_transition
  before update on teams
  for each row execute function enforce_team_status_transition();

-- ------------------------------------------------------------
-- registration_windows: teacher may only touch the per-house
-- extension columns, never name/start_at/end_at/is_active
-- ------------------------------------------------------------
create or replace function restrict_window_update_columns()
returns trigger as $$
begin
  if auth_role() = 'teacher' then
    if new.name is distinct from old.name
       or new.start_at is distinct from old.start_at
       or new.end_at is distinct from old.end_at
       or new.is_active is distinct from old.is_active then
      raise exception 'ครูแก้ไขได้เฉพาะการขยายเวลาเฉพาะสีเท่านั้น';
    end if;
  end if;
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_restrict_window_update
  before update on registration_windows
  for each row execute function restrict_window_update_columns();

-- ------------------------------------------------------------
-- mirror team_members into registrations. This makes `registrations`
-- the single source of truth for "is this student registered for
-- this sport" regardless of whether the entry came from a team
-- registration screen or an individual one, which is what makes the
-- 2-sport cap above actually airtight.
-- ------------------------------------------------------------
create or replace function sync_registration_from_team_member()
returns trigger as $$
declare
  v_sport_id uuid;
begin
  if tg_op = 'INSERT' then
    select sport_id into v_sport_id from teams where id = new.team_id;
    insert into registrations (student_id, sport_id, team_id)
      values (new.student_id, v_sport_id, new.team_id)
      on conflict (student_id, sport_id) do nothing;
  elsif tg_op = 'DELETE' then
    delete from registrations where student_id = old.student_id and team_id = old.team_id;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_sync_registration
  after insert or delete on team_members
  for each row execute function sync_registration_from_team_member();

-- ------------------------------------------------------------
-- updated_at touch for teams
-- ------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public;

create trigger trg_teams_updated_at
  before update on teams
  for each row execute function touch_updated_at();

-- ------------------------------------------------------------
-- automatic audit logging — fires regardless of which client made
-- the change, so the log can't be skipped by app code
-- ------------------------------------------------------------
create or replace function audit_team_status_change()
returns trigger as $$
begin
  if new.status is distinct from old.status then
    insert into audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    values (
      auth.uid(),
      case new.status
        when 'submitted' then 'submit_team'
        when 'approved'  then 'approve_team'
        when 'rejected'  then 'reject_team'
        when 'draft'     then 'unlock_team'
        when 'locked'    then 'lock_team'
        else 'update_team_status'
      end,
      'teams', new.id,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_team_status
  after update on teams
  for each row execute function audit_team_status_change();

create or replace function audit_team_member_change()
returns trigger as $$
begin
  if tg_op = 'INSERT' then
    insert into audit_logs (user_id, action, table_name, record_id, new_value)
    values (auth.uid(), 'add_member', 'team_members', new.id,
      jsonb_build_object('team_id', new.team_id, 'student_id', new.student_id, 'role', new.role));
    return new;
  elsif tg_op = 'DELETE' then
    insert into audit_logs (user_id, action, table_name, record_id, old_value)
    values (auth.uid(), 'remove_member', 'team_members', old.id,
      jsonb_build_object('team_id', old.team_id, 'student_id', old.student_id, 'role', old.role));
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_team_member
  after insert or delete on team_members
  for each row execute function audit_team_member_change();

create or replace function audit_match_change()
returns trigger as $$
begin
  if (new.score_a, new.score_b, new.status) is distinct from (old.score_a, old.score_b, old.status) then
    insert into audit_logs (user_id, action, table_name, record_id, old_value, new_value)
    values (
      auth.uid(), 'record_score', 'matches', new.id,
      jsonb_build_object('score_a', old.score_a, 'score_b', old.score_b, 'status', old.status),
      jsonb_build_object('score_a', new.score_a, 'score_b', new.score_b, 'status', new.status)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_audit_match
  after update on matches
  for each row execute function audit_match_change();

-- ------------------------------------------------------------
-- auto-create a user_profiles row on signup (defaults to
-- sport_captain with no house — admin assigns role + house in
-- /admin/users afterwards)
-- ------------------------------------------------------------
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'sport_captain');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

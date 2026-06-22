-- ============================================================
-- 0002: core tables (per project brief section 3)
-- ============================================================

-- 1. students (sync จาก QR API)
create table students (
  id            uuid primary key default gen_random_uuid(),
  student_code  text unique not null,
  title         text,
  full_name     text not null,
  grade_level   text not null,
  classroom     text not null,
  gender        text check (gender in ('M','F')),
  house_color   text check (house_color in ('red','yellow','green','blue')),
  photo_url     text,
  created_at    timestamptz default now()
);

-- 2. classroom_house_mapping
create table classroom_house_mapping (
  id          uuid primary key default gen_random_uuid(),
  grade_level text not null,
  classroom   text not null,
  house_color text not null check (house_color in ('red','yellow','green','blue')),
  unique (grade_level, classroom)
);

-- houses: color/branding lookup, referenced by section 2 of the brief.
-- Not one of the original 10 tables, but every screen (scoreboard, team
-- chips, etc.) needs the hex codes, so it gets its own small table
-- instead of being hardcoded in the frontend.
create table houses (
  house_color   text primary key check (house_color in ('red','yellow','green','blue')),
  name_th       text not null,
  primary_hex   text not null,
  secondary_hex text not null
);

-- 3. sport_types
create table sport_types (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  category            text not null check (category in ('team_sport','individual','esport')),
  grade_group         text not null,
  gender_type         text not null default 'both' check (gender_type in ('male','female','both')),
  team_size           int,
  sub_grade_quota     jsonb,
  max_teams_per_color int default 1,
  is_active           boolean default true,
  sort_order          int default 0
);

-- 4. registration_windows
create table registration_windows (
  id                     uuid primary key default gen_random_uuid(),
  name                   text not null,
  start_at               timestamptz not null,
  end_at                 timestamptz not null,
  is_active              boolean default false,
  red_extended_until     timestamptz,
  yellow_extended_until  timestamptz,
  green_extended_until   timestamptz,
  blue_extended_until    timestamptz,
  created_by             uuid references auth.users(id),
  created_at             timestamptz default now()
);

-- 5. user_profiles
create table user_profiles (
  id              uuid primary key references auth.users(id),
  role            user_role not null default 'sport_captain',
  full_name       text not null,
  house_color     text check (house_color in ('red','yellow','green','blue')),
  assigned_sports uuid[],
  is_active       boolean default true,
  created_at      timestamptz default now()
);

-- 6. teams
create table teams (
  id           uuid primary key default gen_random_uuid(),
  sport_id     uuid not null references sport_types(id),
  house_color  text not null check (house_color in ('red','yellow','green','blue')),
  team_name    text,
  status       team_status default 'draft',
  reject_note  text,
  created_by   uuid references auth.users(id),
  approved_by  uuid references auth.users(id),
  approved_at  timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

-- 7. team_members
create table team_members (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null references teams(id) on delete cascade,
  student_id  uuid not null references students(id),
  role        text default 'main' check (role in ('main','reserve')),
  added_by    uuid references auth.users(id),
  created_at  timestamptz default now(),
  unique (team_id, student_id)
);

-- 8. registrations (one row per student per sport, regardless of
-- team/individual/esport — the 2-sport-per-student cap is enforced here)
create table registrations (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references students(id),
  sport_id    uuid not null references sport_types(id),
  team_id     uuid references teams(id),
  created_at  timestamptz default now(),
  unique (student_id, sport_id)
);

-- 9. matches
create table matches (
  id           uuid primary key default gen_random_uuid(),
  sport_id     uuid not null references sport_types(id),
  round        match_round not null,
  match_no     text,
  team_a_id    uuid references teams(id),
  team_b_id    uuid references teams(id),
  score_a      int default 0,
  score_b      int default 0,
  winner_id    uuid references teams(id),
  match_date   date,
  venue        text,
  status       match_status default 'scheduled',
  notes        text,
  recorded_by  uuid references auth.users(id),
  recorded_at  timestamptz,
  created_at   timestamptz default now()
);

-- 10. audit_logs
create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  action      text not null,
  table_name  text,
  record_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  note        text,
  created_at  timestamptz default now()
);

-- indexes for the lookups the app will do constantly
create index idx_students_house_color on students(house_color);
create index idx_students_grade_classroom on students(grade_level, classroom);
create index idx_team_members_team on team_members(team_id);
create index idx_team_members_student on team_members(student_id);
create index idx_teams_sport_house on teams(sport_id, house_color);
create index idx_registrations_student on registrations(student_id);
create index idx_matches_sport_round on matches(sport_id, round);
create index idx_audit_logs_table_record on audit_logs(table_name, record_id);

-- covering indexes for remaining foreign keys (flagged by the
-- Supabase performance advisor as unindexed)
create index idx_audit_logs_user on audit_logs(user_id);
create index idx_matches_recorded_by on matches(recorded_by);
create index idx_matches_team_a on matches(team_a_id);
create index idx_matches_team_b on matches(team_b_id);
create index idx_matches_winner on matches(winner_id);
create index idx_windows_created_by on registration_windows(created_by);
create index idx_registrations_sport on registrations(sport_id);
create index idx_registrations_team on registrations(team_id);
create index idx_team_members_added_by on team_members(added_by);
create index idx_teams_approved_by on teams(approved_by);
create index idx_teams_created_by on teams(created_by);

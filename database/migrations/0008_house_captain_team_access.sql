-- ============================================================
-- 0008: house_captain (หัวหน้าสี) gets the same write access to
-- teams/team_members that sport_captain already has. Previously
-- house_captain had zero policy coverage on these tables — Tan
-- confirmed house_captain should be permission-equivalent to
-- sport_captain for team registration.
--
-- Mechanically: drop + recreate the 5 affected policies from
-- 0004_rls_policies.sql, replacing every
--   auth_role() = 'sport_captain'
-- with
--   auth_role() in ('sport_captain','house_captain')
-- Conditions are otherwise byte-for-byte identical.
-- ============================================================

drop policy if exists "teams_insert" on teams;
create policy "teams_insert" on teams
  for insert to authenticated
  with check (
    house_color = auth_house_color()
    and (
      auth_role() in ('admin','teacher','house_teacher')
      or (auth_role() in ('sport_captain','house_captain') and registration_is_open(house_color))
    )
  );

drop policy if exists "teams_update" on teams;
create policy "teams_update" on teams
  for update to authenticated
  using (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'house_teacher' and house_color = auth_house_color())
    or (auth_role() in ('sport_captain','house_captain') and house_color = auth_house_color()
        and status = 'draft' and registration_is_open(house_color))
  )
  with check (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'house_teacher' and house_color = auth_house_color())
    or (auth_role() in ('sport_captain','house_captain') and house_color = auth_house_color())
  );

drop policy if exists "members_insert" on team_members;
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
      auth_role() in ('sport_captain','house_captain')
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) = 'draft'
      and registration_is_open(auth_house_color())
    )
  );

drop policy if exists "members_update" on team_members;
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
      auth_role() in ('sport_captain','house_captain')
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) = 'draft'
      and registration_is_open(auth_house_color())
    )
  )
  with check (
    auth_role() in ('admin','teacher')
    or (auth_role() = 'house_teacher' and (select house_color from teams where id = team_id) = auth_house_color())
    or (auth_role() in ('sport_captain','house_captain') and (select house_color from teams where id = team_id) = auth_house_color())
  );

drop policy if exists "members_delete" on team_members;
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
      auth_role() in ('sport_captain','house_captain')
      and (select house_color from teams where id = team_id) = auth_house_color()
      and (select status from teams where id = team_id) = 'draft'
      and registration_is_open(auth_house_color())
    )
  );

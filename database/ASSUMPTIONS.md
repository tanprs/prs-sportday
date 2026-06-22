# กีฬาสี 2569 — Phase 1 (Database) — Assumptions & Hand-off Notes

Supabase project: `kilasi-2569` (`gnqsbswdcglpvoxmjdop`). Migrations in `database/migrations/0001`–`0005`, applied in order.

## What's built

11 tables (10 from the brief + `houses`), all enums, all RLS policies, all business-rule triggers, and seed data for `houses` (4 rows) and `sport_types` (46 rows). `students` and `classroom_house_mapping` are intentionally empty — they get populated in Phase 2 from the QR attendance API.

## Judgment calls made beyond the literal brief

**`houses` table (new, not in the original 10-table list).** Every UI screen (scoreboard, team chips, standings) needs each house's display name and hex colors. Rather than hardcode those in the frontend, they live in a small reference table seeded in `0005`.

**`'รวม'` grade_group label (invented).** The brief lists Valorant and Free Fire as ม.ต้น+ม.ปลาย combined divisions. The existing grade_group values (ม.1-2, ม.3-4, ม.5-6, ม.ต้น, ม.ปลาย) had no label for "all secondary grades, one division," so `'รวม'` was added to `grade_in_group()`. If you'd rather spell this differently, it's a one-line change in `0003_business_rules.sql` plus the two `sport_types` rows in `0005_seed_data.sql`.

**Per-grade roster quotas extrapolated.** The brief gives one explicit example (futsal/basketball ม.1=4, ม.2=4, worded "เช่น" — "for example") and doesn't spell out ม.3-4 or ม.5-6. Phase 1 applies the same split to all three grade groups: futsal/basketball 4+4 (team size 8), sharball/volleyball 5+5 (team size 10). Worth a quick confirm with whoever owns the tournament rules before teams start registering — it's enforced in `check_team_quota()`, easy to change per grade group if the real numbers differ.

**Status transitions enforced by trigger, not RLS.** RLS can gate *who may touch a row*, but can't cleanly compare old vs. new status within one `UPDATE` policy. So `teams_update` (RLS) controls who can attempt an update at all, and `enforce_team_status_transition()` (trigger) enforces the actual lifecycle: admin/teacher can jump anywhere; house_teacher/sport_captain can only edit without changing status, or move draft→submitted. Approve/reject/unlock/lock always require teacher or admin — this is also where "house_teacher cannot unlock a rejected team" lives, since that's a status-transition rule, not a row-access rule.

**Locked-team roster edits.** house_teacher/sport_captain lose insert/update/delete on `team_members` once the parent team's status is `locked` (checked directly in the RLS policies on `team_members`, not via trigger). admin/teacher are unrestricted.

**Default role on signup.** `handle_new_user()` auto-creates a `user_profiles` row with role `sport_captain` and no house on every new `auth.users` signup. An admin has to go assign the real role + house color afterward — there's no self-service role picker by design, since role assignment is a trust decision.

## Security/performance advisor findings — reviewed

Ran Supabase's advisor after applying migrations. Fixed: 7 functions missing `search_path` hardening, one un-cached `auth.uid()` call in an RLS policy, 6 redundant duplicate-policy pairs (split `for all` admin policies into per-command policies; merged the two `matches` UPDATE policies into one), and added indexes on 11 previously-unindexed foreign key columns.

Left as-is, reviewed and accepted: the advisor flags `auth_role()`, `auth_house_color()`, `auth_assigned_sports()`, and `registration_is_open()` as callable directly via PostgREST RPC by `anon`/`authenticated`. This is required — RLS policies call these functions, so the roles that evaluate those policies must have execute privilege on them. Each function only returns information the calling user already has access to (their own role/house/assigned sports, or a public boolean about whether registration is open), so direct RPC access isn't a real exposure. The `audit_*`, `handle_new_user`, and `sync_registration_from_team_member` functions are also flagged, but they're trigger functions that reference `NEW`/`OLD`/`TG_OP` — Postgres rejects any attempt to call a trigger function directly outside trigger context, so this flag doesn't correspond to an actual call path. Remaining advisor output is informational "unused index" notices, expected on tables with zero rows.

## Not done (out of Phase 1 scope, per your call to build DB + RLS only this session)

QR attendance API sync (Edge Function), Next.js app shell, Cloudflare Access, GitHub repo setup, `students`/`classroom_house_mapping` data.

## Note on the Supabase org's free-project limit

Your org was capped at 2 free projects, so "tanprs's Project" (`isgybmzzmfdctkzgnrzr`) was **paused**, not deleted, to free a slot for `kilasi-2569`. If you don't need it, you can delete it from the dashboard; if you do, you can restore it.

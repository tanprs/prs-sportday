-- ============================================================
-- 0010: roster_sync_state
--
-- Tan received written guidance from the attendance-system side
-- (เอกสาร "คำแนะนำการเชื่อมต่อ API ระบบเช็คชื่อ", 30 มิ.ย. 2569) warning
-- that Supabase egress (5GB/month free tier) and Render bandwidth are
-- shared school-wide and have been exhausted before — the doc asks
-- callers to track their own last-synced time and pass it as
-- `updatedSince` instead of re-fetching all 1,300+ students every run.
--
-- sync-roster (supabase/functions/sync-roster/index.ts) previously did
-- a full fetch on every invocation (daily cron AND every manual click
-- of "ซิงค์นักเรียน" in /admin) with no `updatedSince` at all — this
-- table is the persisted "last successful sync" checkpoint that fixes
-- that. Singleton row (id is always `true`) — there is only ever one
-- sync-roster job, so no need for a more general key/value table.
--
-- RLS is enabled with NO policies: this table is only ever touched by
-- the Edge Function via the service_role client (which bypasses RLS
-- entirely), so no authenticated/anon role should be able to read or
-- write it directly.
-- ============================================================

create table roster_sync_state (
  id             boolean primary key default true,
  last_synced_at timestamptz,
  constraint roster_sync_state_singleton check (id)
);

alter table roster_sync_state enable row level security;

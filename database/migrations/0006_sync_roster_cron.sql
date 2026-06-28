-- 0006_sync_roster_cron.sql
-- ตั้ง cron รายวันให้เรียก Edge Function "sync-roster" อัตโนมัติ
--
-- ⚠️ ก่อนรัน migration นี้ ต้องสร้าง Vault secret ชื่อ 'service_role_key' ก่อน
-- (เก็บค่า service_role key จริงไว้ใน Supabase Vault โดยตรง ไม่ผ่านแชทนี้):
--
--   select vault.create_secret(
--     'วาง_SERVICE_ROLE_KEY_จริงตรงนี้',
--     'service_role_key'
--   );
--
-- รันคำสั่งข้างบนเองใน Supabase SQL editor ก่อน แล้วค่อยรัน migration นี้

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ลบ schedule เดิมถ้ามี (เผื่อรัน migration นี้ซ้ำ)
select cron.unschedule('sync-roster-daily')
where exists (select 1 from cron.job where jobname = 'sync-roster-daily');

-- รันทุกวัน 23:00 UTC = 06:00 เวลาไทย (ก่อนเข้าเรียน)
select cron.schedule(
  'sync-roster-daily',
  '0 23 * * *',
  $$
  select net.http_post(
    url := 'https://gnqsbswdcglpvoxmjdop.supabase.co/functions/v1/sync-roster',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'service_role_key'
      ),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);

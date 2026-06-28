# Cloudflare Secrets Checklist — PRS Sports Day

ค่าพวกนี้เป็นความลับ **ห้ามเก็บไว้ในไฟล์ใดๆ บนเครื่อง** — ใช้คำสั่ง
`wrangler secret put` แล้วพิมพ์/วางค่าตรงในเทอร์มินัลตอนถูกถาม
ค่าจะถูกส่งไปเก็บแบบเข้ารหัสที่ Cloudflare เท่านั้น ไม่ผ่านไฟล์ใดๆ

## 1. SUPABASE_SERVICE_ROLE_KEY
หาได้จาก: Supabase Dashboard → โปรเจกต์ PRS Sports Day → Settings → API
→ Project API keys → `service_role` (secret)

```
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

- [x] ตั้งค่าแล้ว

## หลังตั้งค่าเสร็จ

```
npm run deploy
```

จะได้ URL `https://prs-sportday.<subdomain>.workers.dev` — เปิดบนมือถือเพื่อทดสอบกล้องสแกน QR ผ่าน HTTPS จริง

ลบไฟล์นี้ทิ้งได้หลังตั้งค่าเสร็จ (ไม่มีข้อมูลลับอยู่ในไฟล์ แต่ก็ไม่จำเป็นต้องเก็บไว้)

---

## หมายเหตุ: ATTENDANCE_SERVICE_USERNAME / ATTENDANCE_SERVICE_PASSWORD

ไม่เกี่ยวกับ Cloudflare Worker นี้ — ไม่ต้องตั้งด้วย `wrangler secret put`

ค่าทั้งสองนี้ใช้เฉพาะใน Supabase Edge Function `sync-roster`
(`supabase/functions/sync-roster/index.ts`) ซึ่งรันบน Supabase ไม่ใช่ Cloudflare
ถ้าจะเปิดใช้งาน roster-sync cron ต้องไปตั้งที่ Supabase Dashboard →
Edge Functions → Secrets แยกเป็นอีกขั้นตอนทีหลัง ไม่กระทบ deploy รอบนี้

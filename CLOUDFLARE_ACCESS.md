# กีฬาสี 2569 — ตั้งค่า Cloudflare Access (จำกัดการเข้าถึง)

จุดประสงค์: จำกัดให้เฉพาะคนในโรงเรียน (อีเมล `@pr.ac.th`) เข้าหน้าแอปได้ ยกเว้น `/scoreboard` ที่ต้องเปิดสาธารณะต่อไป (ผู้ปกครอง/นักเรียนดูผลแข่งสดได้โดยไม่ต้อง login — ออกแบบไว้แบบนี้ตั้งแต่ Phase 2 ดู `app/README.md`)

**ทำตอนไหน:** หลังจาก deploy แอปไป Cloudflare Pages และมี domain ใช้งานจริงแล้วเท่านั้น (ตอนเขียนเอกสารนี้ยังไม่ได้ deploy — เก็บไว้ใช้ตอน deploy จริง)

## สิ่งที่ต้องมีก่อน

- บัญชี Cloudflare ที่ใช้ deploy Pages (Cloudflare Access ใช้ฟรีได้ถึง 50 ผู้ใช้/เดือน เพียงพอสำหรับโรงเรียน)
- แอป deploy ไป Cloudflare Pages แล้ว มี domain ใช้งานจริง — ใช้ subdomain `*.pages.dev` ที่ Cloudflare ให้มาเลยก็ได้ หรือ custom domain ก็ใช้ Access ได้เหมือนกัน

## ขั้นตอน

### 1) เปิด Zero Trust dashboard

ไปที่ https://one.dash.cloudflare.com — ถ้าเป็นครั้งแรกจะให้ตั้งชื่อทีม (team name) ตั้งอะไรก็ได้ เช่น `phadungrat`

### 2) สร้าง Access Application หลัก (คลุมทั้งโดเมน ยกเว้น scoreboard)

ไปที่ **Access > Applications > Add an application > Self-hosted** กรอก:

- **Application name:** `กีฬาสี 2569`
- **Application domain:** domain จริงของแอป (เช่น `kilasi2569.pages.dev`) — ปล่อยช่อง path ว่างไว้ เพื่อคลุมทั้งโดเมน
- **Session Duration:** เลือกตามสะดวก เช่น 24 ชั่วโมง

ขั้น Identity providers ปล่อย **One-time PIN** ไว้ (เปิดอยู่โดย default ในบัญชีส่วนใหญ่แล้ว ไม่ต้องตั้งเพิ่ม)

ขั้น Policies เพิ่ม policy ใหม่:

- **Policy name:** `pr.ac.th only`
- **Action:** `Allow`
- **Include:** เลือกกฎ "Emails ending in" แล้วกรอก `@pr.ac.th`

กด Save จนจบขั้น Add application

### 3) สร้าง Application ที่สอง สำหรับ /scoreboard (เปิดสาธารณะ)

ไปที่ **Access > Applications > Add an application > Self-hosted** อีกครั้ง กรอก:

- **Application name:** `กีฬาสี 2569 - scoreboard (public)`
- **Application domain:** domain เดียวกันกับขั้นที่ 2 แต่เพิ่ม path `scoreboard*`

ขั้น Policies:

- **Policy name:** `public`
- **Action:** `Bypass`
- **Include:** `Everyone`

Cloudflare จะจับคู่ path ที่เจาะจงกว่าก่อนเสมอ ดังนั้นแม้ Application หลักคลุมทั้งโดเมนไว้แล้ว `/scoreboard*` จะข้ามการ login ของ Cloudflare ไปได้ตามที่ตั้งไว้

### 4) ทดสอบ

- เปิด `/admin` หรือ `/teams` จากเบราว์เซอร์ที่ยังไม่ login กับ Cloudflare → ต้องเจอหน้า login ของ Cloudflare Access ก่อน (กรอกอีเมล `@pr.ac.th` แล้วรับโค้ด OTP ทางอีเมล)
- เปิด `/scoreboard` → ต้องเข้าได้ทันที ไม่มีหน้า login ของ Cloudflare ขึ้นมา
- ลองกรอกอีเมลที่ไม่ใช่ `@pr.ac.th` ตอน login → ต้องถูกปฏิเสธตั้งแต่หน้า Cloudflare เลย ไปไม่ถึงตัวแอป

## ข้อควรรู้

Cloudflare Access เป็นชั้นป้องกันที่อยู่หน้าแอป ทำงานก่อนและคนละระบบกับ login ของแอปเอง (Supabase Auth ผ่าน SSO ของระบบเช็คชื่อ — ดู task #14) ผ่าน Cloudflare Access แล้วก็ยังต้อง login เข้าแอปตามปกติเพื่อใช้หน้าที่ต้องสิทธิ์อยู่ดี สองชั้นนี้ไม่ผูกกัน

ถ้าวันหลังเปลี่ยนใจอยากจำกัดเข้มขึ้น (ห้ามเข้าจากนอกโรงเรียนเลย แม้มีอีเมลถูก) เปลี่ยน Include rule ของ policy หลักจาก "Emails ending in" เป็น "IP ranges" แล้วกรอก IP สาธารณะของโรงเรียน (ขอจากฝ่าย IT/ISP) — แต่ข้อเสียคือเข้าจากบ้านไม่ได้เลยแม้แต่ตัวเอง

รหัส OTP หมดอายุใน 10 นาทีหลังขอ ถ้ากรอกไม่ทันต้องกดขอรหัสใหม่

Bypass policy ของ `/scoreboard` ไม่ได้ผ่านการตรวจ/log ของ Access (เพราะไม่ auth) แต่ traffic ยังผ่าน firewall/WAF ปกติของ Cloudflare อยู่ดี ไม่ใช่ช่องโหว่เพิ่ม

## อ้างอิง

- [Access policies](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/)
- [Self-hosted public application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Application paths (bypass เฉพาะ path)](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/)
- [One-time PIN login](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/)

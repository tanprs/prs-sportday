// ป้ายภาษาไทยล้วน ๆ ไม่มี dependency ฝั่ง server (next/headers) — แยกออกจาก
// auth.ts เพื่อให้ client component (เช่น StudentInviteManager.tsx) import
// ได้โดยไม่ดึง getCurrentProfile()/createClient() จาก supabase/server เข้า
// bundle ฝั่ง browser ไปด้วย (Next.js ห้าม next/headers ใน client bundle)

export const ROLE_LABELS_TH: Record<string, string> = {
  admin: "ผู้ดูแลระบบ",
  teacher: "ครูกีฬาสี",
  house_teacher: "ครูประจำสี",
  sport_captain: "หัวหน้าชนิดกีฬา",
  house_captain: "หัวหน้าสี",
  referee: "ผู้ตัดสิน",
};

export const HOUSE_LABELS_TH: Record<string, string> = {
  red: "สีแดง",
  yellow: "สีเหลือง",
  green: "สีเขียว",
  blue: "สีน้ำเงิน",
};

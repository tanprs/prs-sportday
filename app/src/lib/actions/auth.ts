"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// login/signup แบบเดิม (Supabase Auth ตรง ๆ ด้วยอีเมล/รหัสผ่าน) ถูกแทนที่ด้วย
// SSO ผ่านระบบเช็คชื่อทั้งหมดแล้ว — ดู src/lib/actions/sso.ts (ssoLogin)

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";

/** Admin รีเซ็ต password ให้ user คนอื่น */
export async function adminResetPassword(
  userId: string,
  newPassword: string
): Promise<{ error: string | null }> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin") return { error: "ไม่มีสิทธิ์" };
  if (newPassword.length < 6)
    return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: newPassword,
  });
  if (error) return { error: error.message };
  return { error: null };
}

/** ผู้ใช้เปลี่ยน password ตัวเอง */
export async function changeOwnPassword(
  newPassword: string
): Promise<{ error: string | null }> {
  if (newPassword.length < 6)
    return { error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { error: null };
}

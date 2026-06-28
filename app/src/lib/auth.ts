import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

// ป้ายภาษาไทย (ROLE_LABELS_TH/HOUSE_LABELS_TH) ย้ายไป src/lib/labels.ts —
// ไฟล์นี้มี getCurrentProfile() ที่พึ่ง next/headers (server-only) ผ่าน
// supabase/server ดังนั้น client component ต้อง import labels จาก
// "@/lib/labels" โดยตรง ไม่ใช่จากที่นี่ ส่วน re-export ด้านล่างไว้เพื่อไม่ให้
// Server Component เดิม (layout.tsx, teams/page.tsx, dashboard/page.tsx) ที่
// import จาก "@/lib/auth" อยู่แล้วต้องแก้ไข
export { ROLE_LABELS_TH, HOUSE_LABELS_TH } from "@/lib/labels";

export type Profile = Tables<"user_profiles"> & { email: string | null };

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;
  return { ...profile, email: user.email ?? null };
}

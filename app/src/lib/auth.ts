import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

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

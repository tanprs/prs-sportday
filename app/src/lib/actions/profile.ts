"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateMyAssignedSports(sportIds: string[]): Promise<{ error: string | null }> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("update_my_assigned_sports", {
    sport_ids: sportIds,
  });

  if (error) return { error: error.message };

  revalidatePath("/profile");
  revalidatePath("/matches");
  return { error: null };
}

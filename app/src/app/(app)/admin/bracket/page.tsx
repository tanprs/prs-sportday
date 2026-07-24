import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BracketConfigManager } from "@/components/BracketConfigManager";
import Link from "next/link";

export default async function BracketConfigPage() {
  const profile = await getCurrentProfile();
  if (!profile || !["admin", "teacher"].includes(profile.role)) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  const { data: matches } = await supabase
    .from("matches")
    .select("id, match_no, round, match_date, notes, next_match_id, next_slot, sport_id")
    .order("sport_id")
    .order("match_date", { ascending: true })
    .order("match_no", { ascending: true });

  const { data: sports } = await supabase
    .from("sport_types")
    .select("id, name, grade_group, gender_type")
    .order("sort_order")
    .order("name");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/admin"
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          ← ผู้ดูแลระบบ
        </Link>
      </div>

      <BracketConfigManager
        matches={(matches ?? []) as Parameters<typeof BracketConfigManager>[0]["matches"]}
        sports={sports ?? []}
      />
    </div>
  );
}

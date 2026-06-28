import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Service-role client — bypasses RLS, full DB + Auth Admin access.
// SERVER-SIDE ONLY. Never import this from a Client Component, never send
// SUPABASE_SERVICE_ROLE_KEY to the browser. Used only by the SSO proxy-login
// server action (src/lib/actions/sso.ts), the student claim-code login flow
// (src/lib/actions/studentAuth.ts), and the roster-sync job.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var"
    );
  }

  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

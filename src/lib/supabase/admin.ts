import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Client Supabase avec la clé « service_role » : il contourne les règles RLS.
 * À réserver aux opérations que le serveur doit faire lui-même (paiements,
 * notifications pawaPay, vérifications d'unicité), jamais à une simple lecture
 * faite pour un utilisateur.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

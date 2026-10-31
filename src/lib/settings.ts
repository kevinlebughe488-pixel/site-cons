import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlatformSettings } from "@/lib/types";

/** Tarif prévu par le plan d'affaires pour la première année, si la base ne répond pas. */
const DEFAULT_SETTINGS: PlatformSettings = { publication_fee: 400, launch_date: null };

/** Réglages de la plateforme (tarifs publics, date de lancement). */
export async function getSettings(supabase: SupabaseClient): Promise<PlatformSettings> {
  const { data } = await supabase.from("platform_settings").select("publication_fee, launch_date").maybeSingle<PlatformSettings>();
  return data ? { publication_fee: Number(data.publication_fee), launch_date: data.launch_date } : DEFAULT_SETTINGS;
}

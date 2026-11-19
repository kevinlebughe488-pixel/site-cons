import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignStatus, CampaignWithClub, PriceReference } from "@/lib/types";

export const CAMPAIGN_WITH_CLUB =
  "*, club:clubs!inner(id, slug, name, short_name, color_primary, color_secondary, city, commune, founded_year, logo_path, sport)";

export async function listCampaigns(
  supabase: SupabaseClient,
  statuses: CampaignStatus[],
  limit = 60,
): Promise<CampaignWithClub[]> {
  const { data } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_WITH_CLUB)
    .in("status", statuses)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as CampaignWithClub[];
}

/** Référentiel des prix : articles actifs (pour l'éditeur) ou tous (équipe Tribune). */
export async function listPriceReferences(supabase: SupabaseClient, all = false): Promise<PriceReference[]> {
  let query = supabase.from("price_references").select("*").order("category").order("label");
  if (!all) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as PriceReference[];
}

export { STATUS_LABELS } from "@/lib/labels";

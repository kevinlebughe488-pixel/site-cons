import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CampaignStatus, CampaignWithClub } from "@/lib/types";

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

export { STATUS_LABELS } from "@/lib/labels";

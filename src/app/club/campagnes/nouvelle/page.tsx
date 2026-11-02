import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayInKinshasa } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { CAMPAIGN_LIMITS } from "@/lib/types";
import { CampaignEditor } from "../CampaignEditor";
import { FeesNotice } from "../FeesNotice";

export const metadata: Metadata = { title: "Nouvelle campagne" };

export default async function NewCampaignPage() {
  const viewer = await requirePermission("club:manage", "/club/campagnes/nouvelle");
  if (!viewer.club || viewer.club.status !== "verified") redirect("/club");
  const settings = await getSettings(await createClient());

  return (
    <div className="wrap page" style={{ maxWidth: 900 }}>
      <div className="crumbs muted">
        <Link href="/club">← Espace club</Link>
      </div>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", margin: "10px 0 20px" }}>Nouvelle campagne · {viewer.club.name}</h1>
      <FeesNotice publicationFee={settings.publication_fee} />
      <p className="flash info">Après le premier enregistrement, vous pourrez ajouter une photo du projet.</p>
      <CampaignEditor
        publicationFee={settings.publication_fee}
        today={todayInKinshasa()}
        initial={{
          title: "",
          category: "Infrastructure",
          summary: "",
          description: "",
          goal: "",
          duration_days: String(CAMPAIGN_LIMITS.defaultDuration),
          min_contribution: "5",
          max_contribution: "",
          budget: [],
          milestones: [],
        }}
      />
    </div>
  );
}

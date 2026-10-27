import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { todayInKinshasa } from "@/lib/format";
import { CampaignEditor } from "../CampaignEditor";

export const metadata: Metadata = { title: "Nouvelle campagne" };

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function NewCampaignPage() {
  const viewer = await requirePermission("club:manage", "/club/campagnes/nouvelle");
  if (!viewer.club || viewer.club.status !== "verified") redirect("/club");
  const today = todayInKinshasa();

  return (
    <div className="wrap page" style={{ maxWidth: 900 }}>
      <div className="crumbs muted">
        <Link href="/club">← Espace club</Link>
      </div>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", margin: "10px 0 20px" }}>Nouvelle campagne · {viewer.club.name}</h1>
      <CampaignEditor
        minDate={addDays(today, 14)}
        maxDate={addDays(today, 70)}
        initial={{
          title: "",
          category: "Infrastructure",
          summary: "",
          description: "",
          goal: "",
          end_date: addDays(today, 42),
          budget: [],
          milestones: [],
        }}
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGN_WITH_CLUB } from "@/lib/campaigns";
import { STATUS_LABELS } from "@/lib/labels";
import { CampaignPill, Pill } from "@/components/visuals";
import { LEVEL_LABELS, LEVEL_TONES } from "@/lib/compliance";
import { formatDate, formatMoney, percent } from "@/lib/format";
import type { CampaignStatus, CampaignWithClub } from "@/lib/types";

export const metadata: Metadata = { title: "Campagnes · Back-office" };

const TABS: CampaignStatus[] = ["in_review", "published", "suspended", "changes_requested", "draft", "funded", "failed", "rejected"];

export default async function AdminCampaignsPage(props: PageProps<"/admin/campagnes">) {
  await requirePermission("backoffice:access", "/admin/campagnes");
  const { statut } = await props.searchParams;
  const status = (TABS as string[]).includes(String(statut)) ? (statut as CampaignStatus) : "in_review";

  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(CAMPAIGN_WITH_CLUB)
    .eq("status", status)
    .order(status === "in_review" ? "submitted_at" : "created_at", { ascending: status === "in_review" })
    .limit(200);
  const list = (data ?? []) as CampaignWithClub[];

  return (
    <>
      <h2>Campagnes</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Aucune campagne n&apos;est publiée sans vérification du club, du budget et des jalons. Chaque décision est
        journalisée.
      </p>
      <nav className="tabs" aria-label="Filtrer par statut">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/campagnes?statut=${t}`} aria-current={t === status ? "page" : undefined}>
            {STATUS_LABELS[t]}
          </Link>
        ))}
      </nav>
      {list.length ? (
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Campagne</th>
                <th>Club</th>
                <th>Statut</th>
                <th className="r">Objectif</th>
                <th className="r">Collecté</th>
                <th>{status === "in_review" ? "Reçue le" : "Clôture"}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/campagnes/${c.id}`}>{c.title}</Link>
                  </td>
                  <td className="small">{c.club.name}</td>
                  <td>
                    <CampaignPill status={c.status} />
                    {c.compliance_level && ["draft", "changes_requested", "in_review"].includes(c.status) ? (
                      <div style={{ marginTop: 4 }}>
                        <Pill tone={LEVEL_TONES[c.compliance_level]}>Contrôle : {LEVEL_LABELS[c.compliance_level].toLowerCase()}</Pill>
                      </div>
                    ) : null}
                  </td>
                  <td className="r num">{formatMoney(c.goal_amount, c.currency)}</td>
                  <td className="r num">
                    {formatMoney(c.raised_amount, c.currency)} · {percent(c.raised_amount, c.goal_amount)} %
                  </td>
                  <td className="small num">{formatDate(status === "in_review" ? c.submitted_at : c.end_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel empty">
          <p className="muted">Aucune campagne avec le statut « {STATUS_LABELS[status]} ».</p>
        </div>
      )}
    </>
  );
}

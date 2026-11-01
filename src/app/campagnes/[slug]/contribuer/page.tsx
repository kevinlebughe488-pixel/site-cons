import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysLeft, formatMoney } from "@/lib/format";
import { paymentMode } from "@/lib/payments";
import { ContributeForm } from "./ContributeForm";

export const metadata: Metadata = { title: "Contribuer" };

export default async function ContributePage(props: PageProps<"/campagnes/[slug]/contribuer">) {
  const { slug } = await props.params;
  const { profile } = await requirePermission("contribution:create", `/campagnes/${slug}/contribuer`);

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, title, status, end_date, currency, min_contribution, max_contribution, club:clubs!inner(name)")
    .eq("slug", slug)
    .maybeSingle<{
      id: string;
      slug: string;
      title: string;
      status: string;
      end_date: string;
      currency: "USD" | "CDF";
      min_contribution: number;
      max_contribution: number | null;
      club: { name: string };
    }>();
  if (!campaign) notFound();

  const head = (
    <>
      <div className="crumbs muted">
        <Link href={`/campagnes/${campaign.slug}`}>← Retour à la campagne</Link>
      </div>
      <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", margin: "10px 0 6px" }}>Contribuer</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        {campaign.club.name} · {campaign.title}
      </p>
    </>
  );

  if (campaign.status !== "published" || daysLeft(campaign.end_date) <= 0) {
    return (
      <div className="wrap page" style={{ maxWidth: 1000 }}>
        {head}
        <div className="panel empty">
          <p>
            <b>Cette campagne n&apos;accepte plus de contributions.</b>
          </p>
        </div>
      </div>
    );
  }

  let simulation: boolean;
  try {
    simulation = paymentMode() === "simulation";
  } catch {
    return (
      <div className="wrap page" style={{ maxWidth: 1000 }}>
        {head}
        <div className="panel empty">
          <p>
            <b>Les paiements ne sont pas encore configurés sur ce site.</b>
          </p>
          <p className="small muted">
            L&apos;administrateur doit renseigner PAWAPAY_API_TOKEN, ou ALLOW_SIMULATED_PAYMENTS=true pour une démonstration.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: history } = await admin
    .from("contributions")
    .select("amount, campaign_id, status")
    .eq("user_id", profile.id)
    .in("status", ["initiated", "pending", "completed", "refund_pending"]);
  const rows = (history ?? []) as { amount: number; campaign_id: string; status: string }[];
  const cumulative = rows.filter((r) => r.status !== "refund_pending").reduce((sum, row) => sum + Number(row.amount), 0);
  // Déjà versé à cette campagne : sert au plafond par supporter.
  const onCampaign = rows.filter((r) => r.campaign_id === campaign.id).reduce((sum, row) => sum + Number(row.amount), 0);
  const remaining = campaign.max_contribution === null ? null : Math.max(0, Number(campaign.max_contribution) - onCampaign);
  if (remaining !== null && remaining < Number(campaign.min_contribution)) {
    return (
      <div className="wrap page" style={{ maxWidth: 1000 }}>
        {head}
        <div className="panel empty">
          <p>
            <b>Vous avez atteint le maximum par supporter pour cette campagne.</b>
          </p>
          <p className="small muted" style={{ marginTop: 6 }}>
            Le club a fixé un plafond de {formatMoney(campaign.max_contribution ?? 0, campaign.currency)} par supporter, pour une collecte
            partagée par le plus grand nombre. Merci pour votre soutien : vous pouvez encore faire connaître la campagne.
          </p>
          <Link className="btn btn-ghost btn-sm" style={{ marginTop: 14 }} href={`/campagnes/${campaign.slug}`}>
            Retour à la campagne
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap page" style={{ maxWidth: 1000 }}>
      {head}
      <div className="stepper">
        <span className="done">1 · Compte ✓</span>
        <span className="on">2 · Montant et paiement</span>
        <span>3 · Validation sur le téléphone</span>
        <span>4 · Reçu</span>
      </div>
      <ContributeForm
        campaignSlug={campaign.slug}
        currency={campaign.currency}
        defaultPhone={profile.phone?.startsWith("243") ? `0${profile.phone.slice(3)}` : ""}
        cumulative={cumulative}
        kycStatus={profile.kyc_status}
        simulation={simulation}
        minAmount={Number(campaign.min_contribution)}
        remaining={remaining}
        alreadyGiven={onCampaign}
      />
    </div>
  );
}

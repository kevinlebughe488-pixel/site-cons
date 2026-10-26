import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { daysLeft } from "@/lib/format";
import { paymentMode } from "@/lib/payments";
import { ContributeForm } from "./ContributeForm";

export const metadata: Metadata = { title: "Contribuer" };

export default async function ContributePage(props: PageProps<"/campagnes/[slug]/contribuer">) {
  const { slug } = await props.params;
  const { profile } = await requirePermission("contribution:create", `/campagnes/${slug}/contribuer`);

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, title, status, end_date, currency, club:clubs!inner(name)")
    .eq("slug", slug)
    .maybeSingle<{ id: string; slug: string; title: string; status: string; end_date: string; currency: "USD" | "CDF"; club: { name: string } }>();
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

  const admin = createAdminClient();
  const { data: history } = await admin
    .from("contributions")
    .select("amount")
    .eq("user_id", profile.id)
    .in("status", ["initiated", "pending", "completed"]);
  const cumulative = (history ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0);

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
        simulation={paymentMode() === "simulation"}
      />
    </div>
  );
}

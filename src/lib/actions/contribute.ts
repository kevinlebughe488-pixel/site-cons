"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { viewerWith } from "@/lib/auth";
import { checked, dbErrorMessage, keepFields, text, type FormState } from "@/lib/forms";
import { daysLeft, formatMoney, KYC_THRESHOLD } from "@/lib/format";
import { normalizeDrcPhone } from "@/lib/phone";
import { isKnownProvider } from "@/lib/payments/providers";
import { startContribution } from "@/lib/payments/service";

const MAX_AMOUNT = 5000;
const MAX_OPEN_PAYMENTS = 3;

export async function contribute(_: FormState, form: FormData): Promise<FormState> {
  const fields = keepFields(form, ["amount", "provider", "phone", "doc_type", "doc_number"]);
  const viewer = await viewerWith("contribution:create");
  if ("error" in viewer) return { error: viewer.error, fields };
  const { profile } = viewer;

  const supabase = await createClient();
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, slug, status, end_date, currency, club:clubs!inner(short_name)")
    .eq("slug", text(form, "campaign"))
    .maybeSingle<{ id: string; slug: string; status: string; end_date: string; currency: "USD" | "CDF"; club: { short_name: string } }>();
  if (!campaign || campaign.status !== "published" || daysLeft(campaign.end_date) <= 0) {
    return { error: "Cette campagne n'accepte plus de contributions.", fields };
  }

  const amount = Number(fields.amount.replace(",", "."));
  if (!Number.isInteger(amount) || amount < 1) return { error: "Indiquez un montant entier d'au moins 1 $.", fields };
  if (amount > MAX_AMOUNT) {
    return { error: `Le montant maximum par contribution est de ${formatMoney(MAX_AMOUNT)}.`, fields };
  }
  if (!isKnownProvider(fields.provider)) return { error: "Choisissez votre opérateur Mobile Money.", fields };
  const phone = normalizeDrcPhone(fields.phone);
  if (!phone) {
    return { error: "Indiquez un numéro Mobile Money congolais valide, par exemple 081 234 5678.", fields };
  }
  if (!checked(form, "rules")) return { error: "Cochez la case pour accepter les règles de la campagne.", fields };

  const admin = createAdminClient();
  const [{ count: openPayments }, { data: history }] = await Promise.all([
    admin
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", profile.id)
      .in("status", ["initiated", "pending"])
      .gt("created_at", new Date(Date.now() - 15 * 60_000).toISOString()),
    admin.from("contributions").select("amount").eq("user_id", profile.id).in("status", ["initiated", "pending", "completed"]),
  ]);
  if ((openPayments ?? 0) >= MAX_OPEN_PAYMENTS) {
    return { error: "Vous avez déjà plusieurs paiements en attente. Validez-les sur votre téléphone ou attendez quelques minutes.", fields };
  }

  // Vigilance : au-delà du seuil cumulé, une pièce d'identité doit être déclarée.
  const cumulative = (history ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0);
  if (cumulative + amount > KYC_THRESHOLD) {
    if (profile.kyc_status === "rejected") {
      return { error: "Votre pièce d'identité a été refusée. Contactez l'équipe Tribune avant de contribuer à nouveau.", fields };
    }
    if (profile.kyc_status === "none") {
      const docNumber = fields.doc_number.replace(/\s/g, "");
      if (!["carte_electeur", "passeport", "permis"].includes(fields.doc_type) || docNumber.length < 4) {
        return { error: `Votre cumul dépasse ${formatMoney(KYC_THRESHOLD)} : indiquez le type et le numéro de votre pièce d'identité.`, fields };
      }
      const { error } = await supabase.rpc("declare_identity", {
        p_doc_type: fields.doc_type,
        p_doc_last4: docNumber.slice(-4),
      });
      if (error) return { error: dbErrorMessage(error), fields };
    }
  }

  let contributionId: string;
  try {
    contributionId = await startContribution({
      userId: profile.id,
      campaign: { id: campaign.id, slug: campaign.slug, currency: campaign.currency, clubShortName: campaign.club.short_name },
      amount,
      phone,
      provider: fields.provider,
      anonymous: checked(form, "anonymous"),
    });
  } catch {
    return { error: "Le paiement n'a pas pu être lancé. Réessayez dans un instant.", fields };
  }
  redirect(`/contributions/${contributionId}`);
}

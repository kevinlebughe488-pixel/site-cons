import { NextResponse, type NextRequest } from "next/server";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { contributionRef } from "@/lib/payments/service";
import { providerLabel } from "@/lib/payments/providers";

// Export CSV des transactions (séparateur « ; », lisible directement par Excel en français).
export async function GET(request: NextRequest) {
  const viewer = await getViewer();
  if (!viewer || !can(viewer.profile.role, "transaction:export")) {
    return NextResponse.json({ error: "accès refusé" }, { status: 403 });
  }
  const status = request.nextUrl.searchParams.get("statut");
  const campaign = request.nextUrl.searchParams.get("campagne");

  const supabase = await createClient();
  let query = supabase
    .from("contributions")
    .select("*, campaign:campaigns(title, club:clubs(name)), profile:profiles(first_name, last_name, email, phone)")
    .order("created_at", { ascending: false })
    .limit(10000);
  if (status) query = query.eq("status", status);
  if (campaign && /^[0-9a-f-]{36}$/.test(campaign)) query = query.eq("campaign_id", campaign);
  const { data } = await query;

  const cols = [
    "Référence", "Date", "Statut", "Supporter", "E-mail", "Téléphone du compte", "Campagne", "Club",
    "Montant", "Devise", "Commission 5 %", "Net club", "Opérateur", "Numéro débité", "Référence opérateur",
    "Passerelle", "Anonyme", "Motif d'échec",
  ];
  const q = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  type Row = {
    id: string; created_at: string; status: string; amount: number; currency: string; commission: number; net_amount: number;
    mmo_provider: string; payer_phone: string; provider_transaction_id: string | null; payment_provider: string; anonymous: boolean;
    failure_message: string | null; failure_code: string | null;
    campaign: { title: string; club: { name: string } | null } | null;
    profile: { first_name: string; last_name: string; email: string | null; phone: string | null } | null;
  };
  const lines = ((data ?? []) as Row[]).map((r) =>
    [
      contributionRef(r.id), r.created_at, r.status,
      r.profile ? `${r.profile.first_name} ${r.profile.last_name}` : "", r.profile?.email, r.profile?.phone,
      r.campaign?.title, r.campaign?.club?.name,
      r.amount, r.currency, r.commission, r.net_amount, providerLabel(r.mmo_provider), r.payer_phone,
      r.provider_transaction_id, r.payment_provider, r.anonymous ? "oui" : "non", r.failure_message ?? r.failure_code,
    ].map(q).join(";"),
  );
  const csv = "\uFEFF" + [cols.join(";"), ...lines].join("\r\n");
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tribune-transactions-${day}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

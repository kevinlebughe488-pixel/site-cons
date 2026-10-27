import { NextResponse } from "next/server";
import { recordPaymentEvent, syncRefund } from "@/lib/payments/service";

// Notification pawaPay : état final d'un remboursement.
// À déclarer dans le tableau de bord pawaPay : https://<votre-site>/api/pawapay/refunds
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const refundId = typeof payload?.refundId === "string" ? payload.refundId : null;
  await recordPaymentEvent("pawapay", "refund.callback", refundId, payload);
  if (!refundId || !/^[0-9a-f-]{36}$/.test(refundId)) {
    return NextResponse.json({ error: "refundId manquant" }, { status: 400 });
  }
  try {
    await syncRefund(refundId);
  } catch {
    return NextResponse.json({ error: "vérification impossible" }, { status: 503 });
  }
  return NextResponse.json({ received: true });
}

import { NextResponse } from "next/server";
import { recordPaymentEvent, syncContribution } from "@/lib/payments/service";

// Notification pawaPay : état final d'un dépôt.
// À déclarer dans le tableau de bord pawaPay : https://<votre-site>/api/pawapay/deposits
// Le contenu reçu est enregistré tel quel, mais n'est pas cru : l'état est
// redemandé à pawaPay avant toute mise à jour.
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  const depositId = typeof payload?.depositId === "string" ? payload.depositId : null;
  await recordPaymentEvent("pawapay", "deposit.callback", depositId, payload);
  if (!depositId || !/^[0-9a-f-]{36}$/.test(depositId)) {
    return NextResponse.json({ error: "depositId manquant" }, { status: 400 });
  }
  try {
    await syncContribution(depositId);
  } catch {
    // pawaPay renverra la notification ; la page de suivi revérifie aussi l'état.
    return NextResponse.json({ error: "vérification impossible" }, { status: 503 });
  }
  return NextResponse.json({ received: true });
}

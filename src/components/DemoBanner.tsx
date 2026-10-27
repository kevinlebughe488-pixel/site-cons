import { paymentMode } from "@/lib/payments";
import { smsMode } from "@/lib/sms";

/** Prévient les visiteurs quand le site tourne en mode simulation (aucun paiement réel). */
export function DemoBanner() {
  let simulation = true;
  try {
    simulation = paymentMode() === "simulation";
  } catch {
    simulation = true;
  }
  let smsSimulated = true;
  try {
    smsSimulated = smsMode() === "simulation";
  } catch {
    smsSimulated = true;
  }
  if (!simulation && !smsSimulated) return null;
  return (
    <div className="demo" role="note">
      <div className="wrap">
        <b>Site de démonstration</b> —{" "}
        {simulation ? "les paiements sont simulés, aucun argent réel ne circule. " : ""}
        {smsSimulated ? "Aucun SMS n'est envoyé : les codes de connexion s'affichent à l'écran. " : ""}
        Les campagnes affichées servent à tester la plateforme.
      </div>
    </div>
  );
}

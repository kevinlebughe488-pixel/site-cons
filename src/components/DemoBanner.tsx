import { paymentMode } from "@/lib/payments";

/** Prévient les visiteurs quand le site tourne en mode simulation (aucun paiement réel). */
export function DemoBanner() {
  let simulation = true;
  try {
    simulation = paymentMode() === "simulation";
  } catch {
    simulation = true;
  }
  if (!simulation) return null;
  return (
    <div className="demo" role="note">
      <div className="wrap">
        <b>Site de démonstration</b> — les paiements sont simulés, aucun argent réel ne circule. Les campagnes affichées
        servent à tester la plateforme.
      </div>
    </div>
  );
}

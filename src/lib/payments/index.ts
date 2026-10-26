import "server-only";
import { PawapayGateway } from "@/lib/payments/pawapay";
import { SimulationGateway } from "@/lib/payments/simulation";
import type { PaymentGateway } from "@/lib/payments/types";
import type { PaymentProviderName } from "@/lib/types";

export type PaymentMode = "pawapay-sandbox" | "pawapay-production" | "simulation";

/** Mode de paiement actif, d'après les variables d'environnement. */
export function paymentMode(): PaymentMode {
  const provider = process.env.PAYMENT_PROVIDER ?? (process.env.PAWAPAY_API_TOKEN ? "pawapay" : "simulation");
  if (provider === "pawapay") {
    return process.env.PAWAPAY_ENVIRONMENT === "production" ? "pawapay-production" : "pawapay-sandbox";
  }
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_SIMULATED_PAYMENTS !== "true") {
    throw new Error(
      "Paiements simulés désactivés en production. Configurez PAWAPAY_API_TOKEN, ou ALLOW_SIMULATED_PAYMENTS=true pour une démo.",
    );
  }
  return "simulation";
}

/** Passerelle utilisée pour les nouvelles contributions. */
export function activeGateway(): PaymentGateway {
  return gatewayFor(paymentMode() === "simulation" ? "simulation" : "pawapay");
}

/** Passerelle qui a traité une contribution existante. */
export function gatewayFor(provider: PaymentProviderName): PaymentGateway {
  if (provider === "simulation") return new SimulationGateway();
  const apiToken = process.env.PAWAPAY_API_TOKEN;
  if (!apiToken) throw new Error("PAWAPAY_API_TOKEN manquant.");
  return new PawapayGateway({
    apiToken,
    environment: process.env.PAWAPAY_ENVIRONMENT === "production" ? "production" : "sandbox",
    baseUrl: process.env.PAWAPAY_BASE_URL,
  });
}

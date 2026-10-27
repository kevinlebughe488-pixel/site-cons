import "server-only";

// Envoi des SMS (codes de vérification).
//
// Sans configuration, le site tourne en mode simulation : aucun SMS n'est
// envoyé et le code s'affiche à l'écran (démonstration uniquement). Pour
// envoyer de vrais SMS, renseignez les variables TWILIO_* (voir .env.example).

export type SmsMode = "twilio" | "simulation";

export function smsMode(): SmsMode {
  const provider = process.env.SMS_PROVIDER ?? (process.env.TWILIO_ACCOUNT_SID ? "twilio" : "simulation");
  if (provider === "twilio") return "twilio";
  // Un site déclaré en démo (paiements simulés autorisés) accepte aussi les SMS simulés.
  const demo = process.env.ALLOW_SIMULATED_SMS === "true" || process.env.ALLOW_SIMULATED_PAYMENTS === "true";
  if (process.env.NODE_ENV === "production" && !demo) {
    throw new Error("SMS simulés désactivés en production. Configurez TWILIO_*, ou ALLOW_SIMULATED_SMS=true pour une démo.");
  }
  return "simulation";
}

/** Envoie un SMS au numéro donné (format international sans « + », ex. 243812345678). */
export async function sendSms(to: string, body: string): Promise<void> {
  if (smsMode() === "simulation") return;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  const service = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !(from || service)) {
    throw new Error("Configuration Twilio incomplète : TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN et TWILIO_FROM (ou TWILIO_MESSAGING_SERVICE_SID).");
  }

  const params = new URLSearchParams({ To: `+${to}`, Body: body });
  if (service) params.set("MessagingServiceSid", service);
  else params.set("From", from!);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
    cache: "no-store",
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string; code?: number } | null;
    throw new Error(`Twilio a refusé l'envoi (${res.status}${detail?.code ? `, code ${detail.code}` : ""}) : ${detail?.message ?? "erreur inconnue"}`);
  }
}

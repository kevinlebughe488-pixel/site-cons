import "server-only";
import { resolve4, resolveMx } from "node:dns/promises";

const NOT_FOUND = new Set(["ENOTFOUND", "ENODATA", "ENOTIMP", "NXDOMAIN"]);

// Le DNS du serveur répond-il ? Contrôlé sur un domaine qui existe forcément,
// seulement quand un domaine est introuvable (cas rare : faute de frappe), pour
// ne pas refuser toutes les adresses si la résolution est en panne.
async function dnsWorks(): Promise<boolean> {
  try {
    return (await resolveMx("gmail.com")).length > 0;
  } catch {
    return false;
  }
}

/**
 * L'adresse e-mail peut-elle recevoir du courrier ? Vérifie que son domaine existe
 * et accepte les e-mails (enregistrement MX, ou à défaut une adresse). En cas de
 * panne ou de lenteur du DNS, l'adresse est acceptée : on ne bloque pas une
 * inscription pour une raison technique.
 */
export async function emailDomainExists(email: string): Promise<boolean> {
  const domain = email.split("@").pop()?.trim().toLowerCase();
  if (!domain || !domain.includes(".")) return false;
  const lookup = async () => {
    try {
      const mx = await resolveMx(domain);
      if (mx.some((r) => r.exchange && r.exchange !== ".")) return true;
    } catch (err) {
      if (!NOT_FOUND.has((err as NodeJS.ErrnoException).code ?? "")) return true;
    }
    try {
      return (await resolve4(domain)).length > 0;
    } catch (err) {
      return !NOT_FOUND.has((err as NodeJS.ErrnoException).code ?? "");
    }
  };
  const timeout = new Promise<boolean>((resolve) => setTimeout(() => resolve(true), 3000));
  const exists = await Promise.race([lookup(), timeout]);
  return exists || !(await Promise.race([dnsWorks(), timeout.then(() => false)]));
}

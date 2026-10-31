const TZ = "Africa/Kinshasa";

/**
 * Sépare les milliers par une espace fine insécable, à la française.
 * Fait à la main plutôt qu'avec toLocaleString : le résultat est ainsi identique
 * sur le serveur et dans tous les navigateurs (certains téléphones n'ont pas les
 * données de langue françaises), ce qui évite les erreurs d'affichage à l'hydratation.
 */
export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "0";
  const [int, frac] = Math.abs(value).toFixed(decimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${value < 0 ? "-" : ""}${grouped}${frac ? `,${frac}` : ""}`;
}

export function formatMoney(amount: number | string, currency: string = "USD"): string {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const number = formatNumber(value, Number.isInteger(value) ? 0 : 2);
  return currency === "CDF" ? `${number} FC` : `${number} $`;
}

export function percent(raised: number | string, goal: number | string): number {
  const g = Number(goal);
  if (!g) return 0;
  return Math.min(100, Math.round((Number(raised) / g) * 100));
}

export function formatDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const date = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  const day = date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
  if (!withTime) return day;
  const time = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${day} · ${time}`;
}

/** Jours restants jusqu'à la date de clôture incluse (0 si dépassée). */
export function daysLeft(endDate: string): number {
  const end = new Date(`${endDate}T23:59:59+01:00`).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

export function todayInKinshasa(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: TZ });
}

export function slugify(text: string, max = 70): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (slug.length <= max) return slug || "campagne";
  // Coupe à la fin d'un mot plutôt qu'au milieu.
  const cut = slug.slice(0, max + 1);
  return cut.slice(0, cut.lastIndexOf("-") > 20 ? cut.lastIndexOf("-") : max);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const COMMISSION_RATE = 0.05;
/** Au-delà de ce cumul (en USD), le supporter doit déclarer une pièce d'identité. */
export const KYC_THRESHOLD = 1000;

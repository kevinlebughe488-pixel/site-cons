// Hypothèses du plan d'affaires de Plumes Capital (12/12/2025) pour la plateforme
// de financement participatif (§ 11.2). Elles servent de repères au back-office :
// le tableau de bord compare l'activité réelle à ces objectifs, année par année.
// Le crédit interentreprises (P2P, année 2) et la tokenisation (année 3) ne sont
// pas encore ouverts sur Tribune.

export type PlanYear = {
  year: 1 | 2 | 3;
  /** Campagnes publiées dans l'année. */
  published: number;
  /** Part des collectes clôturées qui atteignent leur objectif. */
  successRate: number;
  /** Montant moyen collecté par campagne financée (USD). */
  averageRaised: number;
  /** Montants collectés par les campagnes financées (USD). */
  raised: number;
  /** Commissions de 5 % sur les montants collectés (USD). */
  commissions: number;
  /** Frais d'instruction et de publication par campagne publiée (USD). */
  publicationFee: number;
  /** Frais d'instruction et de publication facturés dans l'année (USD). */
  fees: number;
  /** Chiffre d'affaires du financement participatif (USD). */
  revenue: number;
};

export const PLAN_YEARS: readonly PlanYear[] = [
  { year: 1, published: 30, successRate: 0.5, averageRaised: 20_000, raised: 300_000, commissions: 15_000, publicationFee: 400, fees: 12_000, revenue: 27_000 },
  { year: 2, published: 60, successRate: 0.6, averageRaised: 25_000, raised: 900_000, commissions: 45_000, publicationFee: 500, fees: 30_000, revenue: 75_000 },
  { year: 3, published: 90, successRate: 0.65, averageRaised: 30_000, raised: 1_770_000, commissions: 88_500, publicationFee: 500, fees: 45_000, revenue: 133_500 },
];

export type PlanPeriod = {
  target: PlanYear;
  from: Date;
  to: Date;
  /** Faux si la date de lancement n'est pas renseignée ou pas encore atteinte : on compte alors depuis le début. */
  dated: boolean;
  /** Vrai si l'on a dépassé l'horizon de trois ans du plan. */
  beyond: boolean;
};

function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return d;
}

/** Année du plan en cours, d'après la date de lancement (AAAA-MM-JJ). */
export function currentPlanPeriod(launchDate: string | null, now = new Date()): PlanPeriod {
  const launch = launchDate ? new Date(`${launchDate}T00:00:00+01:00`) : null;
  if (!launch || launch > now) {
    return { target: PLAN_YEARS[0], from: new Date("2000-01-01T00:00:00Z"), to: new Date("2100-01-01T00:00:00Z"), dated: false, beyond: false };
  }
  let index = 0;
  while (index < PLAN_YEARS.length - 1 && addYears(launch, index + 1) <= now) index++;
  const from = addYears(launch, index);
  return { target: PLAN_YEARS[index], from, to: addYears(launch, index + 1), dated: true, beyond: addYears(launch, PLAN_YEARS.length) <= now };
}

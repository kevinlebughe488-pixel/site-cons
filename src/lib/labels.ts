import type { CampaignStatus, ClubStatus, ContributionStatus, KycStatus } from "@/lib/types";

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: "Brouillon",
  in_review: "En revue",
  changes_requested: "À corriger",
  rejected: "Refusée",
  published: "En cours",
  suspended: "Suspendue",
  funded: "Financée",
  failed: "Non financée",
};

export const CLUB_STATUS_LABELS: Record<ClubStatus, string> = {
  draft: "Dossier en préparation",
  pending: "En cours de vérification",
  changes_requested: "Compléments demandés",
  verified: "Vérifié",
  rejected: "Refusé",
  suspended: "Suspendu",
};

/** Couleur de la pastille de statut d'un club. */
export const CLUB_STATUS_TONE: Record<ClubStatus, "ok" | "warn" | "bad" | "info" | "muted"> = {
  draft: "muted",
  pending: "info",
  changes_requested: "warn",
  verified: "ok",
  rejected: "bad",
  suspended: "bad",
};

export const CONTRIBUTION_STATUS_LABELS: Record<ContributionStatus, string> = {
  initiated: "Envoi en cours",
  pending: "En attente de confirmation",
  completed: "Confirmée",
  failed: "Échouée",
  refund_pending: "Remboursement en cours",
  refunded: "Remboursée",
};

export const KYC_LABELS: Record<KycStatus, string> = {
  none: "Niveau 1 · standard",
  pending: "Niveau 2 · à vérifier",
  verified: "Niveau 2 · vérifiée",
  rejected: "Pièce refusée",
};

export const PAYOUT_METHOD_LABELS = {
  mobile_money: "Mobile Money",
  bank: "Compte bancaire",
} as const;

export const DOC_TYPES: Record<string, string> = {
  carte_electeur: "Carte d'électeur",
  passeport: "Passeport",
  permis: "Permis de conduire",
};

/** État d'une nouvelle vue par le club : une publication retirée par l'équipe garde sa date de publication. */
export function updateStatusLabel(u: { status: "pending" | "published" | "rejected"; published_at: string | null }): {
  label: string;
  tone: "ok" | "info" | "bad";
} {
  if (u.status === "published") return { label: "Publiée", tone: "ok" };
  if (u.status === "pending") return { label: "En relecture", tone: "info" };
  return { label: u.published_at ? "Retirée par Tribune" : "Refusée", tone: "bad" };
}

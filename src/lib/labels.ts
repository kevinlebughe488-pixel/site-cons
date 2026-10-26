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
  pending: "En attente de vérification",
  verified: "Vérifié",
  rejected: "Refusé",
  suspended: "Suspendu",
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

export const DOC_TYPES: Record<string, string> = {
  carte_electeur: "Carte d'électeur",
  passeport: "Passeport",
  permis: "Permis de conduire",
};

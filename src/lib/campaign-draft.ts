// Brouillon d'une campagne : étapes du parcours, contrôles de chaque étape avant
// « Suivant » et jalons proposés. Les contrôles reprennent ceux de l'action
// serveur (saveCampaign) et de la base à l'envoi en revue (submit_campaign) :
// le club voit les problèmes tout de suite, au lieu d'un refus à la fin.

import { CAMPAIGN_CATEGORIES, CAMPAIGN_LIMITS } from "@/lib/types";

export type BudgetLineDraft = { label: string; amount: string; quantity: string; reference_id: string; manual?: boolean };
export type MilestoneDraft = { label: string; target: string };

export type CampaignDraft = {
  title: string;
  category: string;
  summary: string;
  description: string;
  goal: string;
  duration_days: string;
  min_contribution: string;
  max_contribution: string;
  budget: BudgetLineDraft[];
  milestones: MilestoneDraft[];
};

export const DESCRIPTION_MIN = 80;

export const CAMPAIGN_STEPS = [
  { n: 1, label: "Le projet", title: "Le projet" },
  { n: 2, label: "Objectif", title: "L'objectif et la collecte" },
  { n: 3, label: "Budget", title: "Le budget détaillé" },
  { n: 4, label: "Jalons", title: "Les étapes du projet (jalons)" },
  { n: 5, label: "Photos et devis", title: "Les photos et les devis" },
  { n: 6, label: "Envoi", title: "Vérifier et envoyer en revue" },
] as const;

/** Étape (1 à 4) où se trouve un champ renvoyé en erreur par le serveur. */
export function stepOfCampaignField(field: string): 1 | 2 | 3 | 4 {
  if (["goal", "duration_days", "min_contribution", "max_contribution"].includes(field)) return 2;
  if (field === "budget") return 3;
  if (field === "milestones") return 4;
  return 1;
}

const isInt = (v: string) => /^\d+$/.test(v.trim());

/**
 * Contrôle d'une étape d'informations (1 à 4). `blockingLines` : nombre de postes
 * du budget à 3 fois le prix de référence ou plus (calculé par le formulaire).
 */
export function checkCampaignStep(
  step: 1 | 2 | 3 | 4,
  d: CampaignDraft,
  blockingLines = 0,
): { field: string; message: string } | null {
  if (step === 1) {
    if (d.title.trim().length < 5) return { field: "title", message: "Le titre doit faire au moins 5 caractères." };
    if (!(CAMPAIGN_CATEGORIES as readonly string[]).includes(d.category)) return { field: "category", message: "Choisissez un thème." };
    if (d.description.trim().length < DESCRIPTION_MIN) {
      return {
        field: "description",
        message: `La description doit faire au moins ${DESCRIPTION_MIN} caractères (${d.description.trim().length} pour l'instant) : le problème, ce que vous allez faire, qui en profite.`,
      };
    }
    return null;
  }
  if (step === 2) {
    const goal = Number(d.goal);
    if (!isInt(d.goal) || goal < 100 || goal > 1_000_000) return { field: "goal", message: "L'objectif doit être un montant entier entre 100 $ et 1 000 000 $." };
    const days = Number(d.duration_days);
    if (!isInt(d.duration_days) || days < CAMPAIGN_LIMITS.minDuration || days > CAMPAIGN_LIMITS.maxDuration) {
      return {
        field: "duration_days",
        message: `La durée de la collecte doit être comprise entre ${CAMPAIGN_LIMITS.minDuration} et ${CAMPAIGN_LIMITS.maxDuration} jours.`,
      };
    }
    const min = Number(d.min_contribution || "1");
    if (!isInt(d.min_contribution || "1") || min < 1 || min > CAMPAIGN_LIMITS.maxMinContribution) {
      return {
        field: "min_contribution",
        message: `La contribution minimum doit être un montant entier entre 1 $ et ${CAMPAIGN_LIMITS.maxMinContribution} $.`,
      };
    }
    if (min > goal) return { field: "min_contribution", message: "La contribution minimum ne peut pas dépasser l'objectif." };
    if (d.max_contribution.trim()) {
      const max = Number(d.max_contribution);
      if (!isInt(d.max_contribution) || max < min || max > goal) {
        return {
          field: "max_contribution",
          message: "Le maximum par supporter doit être un montant entier, au moins égal au minimum et au plus égal à l'objectif.",
        };
      }
    }
    return null;
  }
  if (step === 3) {
    const lines = d.budget.filter((l) => l.label.trim() || l.amount);
    if (!lines.length) return { field: "budget", message: "Ajoutez au moins un poste au budget : ce que vous allez acheter ou payer." };
    for (const [i, l] of lines.entries()) {
      if (l.label.trim().length < 2 || !(Number(l.amount) > 0) || !(Number(l.quantity || "1") > 0)) {
        return { field: "budget", message: `Le poste ${i + 1} doit avoir un libellé, une quantité et un montant positifs.` };
      }
    }
    const total = lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
    if (total !== Number(d.goal)) {
      return {
        field: "budget",
        message: `Le total du budget (${total} $) doit être égal à l'objectif (${Number(d.goal) || 0} $) : ajustez les postes ou l'objectif.`,
      };
    }
    if (blockingLines) {
      return {
        field: "budget",
        message: `${blockingLines > 1 ? `${blockingLines} postes dépassent` : "Un poste dépasse"} 3 fois le prix de référence : corrigez le montant ou la quantité.`,
      };
    }
    return null;
  }
  const milestones = d.milestones.filter((m) => m.label.trim());
  if (!milestones.length) return { field: "milestones", message: "Ajoutez au moins une étape (jalon) : comment le projet va se dérouler." };
  if (milestones.some((m) => m.label.trim().length < 2)) return { field: "milestones", message: "Chaque jalon doit avoir un libellé." };
  return null;
}

/** Jalons proposés selon le thème : un point de départ, que le club adapte. */
export const SUGGESTED_MILESTONES: Record<string, MilestoneDraft[]> = {
  Équipement: [
    { label: "Commande passée au fournisseur et acompte versé", target: "2 semaines après la collecte" },
    { label: "Équipements livrés au club (bon de livraison, photos)", target: "1 mois après la collecte" },
    { label: "Équipements utilisés en match ou à l'entraînement (photos)", target: "2 mois après la collecte" },
  ],
  Infrastructure: [
    { label: "Devis signé et travaux commandés", target: "2 semaines après la collecte" },
    { label: "Travaux à mi-parcours (photos du chantier)", target: "2 mois après la collecte" },
    { label: "Travaux terminés et réceptionnés (photos, facture)", target: "4 mois après la collecte" },
  ],
  "Formation des jeunes": [
    { label: "Formateurs et lieu réservés", target: "2 semaines après la collecte" },
    { label: "Première session tenue (photos, liste de présence)", target: "1 mois après la collecte" },
    { label: "Formation terminée (attestations, compte rendu)", target: "3 mois après la collecte" },
  ],
  Déplacement: [
    { label: "Transport et hébergement réservés", target: "1 semaine après la collecte" },
    { label: "Déplacement effectué (billets, photos)", target: "Date du déplacement" },
    { label: "Compte rendu du déplacement publié", target: "1 semaine après le retour" },
  ],
  Transport: [
    { label: "Véhicule ou prestataire réservé (contrat, acompte)", target: "2 semaines après la collecte" },
    { label: "Premiers trajets effectués (photos, reçus)", target: "1 mois après la collecte" },
    { label: "Bilan des trajets publié", target: "3 mois après la collecte" },
  ],
  Santé: [
    { label: "Matériel ou prestataire commandé", target: "2 semaines après la collecte" },
    { label: "Matériel livré ou prestation réalisée (photos, facture)", target: "1 mois après la collecte" },
    { label: "Compte rendu publié", target: "2 mois après la collecte" },
  ],
};

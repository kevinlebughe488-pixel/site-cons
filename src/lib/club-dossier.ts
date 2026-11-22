// Contenu attendu du dossier d'inscription d'un club, vu par l'équipe Tribune.
//
// Les conditions « obligatoires » sont exactement celles que la base vérifie
// avant l'envoi du dossier (submit_club_registration) et avant la vérification
// d'un dossier que le club n'a pas (re)envoyé (club_dossier_complete) :
// un document attestant l'existence du club, l'adresse du siège, le téléphone
// du représentant légal et le titulaire du compte de versement. Les autres
// champs obligatoires (nom, sigle, ville, date de création, fonction du
// représentant…) sont contrôlés dès l'enregistrement du dossier.

import { CLUB_DOCUMENT_KINDS, type Club, type ClubDocumentKind, type ClubPrivate } from "@/lib/types";

/** Pièces qui attestent l'existence du club : au moins une est exigée. */
export const PROOF_KINDS: readonly ClubDocumentKind[] = CLUB_DOCUMENT_KINDS.filter((k) => k.proof).map((k) => k.id);

/** Libellé court de chaque type de pièce. */
export const DOCUMENT_KIND_LABEL: Record<ClubDocumentKind, string> = Object.fromEntries(
  CLUB_DOCUMENT_KINDS.map((k) => [k.id, k.label]),
) as Record<ClubDocumentKind, string>;

/** Limites d'un document de dossier : les mêmes que l'envoi par le club et que le bucket « club-documents ». */
export const CLUB_DOCUMENT_MAX_BYTES = 4 * 1024 * 1024;
export const CLUB_DOCUMENT_MAX_COUNT = 20;

/** Statuts où le dossier est encore examiné (documents ajoutables, décision attendue). */
export const UNDER_REVIEW: readonly Club["status"][] = ["draft", "pending", "changes_requested"];

type PrivatePart = Pick<ClubPrivate, "address" | "rep_phone" | "payout_holder"> | null | undefined;

export type DossierItem = { id: string; label: string; ok: boolean };

/** La jointure club_private revient en objet (relation 1-1) ou, selon la version de l'API, en tableau. */
export function unwrapPrivate<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

/** Conditions obligatoires, dans l'ordre où l'équipe les contrôle. */
export function requiredItems(priv: PrivatePart, kinds: readonly string[]): DossierItem[] {
  return [
    {
      id: "existence",
      label: "Un document attestant l'existence du club (statuts, enregistrement officiel ou attestation d'affiliation)",
      ok: kinds.some((k) => (PROOF_KINDS as readonly string[]).includes(k)),
    },
    { id: "siege", label: "L'adresse du siège", ok: !!priv?.address },
    { id: "representant", label: "Le représentant légal et son téléphone", ok: !!priv?.rep_phone },
    { id: "compte", label: "Le compte de versement et son titulaire", ok: !!priv?.payout_holder },
  ];
}

/** Le dossier remplit-il les conditions d'envoi ? (même règle que la base) */
export function isDossierComplete(priv: PrivatePart, kinds: readonly string[]): boolean {
  return requiredItems(priv, kinds).every((i) => i.ok);
}

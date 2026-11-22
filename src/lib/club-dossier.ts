// Dossier d'inscription d'un club : champs, découpage en étapes et règles de
// validation. Partagé par le formulaire (contrôle de chaque étape avant
// « Suivant ») et par l'action serveur (contrôle complet avant l'enregistrement).
// La base applique les mêmes règles (normalize_club_dossier).

import { z } from "zod";
import { todayInKinshasa } from "@/lib/format";
import { normalizeAnyPhone, normalizeDrcPhone } from "@/lib/phone";
import { DRC_PROVIDERS, isKnownProvider } from "@/lib/payments/providers";
import { CLUB_DOCUMENT_KINDS, type Club, type ClubDocumentKind, type ClubPrivate } from "@/lib/types";

export type DossierValues = {
  name: string;
  short_name: string;
  sport: string;
  city: string;
  commune: string;
  address: string;
  founded_on: string;
  legal_id: string;
  rep_name: string;
  rep_title: string;
  rep_phone: string;
  rep_email: string;
  contact_phone: string;
  description: string;
  color_primary: string;
  color_secondary: string;
  payout_method: "mobile_money" | "bank";
  payout_holder: string;
  payout_phone: string;
  payout_provider: string;
  bank_name: string;
  bank_account: string;
};

export const DOSSIER_FIELDS: (keyof DossierValues)[] = [
  "name", "short_name", "sport", "city", "commune", "address", "founded_on", "legal_id",
  "rep_name", "rep_title", "rep_phone", "rep_email", "contact_phone", "description",
  "color_primary", "color_secondary", "payout_method", "payout_holder", "payout_phone",
  "payout_provider", "bank_name", "bank_account",
];

export const EMPTY_DOSSIER: DossierValues = {
  name: "", short_name: "", sport: "Football", city: "", commune: "", address: "", founded_on: "", legal_id: "",
  rep_name: "", rep_title: "", rep_phone: "", rep_email: "", contact_phone: "", description: "",
  color_primary: "#1d5237", color_secondary: "#ecd083", payout_method: "mobile_money", payout_holder: "",
  payout_phone: "", payout_provider: DRC_PROVIDERS[0].code, bank_name: "", bank_account: "",
};

/**
 * Les étapes du parcours d'inscription. Les trois premières sont des
 * informations (un seul formulaire, enregistré en passant à l'étape 4) ;
 * viennent ensuite les documents et le logo, puis la vérification et l'envoi.
 */
export const WIZARD_STEPS = [
  { n: 1, label: "Le club", title: "Le club" },
  { n: 2, label: "Représentant", title: "Le représentant légal" },
  { n: 3, label: "Versement", title: "Le compte de versement" },
  { n: 4, label: "Documents", title: "Les documents et le logo" },
  { n: 5, label: "Envoi", title: "Vérifier et envoyer" },
] as const;

/** Champs remplis à chacune des trois étapes d'informations. */
export const STEP_FIELDS: Record<1 | 2 | 3, (keyof DossierValues)[]> = {
  1: ["name", "short_name", "sport", "founded_on", "legal_id", "city", "commune", "address", "color_primary", "color_secondary", "description"],
  2: ["rep_name", "rep_title", "rep_phone", "rep_email", "contact_phone"],
  3: ["payout_method", "payout_holder", "payout_phone", "payout_provider", "bank_name", "bank_account"],
};

/** Étape (1 à 3) où se trouve un champ du dossier. */
export function stepOfField(field: string): 1 | 2 | 3 {
  if (STEP_FIELDS[2].includes(field as keyof DossierValues)) return 2;
  if (STEP_FIELDS[3].includes(field as keyof DossierValues)) return 3;
  return 1;
}

type Rule = { field: keyof DossierValues; check: (f: Record<string, string>) => string | null };

// Dans l'ordre du formulaire : la première erreur affichée est la plus haute de l'étape.
const RULES: Rule[] = [
  { field: "name", check: (f) => (f.name.length < 3 ? "Indiquez le nom officiel du club." : null) },
  { field: "short_name", check: (f) => (!/^[A-Z0-9]{2,4}$/.test(f.short_name.toUpperCase()) ? "Le sigle doit faire 2 à 4 lettres ou chiffres (ex. TPM)." : null) },
  { field: "sport", check: (f) => (f.sport.length < 2 || f.sport.length > 60 ? "Indiquez la discipline sportive du club." : null) },
  {
    field: "founded_on",
    check: (f) =>
      !/^\d{4}-\d{2}-\d{2}$/.test(f.founded_on) || f.founded_on < "1850-01-01" || f.founded_on > todayInKinshasa()
        ? "Indiquez la date de création du club (celle des statuts ou de la fondation)."
        : null,
  },
  { field: "legal_id", check: (f) => (f.legal_id.length > 80 ? "L'identifiant juridique est trop long (80 caractères au plus)." : null) },
  { field: "city", check: (f) => (f.city.length < 2 ? "Indiquez la ville du siège du club." : null) },
  { field: "address", check: (f) => (f.address.length < 5 ? "Indiquez l'adresse du siège (avenue, numéro, quartier)." : null) },
  { field: "description", check: (f) => (f.description.length > 4000 ? "La présentation est trop longue (4 000 caractères au plus)." : null) },
  { field: "rep_name", check: (f) => (f.rep_name.length < 3 ? "Indiquez le nom du représentant légal du club." : null) },
  { field: "rep_title", check: (f) => (f.rep_title.length < 2 ? "Indiquez la fonction du représentant légal (président, secrétaire général…)." : null) },
  { field: "rep_phone", check: (f) => (!normalizeAnyPhone(f.rep_phone) ? "Le téléphone du représentant légal n'est pas valide." : null) },
  { field: "rep_email", check: (f) => (f.rep_email && !z.email().safeParse(f.rep_email).success ? "L'e-mail du représentant légal n'est pas valide." : null) },
  { field: "contact_phone", check: (f) => (f.contact_phone && !normalizeAnyPhone(f.contact_phone) ? "Le téléphone du club n'est pas valide." : null) },
  { field: "payout_holder", check: (f) => (f.payout_holder.length < 3 ? "Indiquez le titulaire du compte de versement : le compte doit être au nom du club." : null) },
  { field: "bank_name", check: (f) => (f.payout_method === "bank" && f.bank_name.length < 2 ? "Indiquez le nom de la banque." : null) },
  {
    field: "bank_account",
    check: (f) => (f.payout_method === "bank" && !/^[A-Za-z0-9 .-]{5,60}$/.test(f.bank_account) ? "Le numéro de compte bancaire n'est pas valide." : null),
  },
  {
    field: "payout_phone",
    check: (f) =>
      f.payout_method !== "bank" && !normalizeDrcPhone(f.payout_phone) ? "Le numéro Mobile Money de versement doit être un numéro congolais valide." : null,
  },
  { field: "payout_provider", check: (f) => (f.payout_method !== "bank" && !isKnownProvider(f.payout_provider) ? "Choisissez l'opérateur du compte Mobile Money." : null) },
];

/**
 * Première erreur du dossier, avec le champ concerné ; `only` limite le
 * contrôle aux champs d'une étape. Les valeurs manquantes valent "".
 */
export function checkDossier(values: Record<string, string | undefined>, only?: readonly string[]): { field: string; message: string } | null {
  const f = Object.fromEntries(DOSSIER_FIELDS.map((k) => [k, (values[k] ?? "").trim()]));
  for (const rule of RULES) {
    if (only && !only.includes(rule.field)) continue;
    const message = rule.check(f);
    if (message) return { field: rule.field, message };
  }
  return null;
}

// ---------------------------------------------------------------------
// Contenu attendu du dossier, vu par l'équipe Tribune (back-office).
//
// Les conditions « obligatoires » sont exactement celles que la base vérifie
// avant l'envoi du dossier (submit_club_registration) et avant la vérification
// d'un dossier que le club n'a pas (re)envoyé (club_dossier_complete) :
// un document attestant l'existence du club, l'adresse du siège, le téléphone
// du représentant légal et le titulaire du compte de versement. Les autres
// champs obligatoires (nom, sigle, ville, date de création, fonction du
// représentant…) sont contrôlés dès l'enregistrement du dossier.
// ---------------------------------------------------------------------

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

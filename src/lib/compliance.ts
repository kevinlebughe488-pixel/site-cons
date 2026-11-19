// Contrôle des prix d'un budget de campagne, partagé par l'éditeur (aperçu en
// direct pour le club) et l'affichage du back-office. La règle qui fait foi est
// celle de la base (compute_campaign_compliance) : un poste choisi dans le
// référentiel, dont le prix est confirmé, bloque à 3 fois le prix normal ;
// à 1,5 fois il est signalé. Un rapprochement par mots-clés signale sans bloquer.

import type { ComplianceLevel, PriceReference } from "@/lib/types";

export const WARN_RATIO = 1.5;
export const BLOCK_RATIO = 3;

export type LineLevel = ComplianceLevel | "unknown";

/** Contrôle renvoyé par la base (campaign_compliance). */
export type ComplianceReport = {
  level: ComplianceLevel;
  checks: { id: string; label: string; level: ComplianceLevel; detail: string }[];
  lines: {
    position: number;
    label: string;
    amount: number;
    quantity: number;
    unit_price: number;
    reference_id: string | null;
    reference_label: string | null;
    reference_unit: string | null;
    reference_price: number | null;
    reference_confirmed: boolean | null;
    matched: "choisi" | "mots-cles" | null;
    ratio: number | null;
    level: LineLevel;
  }[];
  checked_at: string;
};

type RefLike = Pick<PriceReference, "id" | "label" | "unit" | "unit_price" | "keywords" | "confirmed_at">;

/** Même normalisation que la base (normalize_text) : minuscules, sans accents ni apostrophes. */
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/œ/g, "o")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Article du référentiel le plus précis dont un mot-clé apparaît dans le libellé. */
export function suggestReference<T extends RefLike>(label: string, refs: T[]): T | null {
  const text = normalizeText(label);
  if (!text) return null;
  let best: { ref: T; length: number } | null = null;
  for (const ref of refs) {
    for (const k of ref.keywords) {
      if (k && text.includes(k) && (!best || k.length > best.length || (k.length === best.length && ref.unit_price < best.ref.unit_price))) {
        best = { ref, length: k.length };
      }
    }
  }
  return best?.ref ?? null;
}

/** Niveau d'un poste : prix unitaire comparé au prix de référence. */
export function rateLine(
  unitPrice: number,
  ref: RefLike | null,
  chosen: boolean,
): { ratio: number | null; level: LineLevel } {
  if (!ref || !(unitPrice > 0)) return { ratio: null, level: "unknown" };
  const ratio = Math.round((unitPrice / Number(ref.unit_price)) * 100) / 100;
  if (ratio >= BLOCK_RATIO && chosen && ref.confirmed_at) return { ratio, level: "block" };
  if (ratio >= WARN_RATIO) return { ratio, level: "warn" };
  return { ratio, level: "ok" };
}

export function formatRatio(ratio: number): string {
  return ratio.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export const LEVEL_LABELS: Record<LineLevel, string> = {
  ok: "Conforme",
  warn: "À vérifier",
  block: "Bloquant",
  unknown: "Sans référence",
};

export const LEVEL_TONES: Record<LineLevel, "ok" | "warn" | "bad" | "muted"> = {
  ok: "ok",
  warn: "warn",
  block: "bad",
  unknown: "muted",
};

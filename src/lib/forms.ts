import type { PostgrestError } from "@supabase/supabase-js";

/** État renvoyé par les actions serveur aux formulaires. */
export type FormState = { error?: string; success?: string; fields?: Record<string, string> };

export const initialFormState: FormState = {};

export function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function checked(form: FormData, name: string): boolean {
  return form.get(name) === "on" || form.get(name) === "true";
}

/** Garde les valeurs saisies pour réafficher le formulaire après une erreur. */
export function keepFields(form: FormData, names: string[]): Record<string, string> {
  return Object.fromEntries(names.map((n) => [n, text(form, n)]));
}

/** Message lisible pour une erreur renvoyée par la base. */
export function dbErrorMessage(error: PostgrestError | null | undefined, fallback = "L'opération a échoué. Réessayez."): string {
  if (!error) return fallback;
  // Les fonctions de la base lèvent des messages déjà rédigés en français (code P0001).
  if (error.code === "P0001" || error.code === "42501") return error.message;
  if (error.code === "23505") return "Cette valeur est déjà utilisée.";
  if (error.code === "23514") return "Une des valeurs saisies n'est pas valide.";
  return fallback;
}

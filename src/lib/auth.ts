import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/rbac";
import type { Club, Profile } from "@/lib/types";

export type Viewer = {
  profile: Profile;
  /** Club géré par l'utilisateur (le premier s'il en gère plusieurs). */
  club: Club | null;
};

/** Utilisateur connecté et son profil, ou null. Mis en cache pour la durée de la requête. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  // Double authentification : le site n'ouvre de session qu'après le code SMS
  // (méthode « otp »). Une session ouverte avec le seul mot de passe, en appelant
  // Supabase directement, n'est pas acceptée.
  const methods = (claims.amr ?? []).map((m) => (typeof m === "string" ? m : m.method));
  if (!methods.length || methods.every((m) => m === "password")) return null;
  const user = { id: claims.sub };

  // Les deux lectures sont indépendantes : on les lance en même temps.
  const [{ data: profile }, { data: membership }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("club_members")
      .select("club:clubs(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle<{ club: Club | null }>(),
  ]);
  if (!profile) return null;

  return { profile, club: membership?.club ?? null };
});

/** Exige une connexion ; sinon renvoie vers la page de connexion puis revient ici. */
export async function requireViewer(returnTo: string): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/connexion?suite=${encodeURIComponent(returnTo)}`);
  return viewer;
}

/** Exige une permission ; sinon page « accès refusé ». */
export async function requirePermission(permission: Permission, returnTo: string): Promise<Viewer> {
  const viewer = await requireViewer(returnTo);
  if (!can(viewer.profile.role, permission)) redirect("/acces-refuse");
  return viewer;
}

/** Variante pour les actions serveur : renvoie un message plutôt qu'une redirection. */
export async function viewerWith(permission: Permission): Promise<Viewer | { error: string }> {
  const viewer = await getViewer();
  if (!viewer) return { error: "Votre session a expiré. Reconnectez-vous." };
  if (!can(viewer.profile.role, permission)) return { error: "Vous n'avez pas les droits pour cette action." };
  return viewer;
}

/** Ne garde que les chemins internes pour les redirections après connexion. */
export function safeReturnPath(value: unknown, fallback = "/compte"): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : fallback;
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  if (!profile) return null;

  const { data: membership } = await supabase
    .from("club_members")
    .select("club:clubs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ club: Club | null }>();

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

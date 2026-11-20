import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { can, type Permission } from "@/lib/rbac";
import type { Club, ClubStatus, Profile } from "@/lib/types";

export type Viewer = {
  profile: Profile;
  /** Club géré par l'utilisateur (ou dont il prépare l'inscription). */
  club: Club | null;
  /** Notifications non lues. */
  unread: number;
};

// Un compte dont la demande a été refusée peut inscrire un nouveau club : c'est
// alors celui-là qui compte, pas l'ancienne demande.
const CLUB_PRIORITY: ClubStatus[] = ["verified", "suspended", "changes_requested", "pending", "draft", "rejected"];

/** Utilisateur connecté et son profil, ou null. Mis en cache pour la durée de la requête. */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  // Le site ouvre lui-même les sessions (méthode « otp ») : après un bon mot de
  // passe d'un numéro confirmé, un code SMS ou un lien de connexion. Une session
  // ouverte avec le seul mot de passe, en appelant Supabase directement (sans la
  // confirmation du numéro faite par le site), n'est pas acceptée.
  const methods = (claims.amr ?? []).map((m) => (typeof m === "string" ? m : m.method));
  if (!methods.length || methods.every((m) => m === "password")) return null;
  const user = { id: claims.sub };

  // Les lectures sont indépendantes : on les lance en même temps.
  const [{ data: profile }, { data: memberships }, { count: unread }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("club_members")
      .select("club:clubs(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);
  if (!profile) return null;

  const clubs = ((memberships ?? []) as unknown as { club: Club | null }[])
    .map((m) => m.club)
    .filter((c): c is Club => !!c)
    .sort((a, b) => CLUB_PRIORITY.indexOf(a.status) - CLUB_PRIORITY.indexOf(b.status));

  return { profile, club: clubs[0] ?? null, unread: unread ?? 0 };
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

import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { FieldSvg, Pill } from "@/components/visuals";
import { CLUB_STATUS_LABELS, CLUB_STATUS_TONE } from "@/lib/labels";
import { ClubCrestMenu } from "./ClubCrestMenu";
import { ClubNav } from "./ClubNav";

/**
 * Espace d'un club vérifié (ou suspendu) : en-tête du club et rubriques communes à
 * toutes ses pages. Pendant l'inscription (dossier en préparation, envoyé…), la
 * page du dossier garde sa propre présentation.
 */
export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  const club = viewer?.club;
  const space = !!club && (club.status === "verified" || club.status === "suspended") && can(viewer?.profile.role, "club:manage");
  if (!space || !club) return children;
  return (
    <>
      {/* overflow visible (club-head) : le menu du logo dépasse de l'en-tête. */}
      <div className="page-head on-pitch club-head">
        <FieldSvg opacity={0.6} />
        <div className="wrap" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <ClubCrestMenu
            club={{
              id: club.id,
              name: club.name,
              slug: club.slug,
              short_name: club.short_name,
              color_primary: club.color_primary,
              color_secondary: club.color_secondary,
              logo_path: club.logo_path,
              status: club.status,
              statusLabel: CLUB_STATUS_LABELS[club.status],
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>
              Espace club
            </div>
            <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)", marginTop: 2 }}>{club.name}</h1>
          </div>
          <Pill tone={CLUB_STATUS_TONE[club.status]}>{CLUB_STATUS_LABELS[club.status]}</Pill>
        </div>
      </div>
      <ClubNav canCreate={club.status === "verified"} publicHref={club.status === "verified" ? `/clubs/${club.slug}` : null} />
      {children}
    </>
  );
}

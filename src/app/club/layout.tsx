import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { Crest, FieldSvg, Pill } from "@/components/visuals";
import { CLUB_STATUS_LABELS, CLUB_STATUS_TONE } from "@/lib/labels";
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
      <div className="page-head on-pitch club-head">
        <FieldSvg opacity={0.6} />
        <div className="wrap" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <Crest club={club} size={52} />
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

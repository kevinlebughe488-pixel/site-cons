import Link from "next/link";
import { updateClubInfo } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoEdit } from "@/components/LogoEdit";
import { Pill } from "@/components/visuals";
import { CLUB_STATUS_LABELS, CLUB_STATUS_TONE } from "@/lib/labels";
import { formatDate, plural } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import type { Club, ClubDocument, ClubPrivate } from "@/lib/types";
import { DocumentList, PayoutSummary } from "../parts";

const ICONS = {
  id: <path d="M4 5h16v14H4zM8 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0M6.5 16c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8M15 9h3M15 12h3" />,
  pin: <path d="M12 21s-6-5.4-6-10a6 6 0 1 1 12 0c0 4.6-6 10-6 10ZM12 13a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />,
  person: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20c.9-3.5 4-5.5 7.5-5.5s6.6 2 7.5 5.5" />,
  wallet: <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1V7Zm0 0 11-3v3M16 13.5h2" />,
  palette: <path d="M12 3a9 9 0 0 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-.9-.6-1.3-.6-2.2 0-1 .8-1.7 1.8-1.7H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3ZM7.5 11.5h.01M9.5 7.5h.01M14.5 7.5h.01" />,
  doc: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
};

function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <span className="ic-round" aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[name]}
      </svg>
    </span>
  );
}

/** Carte d'une catégorie d'informations, avec son icône. */
function InfoCard({
  icon,
  title,
  rows,
  note,
  wide,
  id,
  children,
}: {
  icon: keyof typeof ICONS;
  title: string;
  rows?: [string, React.ReactNode][];
  note?: string;
  wide?: boolean;
  id?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className={`info-card${wide ? " wide" : ""}`} id={id}>
      <h3>
        <Icon name={icon} /> {title}
      </h3>
      {rows ? (
        <dl className="info-rows">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value || <span className="muted">Non renseigné</span>}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      {children}
      {note ? <p className="small muted info-note">{note}</p> : null}
    </section>
  );
}

/** Profil du club : en-tête (logo modifiable), modification de la présentation, cartes par catégorie. */
export function ClubProfileView({ club, priv, docs }: { club: Club; priv: ClubPrivate | null; docs: ClubDocument[] }) {
  const founded = club.founded_on ? formatDate(club.founded_on) : club.founded_year ? String(club.founded_year) : null;

  return (
    <div className="wrap page" style={{ display: "grid", gap: 20 }}>
      <section className="profile-hero">
        <LogoEdit club={club} size={112} />
        <div className="ph-main">
          <div className="eyebrow">Profil du club</div>
          <h2>{club.name}</h2>
          <p className="muted">
            {[club.short_name, club.sport, [club.commune, club.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
          </p>
          <div className="ph-tags">
            <Pill tone={CLUB_STATUS_TONE[club.status]}>{CLUB_STATUS_LABELS[club.status]}</Pill>
            {club.founded_on ? (
              <span className="ph-tag">Fondé le {formatDate(club.founded_on)}</span>
            ) : club.founded_year ? (
              <span className="ph-tag">Fondé en {club.founded_year}</span>
            ) : null}
            {club.reviewed_at && club.status === "verified" ? <span className="ph-tag">Vérifié le {formatDate(club.reviewed_at)}</span> : null}
            <span className="ph-tag">{plural(docs.length, "document")} au dossier</span>
          </div>
        </div>
        <div className="ph-actions">
          {club.status === "verified" ? (
            <Link className="btn btn-ghost btn-sm" href={`/clubs/${club.slug}`}>
              Voir la page publique
            </Link>
          ) : null}
        </div>
      </section>

      <details className="panel edit-panel" id="modifier">
        <summary>
          <span>
            <b>Modifier la présentation et les coordonnées</b>
            <span className="small muted">Ville, commune, téléphone du club, couleurs et texte de présentation (page publique)</span>
          </span>
          <span className="btn btn-primary btn-sm" aria-hidden="true">
            <span className="when-closed">Modifier</span>
            <span className="when-open">Fermer</span>
          </span>
        </summary>
        <ActionForm action={updateClubInfo}>
          <div className="two">
            <div className="field">
              <label htmlFor="city">Ville</label>
              <input type="text" id="city" name="city" defaultValue={club.city} />
            </div>
            <div className="field">
              <label htmlFor="commune">Commune</label>
              <input type="text" id="commune" name="commune" defaultValue={club.commune ?? ""} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="contact_phone">Téléphone du club</label>
            <input type="tel" id="contact_phone" name="contact_phone" defaultValue={formatPhone(club.contact_phone)} />
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="color_primary">Couleur principale</label>
              <input type="color" id="color_primary" name="color_primary" defaultValue={club.color_primary} />
            </div>
            <div className="field">
              <label htmlFor="color_secondary">Couleur secondaire</label>
              <input type="color" id="color_secondary" name="color_secondary" defaultValue={club.color_secondary} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">Présentation</label>
            <textarea id="description" name="description" defaultValue={club.description} placeholder="Histoire, palmarès, équipes, nombre de licenciés…" />
          </div>
          <SubmitButton className="btn btn-primary btn-sm">Enregistrer</SubmitButton>
        </ActionForm>
      </details>

      <div className="info-grid">
        <InfoCard
          icon="id"
          title="Identité du club"
          rows={[
            ["Nom officiel", club.name],
            ["Sigle", club.short_name],
            ["Discipline", club.sport],
            ["Date de création", founded],
            ["Identifiant juridique", priv?.legal_id],
          ]}
          note="Ces informations ont été vérifiées : elles se corrigent auprès de l'équipe Tribune."
        />
        <InfoCard
          icon="pin"
          title="Siège et contact"
          rows={[
            ["Ville", club.city],
            ["Commune", club.commune],
            ["Adresse du siège", priv?.address],
            ["Téléphone du club", club.contact_phone ? <span className="num">{formatPhone(club.contact_phone)}</span> : null],
          ]}
          note="L'adresse n'est visible que par les gestionnaires et l'équipe Tribune."
        />
        <InfoCard
          icon="person"
          title="Représentant légal"
          rows={[
            ["Nom", club.president_name],
            ["Fonction", priv?.rep_title],
            ["Téléphone", priv?.rep_phone ? <span className="num">{formatPhone(priv.rep_phone)}</span> : null],
            ["E-mail", priv?.rep_email],
          ]}
          note="Pour changer de représentant légal, écrivez à l'équipe Tribune (une pièce d'identité sera demandée)."
        />
        <InfoCard icon="wallet" title="Compte de versement" note="Pour changer de compte, écrivez à l'équipe Tribune : le changement est vérifié pour éviter les détournements.">
          <PayoutSummary priv={priv} />
        </InfoCard>
        <InfoCard icon="palette" title="Couleurs et présentation" wide id="presentation">
          <div className="swatches">
            <span className="swatch" style={{ background: club.color_primary }} />
            <span className="swatch" style={{ background: club.color_secondary }} />
            <span className="small muted">Couleurs du club (blason, page publique)</span>
          </div>
          <p style={{ whiteSpace: "pre-line", marginTop: 10 }}>
            {club.description || <span className="muted">Pas encore de présentation : ajoutez-en une avec « Modifier ».</span>}
          </p>
        </InfoCard>
        <InfoCard icon="doc" title="Documents du dossier" wide note="Les pièces envoyées à l'inscription, visibles seulement par les gestionnaires du club et l'équipe Tribune.">
          <DocumentList docs={docs} editable={false} />
        </InfoCard>
      </div>
    </div>
  );
}

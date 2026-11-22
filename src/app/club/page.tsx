import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { can, canUseClubSpace, isStaff } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { deleteClubDocument, postNews, updateClubInfo } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoUpload } from "@/components/LogoUpload";
import { CampaignPill, Crest, FieldSvg, Pill } from "@/components/visuals";
import { CLUB_STATUS_LABELS, CLUB_STATUS_TONE, PAYOUT_METHOD_LABELS, updateStatusLabel } from "@/lib/labels";
import { formatDate, formatMoney, todayInKinshasa } from "@/lib/format";
import { formatBytes } from "@/lib/images";
import { formatPhone, maskPhone } from "@/lib/phone";
import { providerLabel } from "@/lib/payments/providers";
import { CLUB_DOCUMENT_KINDS, type Campaign, type Club, type ClubDocument, type ClubPrivate, type CampaignUpdate } from "@/lib/types";
import { EMPTY_DOSSIER, type DossierValues } from "@/lib/club-dossier";
import { ClubWizard } from "./ClubWizard";

export const metadata: Metadata = { title: "Espace club" };

const NEXT_STEP: Partial<Record<Campaign["status"], string>> = {
  draft: "Compléter et envoyer en revue",
  changes_requested: "Corriger selon la note de Tribune",
  in_review: "Instruction par l'équipe Tribune",
  published: "Publier une nouvelle au moins une fois par mois",
  suspended: "Répondre à l'équipe Tribune",
  funded: "Publier les preuves des jalons",
};

const OK_MESSAGES: Record<string, string> = {
  dossier_ouvert: "Informations enregistrées. Ajoutez maintenant les documents du club (et son logo si vous le souhaitez).",
  dossier_envoye: "Dossier envoyé. L'équipe Tribune le vérifie : vous serez prévenu ici et dans vos notifications.",
};

const PROOF_KINDS = new Set(CLUB_DOCUMENT_KINDS.filter((k) => k.proof).map((k) => k.id));
const KIND_LABEL = Object.fromEntries(CLUB_DOCUMENT_KINDS.map((k) => [k.id, k.label]));

function dossierValues(club: Club, priv: ClubPrivate | null): DossierValues {
  const phone = (v: string | null | undefined) => (v ? formatPhone(v) : "");
  return {
    name: club.name,
    short_name: club.short_name,
    sport: club.sport,
    city: club.city,
    commune: club.commune ?? "",
    address: priv?.address ?? "",
    founded_on: club.founded_on ?? "",
    legal_id: priv?.legal_id ?? "",
    rep_name: club.president_name,
    rep_title: priv?.rep_title ?? "",
    rep_phone: phone(priv?.rep_phone),
    rep_email: priv?.rep_email ?? "",
    contact_phone: club.contact_phone !== priv?.rep_phone ? phone(club.contact_phone) : "",
    description: club.description,
    color_primary: club.color_primary,
    color_secondary: club.color_secondary,
    payout_method: priv?.payout_method ?? "mobile_money",
    payout_holder: priv?.payout_holder ?? "",
    payout_phone: priv?.payout_phone ? `0${priv.payout_phone.slice(3)}` : "",
    payout_provider: priv?.payout_provider ?? "",
    bank_name: priv?.bank_name ?? "",
    bank_account: priv?.bank_account ?? "",
  };
}

/** Compte de versement, masqué : seuls les derniers chiffres apparaissent. */
function PayoutSummary({ priv }: { priv: ClubPrivate | null }) {
  if (!priv) return <p className="small muted">Aucun compte de versement enregistré.</p>;
  return (
    <div className="recap small">
      <div>
        <span className="muted">Type</span>
        <span>{PAYOUT_METHOD_LABELS[priv.payout_method]}</span>
      </div>
      <div>
        <span className="muted">Titulaire</span>
        <span>{priv.payout_holder || "—"}</span>
      </div>
      {priv.payout_method === "bank" ? (
        <div>
          <span className="muted">{priv.bank_name ?? "Banque"}</span>
          <span className="num">•••• {priv.bank_account?.slice(-4)}</span>
        </div>
      ) : (
        <div>
          <span className="muted">{priv.payout_provider ? providerLabel(priv.payout_provider) : "Numéro"}</span>
          <span className="num">{maskPhone(priv.payout_phone)}</span>
        </div>
      )}
    </div>
  );
}

function DocumentList({ docs, editable }: { docs: ClubDocument[]; editable: boolean }) {
  if (!docs.length) return <p className="small muted">Aucun document pour l&apos;instant.</p>;
  return (
    <ul className="doclist">
      {docs.map((d) => (
        <li key={d.id}>
          <span className="ic" aria-hidden="true">
            {d.mime_type === "application/pdf" ? "PDF" : "IMG"}
          </span>
          <span style={{ minWidth: 0 }}>
            <a href={`/club/documents/${d.id}`} target="_blank" rel="noopener">
              {KIND_LABEL[d.kind] ?? d.kind}
            </a>
            <span className="small muted" style={{ display: "block", overflowWrap: "anywhere" }}>
              {d.file_name} · {formatBytes(d.size_bytes)} · {formatDate(d.created_at)}
            </span>
          </span>
          {editable ? (
            <ActionForm action={deleteClubDocument} className="inline-form">
              <input type="hidden" name="document_id" value={d.id} />
              <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Retirer ce document du dossier ?">
                Retirer
              </SubmitButton>
            </ActionForm>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function Check({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <div>
      <span className="ck" style={{ color: ok ? "var(--ok)" : optional ? "var(--muted)" : "var(--warn)" }}>{ok ? "✓" : optional ? "○" : "!"}</span>
      <span>
        {label}
        {optional ? <span className="muted"> (conseillé)</span> : null}
      </span>
    </div>
  );
}

export default async function ClubPage(props: PageProps<"/club">) {
  const viewer = await requireViewer("/club");
  // L'équipe Tribune n'a pas d'espace club : ses clubs sont dans le back-office.
  if (isStaff(viewer.profile.role)) redirect("/admin/clubs");
  if (!canUseClubSpace(viewer.profile.role)) redirect("/acces-refuse");
  const { ok, etape } = await props.searchParams;
  const okMessage = typeof ok === "string" ? OK_MESSAGES[ok] : undefined;
  const askedStep = Number(etape) || 0;
  const club = viewer.club;
  const me = {
    name: `${viewer.profile.first_name} ${viewer.profile.last_name}`,
    phone: formatPhone(viewer.profile.phone),
    email: viewer.profile.email ?? "",
  };

  // Aucun club (ou demande refusée) : ouverture du dossier.
  if (!club || club.status === "rejected") {
    return (
      <div className="wrap page">
        <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginBottom: 20 }}>Espace club</h1>
        {club?.status === "rejected" ? (
          <p className="flash error">
            La demande pour « {club.name} » a été refusée{club.review_note ? ` : ${club.review_note}` : "."} Vous pouvez
            déposer une nouvelle demande.
          </p>
        ) : null}
        {can(viewer.profile.role, "club:register") ? (
          <ClubWizard
            key="nouveau"
            initial={EMPTY_DOSSIER}
            me={me}
            maxDate={todayInKinshasa()}
            step={1}
            club={null}
            docs={[]}
            saved={{ info: false, payout: false }}
          />
        ) : (
          <p className="muted">Votre rôle ne permet pas d&apos;inscrire un club.</p>
        )}
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: privData }, { data: docData }] = await Promise.all([
    supabase.from("club_private").select("*").eq("club_id", club.id).maybeSingle<ClubPrivate>(),
    supabase.from("club_documents").select("id, club_id, kind, file_name, mime_type, size_bytes, created_at").eq("club_id", club.id).order("created_at"),
  ]);
  const priv = privData ?? null;
  const docs = (docData ?? []) as ClubDocument[];

  const head = (
    <div className="page-head on-pitch">
      <FieldSvg opacity={0.6} />
      <div className="wrap" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <Crest club={club} size={56} />
        <div>
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Espace club · {CLUB_STATUS_LABELS[club.status]}
          </div>
          <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginTop: 4 }}>{club.name}</h1>
        </div>
      </div>
    </div>
  );

  // Dossier en préparation ou à compléter : le parcours en étapes, avec « Suivant ».
  if (club.status === "draft" || club.status === "changes_requested") {
    const hasProof = docs.some((d) => PROOF_KINDS.has(d.kind));
    const saved = { info: !!priv?.rep_phone && !!priv.address, payout: !!priv?.payout_holder };
    // Sans étape demandée : la première qui reste à faire.
    const firstTodo = !saved.info ? 1 : !saved.payout ? 3 : !hasProof ? 4 : 5;
    return (
      <>
        {head}
        <div className="wrap page">
          <ClubWizard
            key={club.id}
            initial={dossierValues(club, priv)}
            me={me}
            maxDate={todayInKinshasa()}
            step={askedStep >= 1 && askedStep <= 5 ? askedStep : firstTodo}
            club={club}
            docs={docs}
            saved={saved}
            okMessage={okMessage}
          />
        </div>
      </>
    );
  }

  // Dossier envoyé, en cours de vérification : lecture seule.
  if (club.status === "pending") {
    const hasProof = docs.some((d) => PROOF_KINDS.has(d.kind));
    const infoOk = !!priv?.rep_phone && !!priv.address;
    const payoutOk = !!priv?.payout_holder;
    const steps: [string, boolean][] = [
      ["Dossier", infoOk && payoutOk],
      ["Documents", hasProof],
      ["Envoi", true],
      ["Vérification", false],
      ["Club vérifié", false],
    ];
    return (
      <>
        {head}
        <div className="wrap page">
          {okMessage ? <p className="flash success">{okMessage}</p> : null}
          <div className="stepper" aria-label="Avancement du dossier">
            {steps.map(([label, done], i) => (
              <span key={label} className={done ? "done" : i === 3 ? "on" : ""}>
                {i + 1} · {label}
                {done ? " ✓" : ""}
              </span>
            ))}
          </div>
          <p className="flash info">
            Demande envoyée le {formatDate(club.submitted_at)}. L&apos;équipe Tribune vérifie l&apos;existence du club, son
            représentant légal et son compte de versement. Vous serez prévenu de sa décision ici et dans vos notifications.
          </p>

          <div className="split">
            <div className="panel">
              <h3>Dossier envoyé</h3>
              <div className="recap small">
                <div>
                  <span className="muted">Nom officiel · sigle</span>
                  <span>
                    {club.name} · {club.short_name}
                  </span>
                </div>
                <div>
                  <span className="muted">Discipline</span>
                  <span>{club.sport}</span>
                </div>
                <div>
                  <span className="muted">Siège</span>
                  <span>{[priv?.address, club.commune, club.city].filter(Boolean).join(", ")}</span>
                </div>
                <div>
                  <span className="muted">Date de création</span>
                  <span>{club.founded_on ? formatDate(club.founded_on) : (club.founded_year ?? "—")}</span>
                </div>
                <div>
                  <span className="muted">Identifiant juridique</span>
                  <span>{priv?.legal_id ?? "—"}</span>
                </div>
                <div>
                  <span className="muted">Représentant légal</span>
                  <span>
                    {club.president_name}
                    {priv?.rep_title ? `, ${priv.rep_title}` : ""} · {formatPhone(priv?.rep_phone)}
                    {priv?.rep_email ? ` · ${priv.rep_email}` : ""}
                  </span>
                </div>
              </div>
              <h4 style={{ margin: "18px 0 8px" }}>Compte de versement</h4>
              <PayoutSummary priv={priv} />
            </div>
            <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
              <div className="panel">
                <h3>Contenu du dossier</h3>
                <div className="rules">
                  <Check ok={infoOk} label="Identité du club, siège et représentant légal" />
                  <Check ok={hasProof} label="Un document attestant l'existence du club (statuts, enregistrement ou affiliation)" />
                  <Check ok={payoutOk} label="Compte de versement au nom du club" />
                  <Check ok={docs.some((d) => d.kind === "identite_representant")} label="Pièce d'identité du représentant légal" optional />
                  <Check ok={docs.some((d) => d.kind === "compte_versement")} label="Justificatif du compte de versement" optional />
                </div>
              </div>
              <div className="panel">
                <h3>Documents du dossier</h3>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  Visibles seulement par les gestionnaires du club et l&apos;équipe Tribune.
                </p>
                <DocumentList docs={docs} editable={false} />
              </div>
              <div className="panel">
                <h3>Logo</h3>
                <LogoUpload club={club} />
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }

  // Club vérifié (ou suspendu) : campagnes, actualités, présentation.
  const [{ data }, { data: fees }, { data: newsData }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("club_id", club.id).order("created_at", { ascending: false }),
    supabase.from("publication_fees").select("campaign_id").is("paid_at", null),
    supabase
      .from("campaign_updates")
      .select("id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at")
      .eq("club_id", club.id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const campaigns = (data ?? []) as Campaign[];
  const news = (newsData ?? []) as CampaignUpdate[];
  const unpaid = new Set((fees ?? []).map((f: { campaign_id: string }) => f.campaign_id));
  const canCreate = club.status === "verified" && can(viewer.profile.role, "club:manage");
  const titleOf = new Map(campaigns.map((c) => [c.id, c.title]));

  return (
    <>
      {head}
      <div className="wrap page">
        {club.status === "suspended" ? (
          <p className="flash error">Le club est suspendu{club.review_note ? ` : ${club.review_note}` : "."}</p>
        ) : null}

        <div className="sec-head">
          <h2 style={{ fontSize: "1.8rem" }}>Mes campagnes</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {club.status === "verified" ? (
              <Link className="btn btn-ghost btn-sm" href={`/clubs/${club.slug}`}>
                Page publique du club
              </Link>
            ) : null}
            {canCreate ? (
              <Link className="btn btn-primary btn-sm" href="/club/campagnes/nouvelle">
                Nouvelle campagne
              </Link>
            ) : null}
          </div>
        </div>
        {campaigns.length ? (
          <div className="tbl-wrap" style={{ marginBottom: 36 }}>
            <table>
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Statut</th>
                  <th className="r">Collecté</th>
                  <th className="r">Objectif</th>
                  <th>Prochaine étape</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/club/campagnes/${c.id}`}>{c.title}</Link>
                    </td>
                    <td>
                      <CampaignPill status={c.status} />
                    </td>
                    <td className="r num">{formatMoney(c.raised_amount, c.currency)}</td>
                    <td className="r num">{formatMoney(c.goal_amount, c.currency)}</td>
                    <td className="small">{unpaid.has(c.id) ? "Régler les frais d'instruction et de publication" : (NEXT_STEP[c.status] ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel empty" style={{ marginBottom: 36 }}>
            <p>
              <b>Aucune campagne pour l&apos;instant.</b>
            </p>
            {canCreate ? <p className="small muted">Créez votre première campagne : elle reste un brouillon tant que vous ne l&apos;envoyez pas.</p> : null}
          </div>
        )}

        <div className="split half" style={{ marginBottom: 28 }}>
          <div className="panel">
            <h3>Publier une actualité du club</h3>
            <p className="small muted" style={{ marginBottom: 12 }}>
              Résultats, vie du club, remerciements : publiée tout de suite sur la page du club et envoyée à ses supporters
              (ceux qui le suivent et les contributeurs de ses campagnes). Pour une nouvelle liée à un projet, ou un message
              aux seuls contributeurs, passez par la page de la campagne.
            </p>
            <p className="small muted" style={{ marginBottom: 12 }}>
              L&apos;équipe Tribune relit les publications et retire celles qui ne respectent pas les règles (promesse non
              tenue, données personnelles, propos injurieux) : vous recevez alors le motif.
            </p>
            {club.status === "verified" ? (
              <ActionForm action={postNews}>
                <input type="hidden" name="audience" value="public" />
                <div className="field">
                  <label htmlFor="news-title">Titre</label>
                  <input type="text" id="news-title" name="title" maxLength={140} />
                </div>
                <div className="field">
                  <label htmlFor="news-body">Texte</label>
                  <textarea id="news-body" name="body" />
                </div>
                <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Publication…">
                  Publier
                </SubmitButton>
              </ActionForm>
            ) : (
              <p className="small muted">Indisponible tant que le club est suspendu.</p>
            )}
          </div>
          <div className="panel">
            <h3>Nouvelles et messages envoyés</h3>
            {news.length ? (
              news.map((u) => (
                <div className="update" key={u.id}>
                  <span className="small muted">
                    {formatDate(u.created_at)} · {u.campaign_id ? (titleOf.get(u.campaign_id) ?? "Campagne") : "Actualité du club"}
                    {u.audience === "contributors" ? " · contributeurs seulement" : ""}
                  </span>
                  <h4>
                    {u.title} <Pill tone={updateStatusLabel(u).tone}>{updateStatusLabel(u).label}</Pill>
                  </h4>
                  {u.status === "rejected" && u.review_note ? <p className="small muted">Motif : {u.review_note}</p> : null}
                </div>
              ))
            ) : (
              <p className="small muted">Aucune nouvelle pour l&apos;instant.</p>
            )}
          </div>
        </div>

        <div className="split half">
          <div className="panel">
            <h3>Présentation du club</h3>
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
                <label htmlFor="contact_phone">Téléphone de contact</label>
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
                <textarea id="description" name="description" defaultValue={club.description} />
              </div>
              <SubmitButton className="btn btn-ghost btn-sm">Enregistrer</SubmitButton>
            </ActionForm>
          </div>
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div className="panel">
              <h3>Logo</h3>
              <LogoUpload club={club} />
            </div>
            <div className="panel">
              <h3>Compte de versement</h3>
              <PayoutSummary priv={priv} />
              <div className="recap small" style={{ marginTop: 8 }}>
                <div>
                  <span className="muted">Statut du club</span>
                  <Pill tone={CLUB_STATUS_TONE[club.status]}>{CLUB_STATUS_LABELS[club.status]}</Pill>
                </div>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>
                Pour changer de compte de versement, écrivez à l&apos;équipe Tribune : le changement est vérifié pour
                éviter les détournements.
              </p>
            </div>
            <div className="panel">
              <h3>Documents du dossier</h3>
              <DocumentList docs={docs} editable={false} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

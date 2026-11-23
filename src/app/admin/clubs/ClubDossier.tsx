import Link from "next/link";
import { can, isStaff, type Role } from "@/lib/rbac";
import { addClubMember, removeClubMember, reviewClub, setClubPayout } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Crest, Pill, logoUrl } from "@/components/visuals";
import { CLUB_STATUS_LABELS, CLUB_STATUS_TONE, PAYOUT_METHOD_LABELS } from "@/lib/labels";
import { formatDate, plural } from "@/lib/format";
import { formatBytes } from "@/lib/images";
import { formatPhone } from "@/lib/phone";
import { DRC_PROVIDERS, providerLabel } from "@/lib/payments/providers";
import { DOCUMENT_KIND_LABEL, PROOF_KINDS, UNDER_REVIEW, type DossierItem } from "@/lib/club-dossier";
import { CLUB_REVIEW_CRITERIA, type Club, type ClubDocument, type ClubDocumentKind, type ClubPrivate, type ClubStatus } from "@/lib/types";

// Fiche d'un club dans le back-office : tout ce que le demandeur a envoyé
// (informations, logo, documents), ce qui manque, l'historique du dossier et
// les décisions possibles pour son statut.

type Person = { first_name: string; last_name: string; email: string | null; phone: string | null; role: Role };
type Doc = ClubDocument & { uploaded_by: string | null; uploader: { first_name: string; last_name: string; role: Role } | null };

/** Club tel que le lit la page (jointures comprises). */
export type ClubRow = Club & {
  reviewed_at: string | null;
  reviewer: { first_name: string; last_name: string } | null;
  members: { member_role: "owner" | "manager"; created_at: string; user_id: string; profile: Person | null }[];
  private: ClubPrivate | ClubPrivate[] | null;
  documents: Doc[];
};

/** Entrée du journal d'audit concernant un club. */
export type HistoryEntry = {
  entity_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  actor: { first_name: string; last_name: string; role: Role } | null;
};

/** Club et ce qui en est déduit : partie privée, documents triés, conditions obligatoires, historique. */
export type DossierRow = {
  c: ClubRow;
  priv: ClubPrivate | null;
  docs: Doc[];
  required: DossierItem[];
  complete: boolean;
  log: HistoryEntry[];
};

/** Pièces et informations facultatives : elles aident à décider, sans bloquer la vérification. */
const OPTIONAL_PIECES: { kind: ClubDocumentKind; label: string; note: string }[] = [
  { kind: "compte_versement", label: "Justificatif du compte de versement", note: "conseillé" },
  { kind: "mandat", label: "Mandat du demandeur", note: "attendu si le demandeur n'est pas le représentant légal" },
  { kind: "pv_dirigeants", label: "Procès-verbal désignant les dirigeants", note: "facultatif" },
];

const HISTORY_LABELS: Record<string, string> = {
  "club.demande": "Demande d'inscription",
  "club.dossier_ouvert": "Dossier ouvert",
  "club.dossier_modifie": "Dossier modifié",
  "club.dossier_envoye": "Dossier envoyé pour vérification",
  "club.document_ajoute": "Document ajouté",
  "club.document_retire": "Document retiré",
  "club.logo": "Logo envoyé",
  "club.verify": "Club vérifié",
  "club.request_changes": "Compléments demandés",
  "club.reject": "Demande refusée",
  "club.suspend": "Club suspendu",
  "club.reactivate": "Club réactivé",
  "club.compte_versement": "Compte de versement changé",
  "club.membre_ajoute": "Gestionnaire ajouté",
  "club.membre_retire": "Gestionnaire retiré",
};

/** Dernière décision, pour la ligne de résumé de chaque dossier. */
const DECIDED: Record<ClubStatus, string> = {
  draft: "ouvert",
  pending: "envoyé",
  changes_requested: "compléments demandés",
  verified: "vérifié",
  suspended: "suspendu",
  rejected: "refusé",
};

/** Nom comparable : sans accents, en minuscules, espaces simples. */
function plainName(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

function fullName(p: { first_name: string; last_name: string } | null | undefined): string {
  return p ? `${p.first_name} ${p.last_name}`.trim() : "Compte supprimé";
}

/** Ligne « libellé · valeur » ; une valeur absente est signalée (manquante si obligatoire). */
function Field({ label, children, optional = false }: { label: string; children: React.ReactNode; optional?: boolean }) {
  const empty = children === null || children === undefined || children === "" || children === false;
  return (
    <div>
      <dt>
        {label}
        {optional ? <span className="muted"> (facultatif)</span> : null}
      </dt>
      <dd>{empty ? optional ? <span className="muted">Non renseigné</span> : <span className="cr-missing">Manquant</span> : children}</dd>
    </div>
  );
}

function CheckItem({ ok, label, note, required }: { ok: boolean; label: string; note?: string; required: boolean }) {
  return (
    <li className={ok ? "lvl-ok" : required ? "lvl-block" : "lvl-none"}>
      <span className="ic" aria-hidden="true">
        {ok ? "✓" : required ? "!" : "–"}
      </span>
      <div>
        <span>
          {label}
          <span className="sr-only">{ok ? " : présent" : " : absent"}</span>
        </span>
        {note ? <span className="small muted">{note}</span> : null}
      </div>
    </li>
  );
}

function historyText(e: HistoryEntry): string {
  const d = e.details ?? {};
  const label = HISTORY_LABELS[e.action] ?? e.action;
  const kind = typeof d.type === "string" ? (DOCUMENT_KIND_LABEL[d.type as ClubDocumentKind] ?? d.type) : null;
  const parts = [label];
  if (kind) parts.push(` : ${kind}${typeof d.fichier === "string" ? ` (${d.fichier})` : ""}`);
  if (typeof d.email === "string") parts.push(` : ${d.email}`);
  if (typeof d.note === "string" && d.note.trim()) parts.push(` : « ${d.note.trim()} »`);
  return parts.join("");
}

export function ClubDossier({ row, role, tab, single }: { row: DossierRow; role: Role; tab: ClubStatus; single: boolean }) {
  const { c, priv, docs, required, complete, log } = row;
  const kinds = new Set(docs.map((d) => d.kind));
  const missing = required.filter((i) => !i.ok).map((i) => i.label.charAt(0).toLowerCase() + i.label.slice(1));
  const underReview = UNDER_REVIEW.includes(c.status);
  // À ouvrir d'emblée : ce qui attend une décision (ou le seul dossier de l'onglet).
  const needsAction = c.status === "pending" || (c.status === "draft" && complete) || single;
  const owner = c.members.find((m) => m.member_role === "owner")?.profile ?? null;
  // Retrait d'un gestionnaire : administrateur, club vérifié ou suspendu, jamais le dernier.
  const canManageMembers = can(role, "club:assign_member") && (c.status === "verified" || c.status === "suspended");
  const ownerIsRep = !!owner && [`${owner.first_name} ${owner.last_name}`, `${owner.last_name} ${owner.first_name}`].some(
    (n) => plainName(n) === plainName(c.president_name),
  );
  const lastRequest = log.find((e) => e.action === "club.request_changes");
  const sinceRequest = lastRequest ? log.filter((e) => e.created_at > lastRequest.created_at && !isStaff(e.actor?.role)) : [];
  const edits = sinceRequest.filter((e) => e.action === "club.dossier_modifie").length;
  const added = sinceRequest.filter((e) => e.action === "club.document_ajoute").length;
  const canVerify =
    can(role, "club:review") && (c.status === "pending" || ((c.status === "draft" || c.status === "changes_requested") && complete));
  const canRequest = can(role, "club:review") && (c.status === "pending" || c.status === "draft");
  const canReject = can(role, "club:review") && underReview;
  const when =
    c.status === "pending"
      ? `envoyé le ${formatDate(c.submitted_at)}`
      : c.status !== "draft" && c.reviewed_at
        ? `${DECIDED[c.status]} le ${formatDate(c.reviewed_at)}`
        : `ouvert le ${formatDate(c.created_at)}`;
  return (
    <details id={`club-${c.slug}`} className="box cr" open={needsAction}>
      <summary>
        <span className="cr-sum">
          <Crest club={c} size={30} />
          <span className="cr-name">
            {c.name}{" "}
            <span className="muted small">
              {c.short_name} · {c.sport} · {c.city}
            </span>
          </span>
          <Pill tone={CLUB_STATUS_TONE[c.status]}>{CLUB_STATUS_LABELS[c.status]}</Pill>
          {underReview ? (
            complete ? (
              <Pill tone="ok">Dossier complet</Pill>
            ) : (
              <Pill tone="warn">Incomplet : {plural(missing.length, "élément manquant", "éléments manquants")}</Pill>
            )
          ) : null}
          <span className="small muted cr-when">
            {when} · {plural(docs.length, "document")} · {c.logo_path ? "logo envoyé" : "sans logo"}
          </span>
        </span>
      </summary>

      <div className="cr-body">
        <div className="cr-main">
          <section className="cr-sec">
            <h4>Contenu du dossier</h4>
            <div className="cr-check">
              <div>
                <p className="cr-sub">Obligatoire pour vérifier</p>
                <ul className="checks">
                  {required.map((i) => (
                    <CheckItem key={i.id} ok={i.ok} label={i.label} required />
                  ))}
                </ul>
              </div>
              <div>
                <p className="cr-sub">Facultatif : aide à décider</p>
                <ul className="checks">
                  {OPTIONAL_PIECES.map((p) => (
                    <CheckItem key={p.kind} ok={kinds.has(p.kind)} label={p.label} note={p.note} required={false} />
                  ))}
                  <CheckItem ok={!!c.logo_path} label="Logo du club" note="facultatif, choisi par le club" required={false} />
                  <CheckItem ok={!!priv?.legal_id} label="Identifiant juridique" note="facultatif" required={false} />
                </ul>
              </div>
            </div>
          </section>

          <section className="cr-sec">
            <h4>Documents ({docs.length})</h4>
            {docs.length ? (
              <ul className="doclist cr-docs">
                {docs.map((d) => {
                  const href = `/club/documents/${d.id}`;
                  const image = d.mime_type.startsWith("image/");
                  return (
                    <li key={d.id}>
                      {image ? (
                        <a href={href} target="_blank" rel="noopener" className="cr-thumb" title="Ouvrir dans un nouvel onglet">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={href} alt={`Aperçu : ${d.file_name}`} loading="lazy" />
                        </a>
                      ) : (
                        <span className="ic cr-thumb" aria-hidden="true">
                          PDF
                        </span>
                      )}
                      <span style={{ minWidth: 0 }}>
                        <b>{DOCUMENT_KIND_LABEL[d.kind] ?? d.kind}</b>{" "}
                        {(PROOF_KINDS as readonly string[]).includes(d.kind) ? <span className="tag">atteste l&apos;existence</span> : null}
                        <span className="small muted cr-line">
                          {d.file_name} · {formatBytes(d.size_bytes)} · {formatDate(d.created_at, true)}
                        </span>
                        <span className="small muted cr-line">
                          {d.uploader && isStaff(d.uploader.role) ? `Ajouté par l'équipe Tribune (${fullName(d.uploader)})` : "Envoyé par le club"}
                        </span>
                      </span>
                      <a className="btn btn-ghost btn-sm" href={href} target="_blank" rel="noopener">
                        Ouvrir
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="small cr-missing">
                Aucun document dans le dossier : le club n&apos;a encore ajouté aucune pièce. C&apos;est à lui de les envoyer
                depuis son espace ; demandez-lui des compléments si besoin.
              </p>
            )}
            {docs.length && !required[0].ok ? (
              <p className="small cr-warn">
                Aucun de ces documents n&apos;atteste l&apos;existence du club (statuts, enregistrement ou affiliation).
              </p>
            ) : null}
          </section>

          <div className="cr-cols">
            <section className="cr-sec">
              <h4>Logo</h4>
              {c.logo_path ? (
                <figure className="cr-logo">
                  <a href={logoUrl(c.logo_path)} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={logoUrl(c.logo_path)} alt={`Logo envoyé par ${c.name}`} width={160} height={160} />
                  </a>
                  <figcaption className="small muted">
                    Logo envoyé par le club ·{" "}
                    <a href={logoUrl(c.logo_path)} target="_blank" rel="noopener">
                      ouvrir en grand
                    </a>
                  </figcaption>
                </figure>
              ) : (
                <div className="cr-logo none">
                  <Crest club={{ ...c, logo_path: null }} size={48} />
                  <p className="small">
                    <b>Aucun logo envoyé.</b> Le logo est facultatif : sans logo, le club apparaît avec cet écusson
                    généré à partir de son sigle et de ses couleurs.
                  </p>
                </div>
              )}
              <p className="small muted" style={{ marginTop: 8 }}>
                Seul le club envoie ou change son logo.
              </p>
            </section>
            <section className="cr-sec">
              <h4>Identité du club</h4>
              <dl className="cr-dl">
                <Field label="Nom officiel">{c.name}</Field>
                <Field label="Sigle">{c.short_name}</Field>
                <Field label="Discipline">{c.sport}</Field>
                <Field label="Date de création">{c.founded_on ? formatDate(c.founded_on) : c.founded_year}</Field>
                <Field label="Identifiant juridique" optional>
                  {priv?.legal_id}
                </Field>
                <Field label="Couleurs">
                  <span className="cr-colors">
                    <span className="cr-swatch" style={{ background: c.color_primary }} aria-hidden="true" />
                    {c.color_primary}
                    <span className="cr-swatch" style={{ background: c.color_secondary }} aria-hidden="true" />
                    {c.color_secondary}
                  </span>
                </Field>
              </dl>
            </section>
          </div>

          <section className="cr-sec">
            <h4>Présentation du club</h4>
            {c.description ? (
              <p className="small cr-text">{c.description}</p>
            ) : (
              <p className="small muted">Non renseignée (facultatif).</p>
            )}
          </section>

          <div className="cr-cols">
            <section className="cr-sec">
              <h4>Siège et contact</h4>
              <dl className="cr-dl">
                <Field label="Adresse du siège">{priv?.address}</Field>
                <Field label="Commune" optional>
                  {c.commune}
                </Field>
                <Field label="Ville">{c.city}</Field>
                <Field label="Téléphone du club">{c.contact_phone ? <a href={`tel:+${c.contact_phone}`}>{formatPhone(c.contact_phone)}</a> : null}</Field>
              </dl>
            </section>
            <section className="cr-sec">
              <h4>Représentant légal</h4>
              <dl className="cr-dl">
                <Field label="Nom">{c.president_name}</Field>
                <Field label="Fonction">{priv?.rep_title}</Field>
                <Field label="Téléphone">{priv?.rep_phone ? <a href={`tel:+${priv.rep_phone}`}>{formatPhone(priv.rep_phone)}</a> : null}</Field>
                <Field label="E-mail" optional>
                  {priv?.rep_email ? <a href={`mailto:${priv.rep_email}`}>{priv.rep_email}</a> : null}
                </Field>
              </dl>
            </section>
          </div>

          <div className="cr-cols">
            <section className="cr-sec">
              <h4>Compte de versement</h4>
              <dl className="cr-dl">
                <Field label="Type">{priv ? PAYOUT_METHOD_LABELS[priv.payout_method] : null}</Field>
                {priv?.payout_method === "bank" ? (
                  <>
                    <Field label="Banque">{priv.bank_name}</Field>
                    <Field label="Numéro de compte">{priv.bank_account}</Field>
                  </>
                ) : (
                  <>
                    <Field label="Opérateur">{priv?.payout_provider ? providerLabel(priv.payout_provider) : null}</Field>
                    <Field label="Numéro">{priv?.payout_phone ? formatPhone(priv.payout_phone) : null}</Field>
                  </>
                )}
                <Field label="Titulaire">{priv?.payout_holder}</Field>
              </dl>
              <p className="small muted" style={{ marginTop: 6 }}>
                Le titulaire doit être le club (ou son trésorier mandaté), pas un particulier sans mandat.
              </p>
            </section>
            <section className="cr-sec">
              <h4>{c.status === "verified" || c.status === "suspended" ? "Gestionnaires" : "Demandeur"}</h4>
              {c.members.length ? (
                <ul className="cr-people">
                  {[...c.members]
                    .sort((a, b) => a.created_at.localeCompare(b.created_at))
                    .map((m, i) => (
                      <li key={i}>
                        <b>{fullName(m.profile)}</b>{" "}
                        <span className="small muted">
                          {m.member_role === "owner" ? "titulaire du dossier" : `ajouté·e par l'équipe le ${formatDate(m.created_at)}`}
                        </span>
                        <span className="small cr-line">
                          {m.profile?.email ? <a href={`mailto:${m.profile.email}`}>{m.profile.email}</a> : null}
                          {m.profile?.email && m.profile?.phone ? " · " : null}
                          {m.profile?.phone ? <a href={`tel:+${m.profile.phone}`}>{formatPhone(m.profile.phone)}</a> : null}
                        </span>
                        {canManageMembers && c.members.length > 1 ? (
                          <details className="cr-remove">
                            <summary className="small">Retirer ce gestionnaire</summary>
                            <ActionForm action={removeClubMember} className="form cr-form">
                              <input type="hidden" name="club_id" value={c.id} />
                              <input type="hidden" name="user_id" value={m.user_id} />
                              <div className="field">
                                <label htmlFor={`rm-${c.id}-${i}`}>Motif (communiqué à la personne)</label>
                                <input type="text" id={`rm-${c.id}-${i}`} name="note" required minLength={3} maxLength={500} placeholder="Ex. : a quitté le comité du club" />
                              </div>
                              <SubmitButton
                                className="btn btn-ghost btn-sm"
                                pendingLabel="…"
                                confirm={`Retirer ${fullName(m.profile)} des gestionnaires de « ${c.name} » ? La personne est prévenue${
                                  m.profile?.role === "club_manager" ? " et redevient supporter si elle ne gère aucun autre club" : ""
                                }.`}
                              >
                                Retirer
                              </SubmitButton>
                            </ActionForm>
                          </details>
                        ) : null}
                      </li>
                    ))}
                </ul>
              ) : (
                <p className="small muted">Aucun compte rattaché à ce club.</p>
              )}
              {canManageMembers && c.members.length === 1 ? (
                <p className="small muted">
                  Seul gestionnaire du club : pour le remplacer, ajoutez d&apos;abord la nouvelle personne, puis retirez-le.
                </p>
              ) : null}
              {owner && !ownerIsRep && underReview ? (
                <p className="small cr-warn">
                  Le demandeur n&apos;est pas le représentant légal déclaré ({c.president_name}) : vérifiez qu&apos;il est
                  dirigeant du club ou mandaté. Mandat {kinds.has("mandat") ? "fourni (voir les documents)" : "non fourni"}.
                </p>
              ) : null}
            </section>
          </div>

          <details className="cr-history">
            <summary>Historique du dossier ({log.length})</summary>
            {log.length ? (
              <ul className="log">
                {log.slice(0, 30).map((e, i) => (
                  <li key={i}>
                    <time className="small muted">{formatDate(e.created_at, true)}</time>
                    <span className="small">
                      {historyText(e)}
                      <span className="muted">
                        {" "}
                        · {e.actor ? `${fullName(e.actor)}${isStaff(e.actor.role) ? " (équipe)" : ""}` : "système"}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="small muted">Aucune entrée au journal pour ce club.</p>
            )}
          </details>
        </div>

        <aside className="cr-side">
          <h4>{underReview ? "Décision" : c.status === "rejected" ? "Statut" : "Actions"}</h4>
          {c.status === "pending" ? (
            <div className="note info">
              <b className="ic">i</b>
              <span>
                <b>Dossier envoyé le {formatDate(c.submitted_at)}.</b> Contrôlez les documents et les informations,
                puis décidez.
              </span>
            </div>
          ) : c.status === "draft" ? (
            <div className={`note ${complete ? "info" : "warn"}`}>
              <b className="ic">{complete ? "i" : "!"}</b>
              <span>
                {complete ? (
                  <>
                    <b>Dossier complet, pas encore envoyé par le club.</b> Vous pouvez le traiter comme un dossier
                    envoyé : mêmes contrôles, mêmes décisions.
                  </>
                ) : (
                  <>
                    <b>Dossier incomplet, pas encore envoyé.</b> Il manque {missing.join(", ")}. Il ne peut pas être
                    vérifié tant qu&apos;il est incomplet.
                  </>
                )}
              </span>
            </div>
          ) : c.status === "changes_requested" ? (
            <div className="note warn">
              <b className="ic">!</b>
              <span>
                <b>Compléments demandés le {formatDate(c.reviewed_at)}.</b>
                {c.review_note ? <span className="cr-line cr-quote">Message envoyé : « {c.review_note} »</span> : " "}
                {lastRequest
                  ? edits || added
                    ? `Depuis, le club a ${[edits ? `modifié son dossier (${edits} fois)` : "", added ? `ajouté ${plural(added, "document")}` : ""].filter(Boolean).join(" et ")}.`
                    : "Le club n'a rien modifié depuis."
                  : null}{" "}
                Le club renverra son dossier une fois complété.{" "}
                {complete
                  ? "Les conditions obligatoires sont remplies : si vous avez reçu autrement les compléments demandés (et les avez ajoutés au dossier), vous pouvez aussi le vérifier sans attendre."
                  : `Il manque encore ${missing.join(", ")}.`}
              </span>
            </div>
          ) : c.status === "verified" ? (
            <div className="note info">
              <b className="ic">✓</b>
              <span>
                <b>Club vérifié{c.reviewed_at ? ` le ${formatDate(c.reviewed_at)}` : ""}</b>
                {c.reviewer ? ` par ${fullName(c.reviewer)}` : ""}. Il est public et peut déposer des campagnes.
              </span>
            </div>
          ) : c.status === "suspended" ? (
            <div className="note warn">
              <b className="ic">!</b>
              <span>
                <b>Club suspendu{c.reviewed_at ? ` le ${formatDate(c.reviewed_at)}` : ""}.</b> Ses campagnes en cours ont été
                suspendues avec lui.
                {c.review_note ? <span className="cr-line cr-quote">Motif : « {c.review_note} »</span> : null}
              </span>
            </div>
          ) : (
            <div className="note warn">
              <b className="ic">!</b>
              <span>
                <b>Demande refusée{c.reviewed_at ? ` le ${formatDate(c.reviewed_at)}` : ""}.</b> Aucune décision n&apos;est
                possible sur ce dossier ; le demandeur peut inscrire un autre club.
                {c.review_note ? <span className="cr-line cr-quote">Motif : « {c.review_note} »</span> : null}
              </span>
            </div>
          )}

          {canVerify ? (
            <ActionForm action={reviewClub} className="form cr-form">
              <input type="hidden" name="club_id" value={c.id} />
              <input type="hidden" name="statut" value={tab} />
              <fieldset className="cr-criteria">
                <legend>Vérifier le club</legend>
                <p className="small muted">Cochez chaque point après l&apos;avoir contrôlé dans le dossier :</p>
                {CLUB_REVIEW_CRITERIA.map((k) => (
                  <label key={k.id} className="check">
                    <input type="checkbox" name="criteria" value={k.id} required />
                    <span>
                      <b>{k.label}</b>
                      <span className="small muted cr-line">{k.hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <div>
                <SubmitButton
                  className="btn btn-primary btn-sm"
                  name="decision"
                  value="verify"
                  pendingLabel="Vérification…"
                  confirm={`Vérifier « ${c.name} » ? Le club deviendra public et ses gestionnaires pourront déposer des campagnes.`}
                >
                  Vérifier le club
                </SubmitButton>
              </div>
              <p className="small muted">Le club devient public, il est prévenu, et ses gestionnaires peuvent déposer des campagnes.</p>
            </ActionForm>
          ) : null}

          {canReject ? (
            <ActionForm action={reviewClub} className="form cr-form">
              <input type="hidden" name="club_id" value={c.id} />
              <input type="hidden" name="statut" value={tab} />
              <div className="field">
                <label htmlFor={`note-${c.id}`}>
                  {canRequest ? "Demander des compléments ou refuser" : "Refuser la demande"}
                </label>
                <textarea
                  id={`note-${c.id}`}
                  name="note"
                  required
                  minLength={3}
                  placeholder={canRequest ? "Message au club : pièces manquantes, incohérences, ou motif du refus…" : "Motif du refus, communiqué au demandeur…"}
                />
                <div className="hint">Obligatoire : ce message est envoyé au club avec la décision.</div>
              </div>
              <div className="cr-buttons">
                {canRequest ? (
                  <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="request_changes" pendingLabel="Envoi…">
                    Demander des compléments
                  </SubmitButton>
                ) : null}
                <SubmitButton
                  className="btn btn-ghost btn-sm cr-danger"
                  name="decision"
                  value="reject"
                  pendingLabel="Envoi…"
                  confirm={`Refuser définitivement la demande de « ${c.name} » ?`}
                >
                  Refuser la demande
                </SubmitButton>
              </div>
              <ul className="small muted cr-effects">
                {canRequest ? (
                  <li>
                    <b>Compléments</b> : le dossier repasse au club, qui le corrige puis le renvoie.
                  </li>
                ) : null}
                <li>
                  <b>Refus</b> : définitif pour ce dossier ; le demandeur peut inscrire un autre club.
                </li>
              </ul>
            </ActionForm>
          ) : null}

          {c.status === "verified" && can(role, "club:suspend") ? (
            <ActionForm action={reviewClub} className="form cr-form">
              <input type="hidden" name="club_id" value={c.id} />
              <input type="hidden" name="statut" value={tab} />
              <div className="field">
                <label htmlFor={`snote-${c.id}`}>Motif de la suspension</label>
                <textarea id={`snote-${c.id}`} name="note" required minLength={3} />
                <div className="hint">Obligatoire : communiqué aux gestionnaires du club.</div>
              </div>
              <div>
                <SubmitButton
                  className="btn btn-ghost btn-sm cr-danger"
                  name="decision"
                  value="suspend"
                  confirm={`Suspendre « ${c.name} » ? Ses campagnes en cours seront suspendues aussi.`}
                >
                  Suspendre le club
                </SubmitButton>
              </div>
              <p className="small muted">
                Le club n&apos;est plus public et ses campagnes en cours sont suspendues (collectes arrêtées). Elles reprendront à la
                réactivation du club.
              </p>
            </ActionForm>
          ) : null}
          {c.status === "suspended" && can(role, "club:suspend") ? (
            <ActionForm action={reviewClub} className="form cr-form">
              <input type="hidden" name="club_id" value={c.id} />
              <input type="hidden" name="statut" value={tab} />
              <div>
                <SubmitButton className="btn btn-primary btn-sm" name="decision" value="reactivate" confirm={`Réactiver « ${c.name} » ?`}>
                  Réactiver le club
                </SubmitButton>
              </div>
              <p className="small muted">
                Le club redevient public. Ses campagnes suspendues avec lui reprennent, avec une date de fin repoussée de la
                durée de la suspension ; contributeurs et club sont prévenus. Une campagne suspendue à part reste suspendue :
                elle se réactive depuis <Link href="/admin/campagnes?statut=suspended">Campagnes</Link>.
              </p>
            </ActionForm>
          ) : null}
          {(c.status === "verified" || c.status === "suspended") && !can(role, "club:suspend") ? (
            <p className="small muted">
              Suspension, réactivation, ajout d&apos;un gestionnaire et changement du compte de versement : réservés aux
              administrateurs.
            </p>
          ) : null}

          {c.status === "verified" && can(role, "club:assign_member") ? (
            <>
              <ActionForm action={addClubMember} className="form cr-form">
                <input type="hidden" name="club_id" value={c.id} />
                <div className="field">
                  <label htmlFor={`member-${c.id}`}>Ajouter un gestionnaire</label>
                  <div className="inline-form">
                    <input type="email" id={`member-${c.id}`} name="email" required placeholder="E-mail du compte" />
                    <SubmitButton className="btn btn-ghost btn-sm">Ajouter</SubmitButton>
                  </div>
                  <div className="hint">
                    Le compte doit déjà exister (compte supporter) et ne gérer aucun autre club. La personne est
                    prévenue.
                  </div>
                </div>
              </ActionForm>
              <details className="cr-more">
                <summary>Changer le compte de versement</summary>
                <ActionForm action={setClubPayout}>
                  <input type="hidden" name="club_id" value={c.id} />
                  <div className="two">
                    <div className="field">
                      <label htmlFor={`pm-${c.id}`}>Type de compte</label>
                      <select id={`pm-${c.id}`} name="payout_method" defaultValue={priv?.payout_method ?? "mobile_money"}>
                        <option value="mobile_money">Mobile Money</option>
                        <option value="bank">Compte bancaire</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor={`ph-${c.id}`}>Titulaire (au nom du club)</label>
                      <input type="text" id={`ph-${c.id}`} name="payout_holder" defaultValue={priv?.payout_holder ?? ""} />
                    </div>
                  </div>
                  <div className="two">
                    <div className="field">
                      <label htmlFor={`pp-${c.id}`}>Numéro (Mobile Money)</label>
                      <input
                        type="text"
                        id={`pp-${c.id}`}
                        name="payout_phone"
                        placeholder="081 000 0000"
                        defaultValue={priv?.payout_phone ? formatPhone(priv.payout_phone) : ""}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor={`po-${c.id}`}>Opérateur (Mobile Money)</label>
                      <select id={`po-${c.id}`} name="payout_provider" defaultValue={priv?.payout_provider ?? DRC_PROVIDERS[0].code}>
                        {DRC_PROVIDERS.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="two">
                    <div className="field">
                      <label htmlFor={`bn-${c.id}`}>Banque</label>
                      <input type="text" id={`bn-${c.id}`} name="bank_name" defaultValue={priv?.bank_name ?? ""} />
                    </div>
                    <div className="field">
                      <label htmlFor={`ba-${c.id}`}>Numéro de compte</label>
                      <input type="text" id={`ba-${c.id}`} name="bank_account" defaultValue={priv?.bank_account ?? ""} />
                    </div>
                  </div>
                  <p className="small muted">Seuls les champs du type choisi sont enregistrés. Le changement est inscrit au journal d&apos;audit.</p>
                  <SubmitButton className="btn btn-ghost btn-sm" confirm="Changer le compte qui recevra les fonds de ce club ?">
                    Enregistrer le nouveau compte
                  </SubmitButton>
                </ActionForm>
              </details>
            </>
          ) : null}

        </aside>
      </div>
    </details>
  );
}

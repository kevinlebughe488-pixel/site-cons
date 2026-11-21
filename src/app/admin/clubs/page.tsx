import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { addClubMember, reviewClub, setClubPayout } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Crest, Pill } from "@/components/visuals";
import { DocumentUpload } from "@/app/club/DocumentUpload";
import { CLUB_STATUS_LABELS, CLUB_STATUS_TONE, PAYOUT_METHOD_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/images";
import { formatPhone } from "@/lib/phone";
import { DRC_PROVIDERS, providerLabel } from "@/lib/payments/providers";
import { CLUB_DOCUMENT_KINDS, CLUB_REVIEW_CRITERIA, type Club, type ClubDocument, type ClubPrivate, type ClubStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Clubs · Back-office" };

type ClubRow = Club & {
  members: { member_role: string; profile: { first_name: string; last_name: string; email: string | null; phone: string | null } | null }[];
  private: ClubPrivate | ClubPrivate[] | null;
  documents: ClubDocument[];
};

const TABS: { status: ClubStatus; label: string }[] = [
  { status: "pending", label: "À vérifier" },
  { status: "changes_requested", label: "Compléments demandés" },
  { status: "draft", label: "Dossiers en préparation" },
  { status: "verified", label: "Vérifiés" },
  { status: "suspended", label: "Suspendus" },
  { status: "rejected", label: "Refusés" },
];

const KIND_LABEL = Object.fromEntries(CLUB_DOCUMENT_KINDS.map((k) => [k.id, k.label]));
const PROOF = new Set(CLUB_DOCUMENT_KINDS.filter((k) => k.proof).map((k) => k.id));

export default async function AdminClubsPage(props: PageProps<"/admin/clubs">) {
  const { profile } = await requirePermission("backoffice:access", "/admin/clubs");
  const role = profile.role;
  const { statut } = await props.searchParams;
  const status = TABS.some((t) => t.status === statut) ? (statut as ClubStatus) : "pending";

  const supabase = await createClient();
  const [{ data }, { data: all }] = await Promise.all([
    supabase
      .from("clubs")
      .select(
        "*, members:club_members(member_role, profile:profiles(first_name, last_name, email, phone)), private:club_private(*), documents:club_documents(id, club_id, kind, file_name, mime_type, size_bytes, created_at)",
      )
      .eq("status", status)
      .order(status === "pending" ? "submitted_at" : "created_at", { ascending: status === "pending" }),
    supabase.from("clubs").select("status"),
  ]);
  const clubs = (data ?? []) as ClubRow[];
  const counts = new Map<string, number>();
  for (const row of (all ?? []) as { status: string }[]) counts.set(row.status, (counts.get(row.status) ?? 0) + 1);

  return (
    <>
      <h2>Clubs</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        L&apos;inscription d&apos;un club n&apos;ouvre aucun droit : vérifiez l&apos;existence du club (documents), son
        représentant légal et son compte de versement avant d&apos;autoriser les campagnes. Chaque décision est
        communiquée au club et inscrite au journal d&apos;audit.
      </p>
      <nav className="tabs" aria-label="Filtrer par statut">
        {TABS.map((t) => (
          <Link key={t.status} href={`/admin/clubs?statut=${t.status}`} aria-current={t.status === status ? "page" : undefined}>
            {t.label} ({counts.get(t.status) ?? 0})
          </Link>
        ))}
      </nav>
      <div style={{ display: "grid", gap: 14 }}>
        {clubs.map((c) => {
          const priv = Array.isArray(c.private) ? (c.private[0] ?? null) : c.private;
          const docs = [...(c.documents ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
          const hasProof = docs.some((d) => PROOF.has(d.kind));
          // Mêmes conditions que l'envoi du dossier par le club (la base les revérifie).
          const infoOk = !!priv?.rep_phone && !!priv?.address;
          const payoutOk = !!priv?.payout_holder;
          const complete = hasProof && infoOk && payoutOk;
          const missing = [
            !hasProof && "un document attestant l'existence du club (statuts, enregistrement ou affiliation)",
            !infoOk && "l'adresse du siège et le représentant légal",
            !payoutOk && "le compte de versement",
          ].filter(Boolean) as string[];
          // Dossier envoyé, ou dossier en préparation déjà complet : il peut être vérifié.
          const canVerify = c.status === "pending" || (c.status === "draft" && complete);
          return (
            <details key={c.id} className="box" open={c.status === "pending"}>
              <summary>
                <span style={{ display: "inline-flex", gap: 10, alignItems: "center", verticalAlign: "middle", flexWrap: "wrap" }}>
                  <Crest club={c} size={28} /> {c.name}{" "}
                  <Pill tone={CLUB_STATUS_TONE[c.status]}>{CLUB_STATUS_LABELS[c.status]}</Pill>
                  {c.status === "pending" ? <span className="small muted">envoyé le {formatDate(c.submitted_at)}</span> : null}
                </span>
              </summary>
              <div className="split half" style={{ marginTop: 14 }}>
                <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                  <div className="recap small">
                    <div>
                      <span className="muted">Sigle · discipline</span>
                      <span>
                        {c.short_name} · {c.sport}
                      </span>
                    </div>
                    <div>
                      <span className="muted">Siège</span>
                      <span>{[priv?.address, c.commune, c.city].filter(Boolean).join(", ")}</span>
                    </div>
                    <div>
                      <span className="muted">Date de création</span>
                      <span>{c.founded_on ? formatDate(c.founded_on) : (c.founded_year ?? "—")}</span>
                    </div>
                    <div>
                      <span className="muted">Identifiant juridique</span>
                      <span>{priv?.legal_id ?? "—"}</span>
                    </div>
                    <div>
                      <span className="muted">Représentant légal</span>
                      <span>
                        {c.president_name}
                        {priv?.rep_title ? `, ${priv.rep_title}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="muted">Coordonnées</span>
                      <span>
                        {formatPhone(priv?.rep_phone)}
                        {priv?.rep_email ? ` · ${priv.rep_email}` : ""}
                      </span>
                    </div>
                    <div>
                      <span className="muted">Téléphone du club</span>
                      <span>{formatPhone(c.contact_phone)}</span>
                    </div>
                    <div>
                      <span className="muted">Compte de versement</span>
                      <span>
                        {priv
                          ? priv.payout_method === "bank"
                            ? `${PAYOUT_METHOD_LABELS.bank} · ${priv.bank_name ?? "—"} · ${priv.bank_account ?? "—"}`
                            : `${priv.payout_provider ? providerLabel(priv.payout_provider) : "Mobile Money"} · ${formatPhone(priv.payout_phone)}`
                          : "—"}
                      </span>
                    </div>
                    <div>
                      <span className="muted">Titulaire du compte</span>
                      <span>{priv?.payout_holder || "—"}</span>
                    </div>
                    <div>
                      <span className="muted">Dossier ouvert le</span>
                      <span>{formatDate(c.created_at)}</span>
                    </div>
                    <div>
                      <span className="muted">Gestionnaires</span>
                      <span>
                        {c.members
                          .map((m) => (m.profile ? `${m.profile.first_name} ${m.profile.last_name} (${m.profile.email ?? formatPhone(m.profile.phone)})` : "?"))
                          .join(", ") || "—"}
                      </span>
                    </div>
                  </div>
                  {c.description ? <p className="small" style={{ whiteSpace: "pre-line" }}>{c.description}</p> : null}
                  {c.review_note ? <p className="small muted">Dernière note : {c.review_note}</p> : null}
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Documents ({docs.length})</h4>
                    {docs.length ? (
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
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="small" style={{ color: "var(--bad)" }}>
                        Aucun document : demandez au club les pièces qui attestent son existence.
                      </p>
                    )}
                    {docs.length && !hasProof ? (
                      <p className="small" style={{ color: "var(--warn)", marginTop: 8 }}>
                        Aucun des documents n&apos;atteste l&apos;existence du club (statuts, enregistrement, affiliation).
                      </p>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                  {c.status === "draft" ? (
                    <div className={`note ${complete ? "info" : "warn"}`}>
                      <b className="ic">{complete ? "i" : "!"}</b>
                      <span>
                        {complete ? (
                          <>
                            <b>Dossier complet, pas encore envoyé par le club.</b> Vous pouvez le vérifier dès maintenant (mêmes
                            contrôles qu&apos;un dossier envoyé), demander des compléments ou refuser la demande.
                          </>
                        ) : (
                          <>
                            <b>Dossier en préparation, incomplet :</b> il manque {missing.join(", ")}. Il pourra être vérifié
                            une fois complet. Vous pouvez ajouter un document reçu du club, ou lui écrire en demandant des
                            compléments.
                          </>
                        )}
                      </span>
                    </div>
                  ) : null}
                  {(c.status === "pending" || c.status === "changes_requested" || c.status === "draft") && can(role, "club:review") ? (
                    <ActionForm action={reviewClub}>
                      <input type="hidden" name="club_id" value={c.id} />
                      {canVerify ? (
                        <fieldset style={{ border: 0, padding: 0, margin: 0, display: "grid", gap: 8 }}>
                          <legend style={{ fontWeight: 700, marginBottom: 6 }}>Points de contrôle (obligatoires pour vérifier)</legend>
                          {CLUB_REVIEW_CRITERIA.map((k) => (
                            <label key={k.id} className="check">
                              <input type="checkbox" name="criteria" value={k.id} />
                              <span>
                                <b>{k.label}</b> · <span className="small muted">{k.hint}</span>
                              </span>
                            </label>
                          ))}
                        </fieldset>
                      ) : c.status === "changes_requested" ? (
                        <p className="small muted">
                          Le club complète son dossier. Il le renverra en vérification ; vous pouvez aussi refuser la demande.
                        </p>
                      ) : null}
                      <div className="field">
                        <label htmlFor={`note-${c.id}`}>Note pour le club</label>
                        <textarea id={`note-${c.id}`} name="note" placeholder="Obligatoire pour demander des compléments ou refuser : pièces manquantes, incohérences…" />
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {canVerify ? (
                          <SubmitButton className="btn btn-primary btn-sm" name="decision" value="verify" confirm={`Vérifier « ${c.name} » ? Ses gestionnaires pourront déposer des campagnes.`}>
                            Vérifier le club
                          </SubmitButton>
                        ) : null}
                        {c.status === "pending" || c.status === "draft" ? (
                          <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="request_changes">
                            Demander des compléments
                          </SubmitButton>
                        ) : null}
                        <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="reject" confirm="Refuser définitivement cette demande ?">
                          Refuser
                        </SubmitButton>
                      </div>
                    </ActionForm>
                  ) : null}
                  {(c.status === "verified" || c.status === "suspended") && can(role, "club:suspend") ? (
                    <ActionForm action={reviewClub}>
                      <input type="hidden" name="club_id" value={c.id} />
                      {c.status === "verified" ? (
                        <div className="field">
                          <label htmlFor={`snote-${c.id}`}>Motif de suspension</label>
                          <input type="text" id={`snote-${c.id}`} name="note" />
                        </div>
                      ) : null}
                      <SubmitButton
                        className="btn btn-ghost btn-sm"
                        name="decision"
                        value={c.status === "verified" ? "suspend" : "reactivate"}
                        confirm={c.status === "verified" ? "Suspendre le club et ses campagnes en cours ?" : undefined}
                      >
                        {c.status === "verified" ? "Suspendre le club" : "Réactiver le club"}
                      </SubmitButton>
                    </ActionForm>
                  ) : null}
                  {c.status === "verified" && can(role, "club:assign_member") ? (
                    <>
                      <ActionForm action={addClubMember} className="inline-form">
                        <input type="hidden" name="club_id" value={c.id} />
                        <input type="text" name="email" placeholder="E-mail d'un gestionnaire à ajouter" aria-label="E-mail du gestionnaire" />
                        <SubmitButton className="btn btn-ghost btn-sm">Ajouter</SubmitButton>
                      </ActionForm>
                      <details>
                        <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>
                          Changer le compte de versement
                        </summary>
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
                              <input type="text" id={`pp-${c.id}`} name="payout_phone" placeholder="081 000 0000" />
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
                              <input type="text" id={`bn-${c.id}`} name="bank_name" />
                            </div>
                            <div className="field">
                              <label htmlFor={`ba-${c.id}`}>Numéro de compte</label>
                              <input type="text" id={`ba-${c.id}`} name="bank_account" />
                            </div>
                          </div>
                          <SubmitButton className="btn btn-ghost btn-sm" confirm="Changer le compte qui recevra les fonds de ce club ?">
                            Enregistrer le nouveau compte
                          </SubmitButton>
                        </ActionForm>
                      </details>
                    </>
                  ) : null}
                  {(c.status === "pending" || c.status === "changes_requested" || c.status === "draft") && can(role, "club:review") ? (
                    <details>
                      <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>
                        Ajouter un document reçu du club
                      </summary>
                      <DocumentUpload clubId={c.id} />
                    </details>
                  ) : null}
                </div>
              </div>
            </details>
          );
        })}
        {clubs.length === 0 ? (
          <div className="panel empty">
            <p className="muted">Aucun club avec le statut « {CLUB_STATUS_LABELS[status]} ».</p>
          </div>
        ) : null}
      </div>
    </>
  );
}

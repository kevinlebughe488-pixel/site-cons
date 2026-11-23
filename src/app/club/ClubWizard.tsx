"use client";

import { useCallback, useRef, useState } from "react";
import { deleteClubDocument, saveClubDossier, submitClubDossier } from "@/lib/actions/club";
import { ActionForm, FieldError, Flash, SubmitButton, useFormAction } from "@/components/forms";
import type { FormState } from "@/lib/forms";
import { LogoEdit } from "@/components/LogoEdit";
import { DRC_PROVIDERS, providerLabel } from "@/lib/payments/providers";
import { checkDossier, PROOF_KINDS, STEP_FIELDS, stepOfField, WIZARD_STEPS, type DossierValues } from "@/lib/club-dossier";
import { formatBytes } from "@/lib/images";
import { formatDate } from "@/lib/format";
import { CLUB_DOCUMENT_KINDS, SPORTS, type Club, type ClubDocument, type ClubDocumentKind } from "@/lib/types";
import { DocumentUpload } from "./DocumentUpload";

const KIND_LABEL = Object.fromEntries(CLUB_DOCUMENT_KINDS.map((k) => [k.id, k.label]));

type WizardClub = Pick<Club, "id" | "name" | "short_name" | "color_primary" | "color_secondary" | "logo_path" | "status" | "review_note">;

type Props = {
  /** Valeurs enregistrées (ou vides pour un nouveau dossier). */
  initial: DossierValues;
  /** Le compte connecté : par défaut, c'est lui le représentant légal. */
  me: { name: string; phone: string; email: string };
  maxDate: string;
  /** Étape affichée à l'ouverture (1 à 5). */
  step: number;
  /** Club en préparation (null : rien n'est encore enregistré). */
  club: WizardClub | null;
  docs: ClubDocument[];
  /** Ce que la base a déjà : informations complètes, compte de versement. */
  saved: { info: boolean; payout: boolean };
  okMessage?: string;
};

/** Pièces du dossier, avec lien de lecture et « Retirer ». */
function DocList({ docs }: { docs: ClubDocument[] }) {
  if (!docs.length) return null;
  return (
    <ul className="doclist">
      {docs.map((d) => (
        <li key={d.id}>
          <span className="ic" aria-hidden="true">
            {d.mime_type === "application/pdf" ? "PDF" : "IMG"}
          </span>
          <span style={{ minWidth: 0 }}>
            <a href={`/club/documents/${d.id}`} target="_blank" rel="noopener">
              ✓ {KIND_LABEL[d.kind] ?? d.kind}
            </a>
            <span className="small muted" style={{ display: "block", overflowWrap: "anywhere" }}>
              {d.file_name} · {formatBytes(d.size_bytes)} · {formatDate(d.created_at)}
            </span>
          </span>
          <ActionForm action={deleteClubDocument} className="inline-form">
            <input type="hidden" name="document_id" value={d.id} />
            <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Retirer ce document du dossier ?">
              Retirer
            </SubmitButton>
          </ActionForm>
        </li>
      ))}
    </ul>
  );
}

function CheckRow({ ok, label, note, onEdit }: { ok: boolean | null; label: string; note?: string; onEdit?: () => void }) {
  // ok : true = fait, false = manquant (bloquant), null = conseillé ou facultatif, pas fait.
  return (
    <div className="wz-check">
      <span className="ck" style={{ color: ok ? "var(--ok)" : ok === false ? "var(--bad)" : "var(--muted)" }} aria-hidden="true">
        {ok ? "✓" : ok === false ? "!" : "○"}
      </span>
      <span>
        {label}
        {note ? <span className="muted"> ({note})</span> : null}
        <span className="sr-only">{ok ? " : fait" : ok === false ? " : manquant" : " : pas encore fait"}</span>
      </span>
      {onEdit ? (
        <button type="button" className="link-btn small" onClick={onEdit}>
          {ok ? "Modifier" : "Compléter"}
        </button>
      ) : null}
    </div>
  );
}

/**
 * Inscription d'un club en cinq étapes, un bouton « Suivant » à chaque fois :
 * 1. le club, 2. le représentant légal, 3. le compte de versement (enregistrés
 *    en passant à l'étape suivante ; le dossier est créé à la fin de l'étape 3) ;
 * 4. les documents et le logo (chaque fichier part dès qu'il est choisi) ;
 * 5. la vérification de tout le dossier, puis « Envoyer ma demande ».
 */
export function ClubWizard({ initial, me, maxDate, step: initialStep, club, docs, saved, okMessage }: Props) {
  const lastStep = club ? 5 : 3;
  const [step, setStep] = useState(Math.min(Math.max(1, initialStep), lastStep));
  const [dirty, setDirty] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const go = useCallback((n: number) => {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Réponse du serveur : étape suivante si tout est enregistré, sinon retour au champ fautif.
  const { state, pending: saving, formProps } = useFormAction(async (prev: FormState, form: FormData) => {
    const result = await saveClubDossier(prev, form);
    if (result.step) {
      setDirty(false);
      go(result.step);
    } else if (result.field) {
      go(stepOfField(result.field));
    }
    return result;
  });
  const v: DossierValues = { ...initial, ...(state.fields as Partial<DossierValues> | undefined) };

  const [method, setMethod] = useState<DossierValues["payout_method"]>(v.payout_method);
  const digits = (p: string) => p.replace(/\D/g, "").slice(-9);
  const [isMe, setIsMe] = useState(!initial.rep_name || (initial.rep_name === me.name && digits(initial.rep_phone) === digits(me.phone)));
  const [clientError, setClientError] = useState<{ field: string; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);

  const shown: { error?: string; field?: string } = clientError ? { error: clientError.message, field: clientError.field } : state;
  const invalid = (name: string) => (shown.field === name ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});


  const proofDocs = docs.filter((d) => PROOF_KINDS.includes(d.kind));
  const docsOf = (kind: ClubDocumentKind) => docs.filter((d) => d.kind === kind);
  const hasProof = proofDocs.length > 0;
  const idDocs = docs.filter((d) => d.kind === "identite_representant");
  const hasId = idDocs.length > 0;
  // Mêmes conditions que la base (submit_club_registration) et que le back-office (requiredItems).
  const complete = saved.info && saved.payout && hasProof && hasId;

  /** Contrôle les étapes 1 à `upTo` ; en cas d'erreur, affiche la première étape fautive. */
  function validUpTo(upTo: number): boolean {
    const form = formRef.current;
    if (!form) return false;
    const values = Object.fromEntries([...new FormData(form).entries()].map(([k, val]) => [k, typeof val === "string" ? val : ""]));
    for (const s of [1, 2, 3] as const) {
      if (s > upTo) break;
      const problem = checkDossier(values, STEP_FIELDS[s]);
      if (problem) {
        setClientError(problem);
        go(s);
        return false;
      }
    }
    setClientError(null);
    return true;
  }

  /** Quitte une étape d'informations vers `target` : enregistre si le dossier existe (ou à la fin de l'étape 3). */
  function leaveInfoStep(target: number) {
    if (target < step) {
      setClientError(null);
      go(target);
      return;
    }
    if (!validUpTo(club ? 3 : step)) return;
    const mustSave = club ? dirty || target > 3 : step === 3;
    if (!mustSave) {
      go(target);
      return;
    }
    if (nextRef.current) nextRef.current.value = String(target);
    formRef.current?.requestSubmit();
  }

  function onStepper(n: number) {
    if (n === step) return;
    if (step <= 3) leaveInfoStep(n);
    else go(n);
  }

  const reachable = (n: number) => n <= step || (!!club && n <= lastStep);
  const doneStep = (n: number) =>
    n === 1 || n === 2 ? saved.info : n === 3 ? saved.payout : n === 4 ? hasProof && hasId : false;

  return (
    <div className="wizard" ref={topRef}>
      <div>
        <div className="eyebrow">Inscription du club · étape {step} sur 5</div>
        <h2 style={{ fontSize: "1.8rem", marginTop: 4 }}>{WIZARD_STEPS[step - 1].title}</h2>
      </div>
      <nav className="stepper wz-steps" aria-label="Étapes de l'inscription">
        {WIZARD_STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            className={s.n === step ? "on" : club && doneStep(s.n) ? "done" : ""}
            aria-current={s.n === step ? "step" : undefined}
            disabled={!reachable(s.n) || saving}
            onClick={() => onStepper(s.n)}
          >
            {s.n} · {s.label}
            {club && doneStep(s.n) && s.n !== step ? " ✓" : ""}
          </button>
        ))}
      </nav>

      {okMessage ? <p className="flash success">{okMessage}</p> : null}
      {club?.status === "changes_requested" ? (
        <p className="flash info">
          <b>Compléments demandés par l&apos;équipe Tribune :</b> {club.review_note ?? "voir votre notification."} Corrigez le
          dossier ou ajoutez les documents demandés, puis renvoyez-le à l&apos;étape 5.
        </p>
      ) : null}

      {/* Étapes 1 à 3 : un seul formulaire, les étapes cachées gardent leurs valeurs. */}
      <form {...formProps} ref={formRef} className="panel form dossier" noValidate onInput={() => setDirty(true)} hidden={step > 3}>
        <input type="hidden" name="next_step" ref={nextRef} defaultValue="" />
        <Flash state={state.error && !state.field ? state : {}} />

        <fieldset hidden={step !== 1}>
          <legend>Identité du club</legend>
          <div className="two">
            <div className="field">
              <label htmlFor="name">Nom officiel du club</label>
              <input type="text" id="name" name="name" placeholder="Ex. : Association sportive Vita Club" defaultValue={v.name} {...invalid("name")} />
              <FieldError state={shown} name="name" />
              <div className="hint">Tel qu&apos;il figure dans les statuts.</div>
            </div>
            <div className="field">
              <label htmlFor="short_name">Nom abrégé ou sigle</label>
              <input type="text" id="short_name" name="short_name" placeholder="Ex. : ASV" maxLength={4} defaultValue={v.short_name} {...invalid("short_name")} style={{ textTransform: "uppercase" }} />
              <FieldError state={shown} name="short_name" />
              <div className="hint">2 à 4 lettres ou chiffres, affichés sur le blason.</div>
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="sport">Discipline sportive</label>
              <input type="text" id="sport" name="sport" list="sports" defaultValue={v.sport} {...invalid("sport")} />
              <datalist id="sports">
                {SPORTS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <FieldError state={shown} name="sport" />
            </div>
            <div className="field">
              <label htmlFor="founded_on">Date de création</label>
              <input type="date" id="founded_on" name="founded_on" min="1850-01-01" max={maxDate} defaultValue={v.founded_on} {...invalid("founded_on")} />
              <FieldError state={shown} name="founded_on" />
              <div className="hint">Celle des statuts. Si seule l&apos;année est connue, choisissez le 1er janvier.</div>
            </div>
          </div>
          <div className="field">
            <label htmlFor="legal_id">
              Identifiant juridique ou administratif <span className="muted">(si disponible)</span>
            </label>
            <input type="text" id="legal_id" name="legal_id" maxLength={80} placeholder="N° d'enregistrement, arrêté, affiliation, RCCM…" defaultValue={v.legal_id} {...invalid("legal_id")} />
            <FieldError state={shown} name="legal_id" />
          </div>
        </fieldset>

        <fieldset hidden={step !== 1}>
          <legend>Siège</legend>
          <div className="two">
            <div className="field">
              <label htmlFor="city">Ville</label>
              <input type="text" id="city" name="city" placeholder="Kinshasa" defaultValue={v.city} {...invalid("city")} />
              <FieldError state={shown} name="city" />
            </div>
            <div className="field">
              <label htmlFor="commune">
                Commune ou quartier <span className="muted">(facultatif)</span>
              </label>
              <input type="text" id="commune" name="commune" defaultValue={v.commune} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Adresse du siège</label>
            <input type="text" id="address" name="address" placeholder="N°, avenue, quartier" defaultValue={v.address} {...invalid("address")} />
            <FieldError state={shown} name="address" />
            <div className="hint">Visible seulement par l&apos;équipe Tribune et les gestionnaires du club.</div>
          </div>
        </fieldset>

        <fieldset hidden={step !== 1}>
          <legend>Présentation</legend>
          <div className="two">
            <div className="field">
              <label htmlFor="color_primary">Couleur principale</label>
              <input type="color" id="color_primary" name="color_primary" defaultValue={v.color_primary} />
            </div>
            <div className="field">
              <label htmlFor="color_secondary">Couleur secondaire</label>
              <input type="color" id="color_secondary" name="color_secondary" defaultValue={v.color_secondary} />
            </div>
          </div>
          <div className="field">
            <label htmlFor="description">
              Présentation du club <span className="muted">(facultatif)</span>
            </label>
            <textarea id="description" name="description" placeholder="Histoire, palmarès, équipes, nombre de licenciés…" defaultValue={v.description} {...invalid("description")} />
            <FieldError state={shown} name="description" />
          </div>
        </fieldset>

        <fieldset hidden={step !== 2}>
          <legend>Représentant légal</legend>
          <p className="small muted" style={{ marginTop: -4 }}>
            La personne qui engage le club (souvent le président).
          </p>
          <label className="check">
            <input type="checkbox" checked={isMe} onChange={(e) => setIsMe(e.target.checked)} />
            <span>Je suis le représentant légal du club</span>
          </label>
          {isMe ? (
            <>
              <input type="hidden" name="rep_name" value={me.name} />
              <input type="hidden" name="rep_phone" value={me.phone} />
              <input type="hidden" name="rep_email" value={me.email} />
              <div className="recap small">
                <div>
                  <span className="muted">Nom</span>
                  <span>{me.name}</span>
                </div>
                <div>
                  <span className="muted">Téléphone</span>
                  <span className="num">{me.phone}</span>
                </div>
                <div>
                  <span className="muted">E-mail</span>
                  <span style={{ overflowWrap: "anywhere" }}>{me.email || "—"}</span>
                </div>
              </div>
              <FieldError state={shown} name="rep_name" />
              <FieldError state={shown} name="rep_phone" />
              <FieldError state={shown} name="rep_email" />
              <p className="small muted" style={{ marginTop: -6 }}>
                Repris de votre compte : rien à saisir une deuxième fois.
              </p>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="rep_name">Nom et prénom</label>
                <input type="text" id="rep_name" name="rep_name" defaultValue={v.rep_name === me.name ? "" : v.rep_name} {...invalid("rep_name")} />
                <FieldError state={shown} name="rep_name" />
              </div>
              <div className="two">
                <div className="field">
                  <label htmlFor="rep_phone">Téléphone</label>
                  <input type="tel" id="rep_phone" name="rep_phone" placeholder="+243 81 000 0000" defaultValue={v.rep_name === me.name ? "" : v.rep_phone} {...invalid("rep_phone")} />
                  <FieldError state={shown} name="rep_phone" />
                </div>
                <div className="field">
                  <label htmlFor="rep_email">
                    E-mail <span className="muted">(facultatif)</span>
                  </label>
                  <input type="email" id="rep_email" name="rep_email" defaultValue={v.rep_name === me.name ? "" : v.rep_email} {...invalid("rep_email")} />
                  <FieldError state={shown} name="rep_email" />
                </div>
              </div>
              <p className="small muted">
                À l&apos;étape 4, ajoutez si possible le mandat qui vous autorise à inscrire le club en son nom.
              </p>
            </>
          )}
          <div className="field">
            <label htmlFor="rep_title">{isMe ? "Votre fonction au club" : "Sa fonction au club"}</label>
            <input type="text" id="rep_title" name="rep_title" list="titles" placeholder="Président" defaultValue={v.rep_title} {...invalid("rep_title")} />
            <datalist id="titles">
              {["Président", "Vice-président", "Secrétaire général", "Trésorier", "Directeur général", "Manager général"].map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <FieldError state={shown} name="rep_title" />
          </div>
          <div className="field">
            <label htmlFor="contact_phone">
              Téléphone du club <span className="muted">(si différent)</span>
            </label>
            <input type="tel" id="contact_phone" name="contact_phone" placeholder="Par défaut : celui du représentant" defaultValue={v.contact_phone} {...invalid("contact_phone")} />
            <FieldError state={shown} name="contact_phone" />
          </div>
        </fieldset>

        <fieldset hidden={step !== 3}>
          <legend>Compte de versement</legend>
          <p className="small muted" style={{ marginTop: -4 }}>
            Les fonds collectés sont versés par tranches, après la preuve de chaque jalon, sur un compte <b>au nom du club</b>.
            Il ne se change ensuite que par l&apos;équipe Tribune, pour éviter les détournements.
          </p>
          <div className="pay two">
            <label>
              <input type="radio" name="payout_method" value="mobile_money" checked={method === "mobile_money"} onChange={() => setMethod("mobile_money")} />
              <span>
                <b>Mobile Money</b>
                <br />
                <span className="small muted">M-Pesa, Airtel Money, Orange Money</span>
              </span>
              <span />
            </label>
            <label>
              <input type="radio" name="payout_method" value="bank" checked={method === "bank"} onChange={() => setMethod("bank")} />
              <span>
                <b>Compte bancaire</b>
                <br />
                <span className="small muted">Au nom du club</span>
              </span>
              <span />
            </label>
          </div>
          <div className="field">
            <label htmlFor="payout_holder">Titulaire du compte</label>
            <input type="text" id="payout_holder" name="payout_holder" placeholder="Nom exact du titulaire : le club ou son trésorier mandaté" defaultValue={v.payout_holder} {...invalid("payout_holder")} />
            <FieldError state={shown} name="payout_holder" />
          </div>
          {method === "mobile_money" ? (
            <div className="two">
              <div className="field">
                <label htmlFor="payout_phone">Numéro Mobile Money</label>
                <input type="tel" id="payout_phone" name="payout_phone" placeholder="081 000 0000" defaultValue={v.payout_phone} {...invalid("payout_phone")} />
                <FieldError state={shown} name="payout_phone" />
              </div>
              <div className="field">
                <label htmlFor="payout_provider">Opérateur</label>
                <select id="payout_provider" name="payout_provider" defaultValue={v.payout_provider || DRC_PROVIDERS[0].code} {...invalid("payout_provider")}>
                  {DRC_PROVIDERS.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <FieldError state={shown} name="payout_provider" />
              </div>
            </div>
          ) : (
            <div className="two">
              <div className="field">
                <label htmlFor="bank_name">Banque</label>
                <input type="text" id="bank_name" name="bank_name" placeholder="Ex. : Rawbank, Equity BCDC, TMB…" defaultValue={v.bank_name} {...invalid("bank_name")} />
                <FieldError state={shown} name="bank_name" />
              </div>
              <div className="field">
                <label htmlFor="bank_account">Numéro de compte</label>
                <input type="text" id="bank_account" name="bank_account" autoComplete="off" defaultValue={v.bank_account} {...invalid("bank_account")} />
                <FieldError state={shown} name="bank_account" />
              </div>
            </div>
          )}
          {club ? null : (
            <p className="small muted">
              En passant à l&apos;étape suivante, votre dossier est enregistré : vous pourrez y revenir et le modifier tant
              qu&apos;il n&apos;est pas envoyé.
            </p>
          )}
        </fieldset>

        <div className="wz-nav">
          {step > 1 ? (
            <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => leaveInfoStep(step - 1)}>
              ← Précédent
            </button>
          ) : (
            <span />
          )}
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => leaveInfoStep(step + 1)}>
            {saving ? "Enregistrement…" : `Suivant : ${WIZARD_STEPS[Math.min(step, 3)].label.toLowerCase()} →`}
          </button>
        </div>
      </form>

      {club && step === 4 ? (
        <div className="wz-docs">
          <p className="muted">
            Chaque fichier est envoyé dès que vous le choisissez : il apparaît alors dans la liste avec une coche. Les documents ne
            sont visibles que par les gestionnaires du club et l&apos;équipe Tribune.
          </p>
          <section className="panel">
            <h3>
              Document attestant l&apos;existence du club <span className="req">*</span>
            </h3>
            <p className="small muted" style={{ margin: "4px 0 12px" }}>
              Les statuts, l&apos;enregistrement officiel (personnalité juridique, arrêté, RCCM) ou l&apos;attestation d&apos;affiliation à
              une fédération ou une ligue. Au moins un est exigé.
            </p>
            <DocList docs={proofDocs} />
            <div style={{ marginTop: proofDocs.length ? 14 : 0 }}>
              <DocumentUpload
                clubId={club.id}
                kinds={PROOF_KINDS}
                label={hasProof ? "Ajouter un autre document" : "Document"}
                required={!hasProof}
              />
            </div>
          </section>
          <section className="panel">
            <h3>
              Pièce d&apos;identité du représentant légal <span className="req">*</span>
            </h3>
            <p className="small muted" style={{ margin: "4px 0 12px" }}>
              {isMe
                ? "Votre carte d'électeur, votre passeport ou votre permis de conduire, lisible (recto, et verso si besoin)."
                : `La carte d'électeur, le passeport ou le permis de conduire de ${initial.rep_name || "la personne qui représente le club"}, lisible.`}
            </p>
            <DocList docs={idDocs} />
            <div style={{ marginTop: hasId ? 14 : 0 }}>
              <DocumentUpload
                clubId={club.id}
                kind="identite_representant"
                label={hasId ? "Ajouter le verso ou une autre pièce" : "Pièce d'identité"}
                required={!hasId}
              />
            </div>
          </section>
          <section className="panel">
            <h3>Documents conseillés</h3>
            <p className="small muted" style={{ margin: "4px 0 12px" }}>
              Ils accélèrent la vérification ; vous pouvez envoyer le dossier sans eux.
            </p>
            <div className="wz-optional">
              {(["compte_versement", ...(isMe ? [] : ["mandat" as const])] as ClubDocumentKind[]).map((kind) => (
                <div key={kind}>
                  {docsOf(kind).length ? (
                    <DocList docs={docsOf(kind)} />
                  ) : (
                    <DocumentUpload clubId={club.id} kind={kind} label={KIND_LABEL[kind]} required={false} />
                  )}
                </div>
              ))}
            </div>
            <details style={{ marginTop: 14 }}>
              <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>
                Un autre document (procès-verbal des dirigeants, autre pièce utile)
              </summary>
              <div style={{ marginTop: 10 }}>
                <DocList docs={docs.filter((d) => d.kind === "pv_dirigeants" || d.kind === "autre" || (isMe && d.kind === "mandat"))} />
                <DocumentUpload clubId={club.id} kinds={["pv_dirigeants", "autre", "mandat"]} suggested="pv_dirigeants" required={false} />
              </div>
            </details>
          </section>
          <section className="panel logo-panel">
            <h3>
              Logo du club <span className="muted small">(facultatif)</span>
            </h3>
            <p className="small muted">Touchez le logo (ou le crayon) pour en choisir un : PNG, JPEG ou WebP, envoyé aussitôt.</p>
            <LogoEdit club={club} size={96} />
          </section>
          <div className="wz-nav">
            <button type="button" className="btn btn-ghost" onClick={() => go(3)}>
              ← Précédent
            </button>
            <button type="button" className="btn btn-primary" onClick={() => go(5)}>
              Suivant : vérifier et envoyer →
            </button>
          </div>
        </div>
      ) : null}

      {club && step === 5 ? (
        <div className="split">
          <section className="panel">
            <h3>Votre dossier</h3>
            <div className="recap small" style={{ marginTop: 10 }}>
              <div>
                <span className="muted">Club</span>
                <span>
                  {initial.name} · {initial.short_name}
                </span>
              </div>
              <div>
                <span className="muted">Discipline · création</span>
                <span>
                  {initial.sport} · {initial.founded_on ? formatDate(initial.founded_on) : "—"}
                </span>
              </div>
              <div>
                <span className="muted">Siège</span>
                <span>{[initial.address, initial.commune, initial.city].filter(Boolean).join(", ") || "—"}</span>
              </div>
              <div>
                <span className="muted">Représentant légal</span>
                <span>
                  {initial.rep_name}
                  {initial.rep_title ? `, ${initial.rep_title}` : ""} · {initial.rep_phone}
                </span>
              </div>
              <div>
                <span className="muted">Compte de versement</span>
                <span>
                  {initial.payout_method === "bank"
                    ? `${initial.bank_name} · •••• ${initial.bank_account.slice(-4)}`
                    : `${initial.payout_provider ? providerLabel(initial.payout_provider) : "Mobile Money"} · •••• ${initial.payout_phone.slice(-3)}`}
                  {initial.payout_holder ? ` (${initial.payout_holder})` : ""}
                </span>
              </div>
              <div>
                <span className="muted">Documents</span>
                <span>{docs.length ? docs.map((d) => KIND_LABEL[d.kind] ?? d.kind).join(", ") : "aucun"}</span>
              </div>
              <div>
                <span className="muted">Logo</span>
                <span>{club.logo_path ? "envoyé" : "aucun (blason aux couleurs du club)"}</span>
              </div>
            </div>
          </section>
          <aside className="panel" style={{ display: "grid", gap: 12, alignContent: "start" }}>
            <h3>Avant l&apos;envoi</h3>
            <div className="rules">
              <CheckRow ok={saved.info} label="Le club : identité et siège" onEdit={() => go(1)} />
              <CheckRow ok={saved.info} label="Le représentant légal" onEdit={() => go(2)} />
              <CheckRow ok={saved.payout} label="Le compte de versement au nom du club" onEdit={() => go(3)} />
              <CheckRow ok={hasProof} label="Un document attestant l'existence du club" onEdit={() => go(4)} />
              <CheckRow ok={hasId} label="La pièce d'identité du représentant légal" onEdit={() => go(4)} />
              <CheckRow ok={docsOf("compte_versement").length ? true : null} label="Justificatif du compte de versement" note="conseillé" onEdit={() => go(4)} />
              <CheckRow ok={club.logo_path ? true : null} label="Logo du club" note="facultatif" onEdit={() => go(4)} />
            </div>
            {complete ? (
              <ActionForm action={submitClubDossier} className="form">
                <SubmitButton
                  pendingLabel="Envoi…"
                  confirm="Envoyer votre demande à l'équipe Tribune ? Le dossier ne sera plus modifiable pendant la vérification."
                >
                  {club.status === "changes_requested" ? "Renvoyer ma demande" : "Envoyer ma demande"}
                </SubmitButton>
              </ActionForm>
            ) : (
              <>
                <button type="button" className="btn btn-primary" disabled>
                  Envoyer ma demande
                </button>
                <p className="small" style={{ color: "var(--bad)" }}>
                  Complétez d&apos;abord les points marqués « ! ».
                </p>
              </>
            )}
            <p className="small muted">
              L&apos;équipe Tribune vérifie l&apos;existence du club, son représentant légal et son compte de versement. Vous êtes
              prévenu de sa décision ici et dans vos notifications. Aucune campagne n&apos;est possible avant.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(4)}>
              ← Précédent
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

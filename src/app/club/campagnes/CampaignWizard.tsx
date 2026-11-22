"use client";

import { useCallback, useRef, useState } from "react";
import { saveCampaign, submitCampaignForReview } from "@/lib/actions/club";
import { ActionForm, FieldError, Flash, SubmitButton, useFormAction } from "@/components/forms";
import { ComplianceReportView } from "@/components/ComplianceReport";
import type { FormState } from "@/lib/forms";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { formatRatio, rateLine, suggestReference, type ComplianceReport } from "@/lib/compliance";
import {
  CAMPAIGN_STEPS,
  checkCampaignStep,
  DESCRIPTION_MIN,
  stepOfCampaignField,
  SUGGESTED_MILESTONES,
  type BudgetLineDraft,
  type CampaignDraft,
  type MilestoneDraft,
} from "@/lib/campaign-draft";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_LIMITS, type CampaignDocument, type CampaignPhoto, type PriceReference } from "@/lib/types";
import { CampaignDocuments } from "./CampaignDocuments";
import { CampaignPhotos } from "./CampaignPhotos";
import { FeesNotice } from "./FeesNotice";

type WizardCampaign = { id: string; status: string; review_note: string | null; cover_path: string | null };

type Props = {
  /** Valeurs enregistrées (vides pour une nouvelle campagne). */
  initial: CampaignDraft;
  /** Étape affichée à l'ouverture (1 à 6). */
  step: number;
  /** Campagne déjà enregistrée (null : rien n'est encore enregistré). */
  campaign: WizardCampaign | null;
  photos: CampaignPhoto[];
  docs: CampaignDocument[];
  /** Contrôle automatique calculé par la base (campagne enregistrée seulement). */
  report: ComplianceReport | null;
  references: PriceReference[];
  /** Date du jour à Kinshasa (AAAA-MM-JJ). */
  today: string;
  /** Frais d'instruction et de publication en vigueur (USD). */
  publicationFee: number;
};

const EMPTY_LINE: BudgetLineDraft = { label: "", amount: "", quantity: "1", reference_id: "" };

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function CheckRow({ ok, label, onEdit }: { ok: boolean; label: string; onEdit?: () => void }) {
  return (
    <div className="wz-check">
      <span className="ck" style={{ color: ok ? "var(--ok)" : "var(--bad)" }} aria-hidden="true">
        {ok ? "✓" : "!"}
      </span>
      <span>
        {label}
        <span className="sr-only">{ok ? " : fait" : " : manquant"}</span>
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
 * Création et modification d'une campagne en six étapes, avec « Suivant » :
 * 1. le projet, 2. l'objectif et la collecte (la campagne est enregistrée ici),
 * 3. le budget, 4. les jalons, 5. les photos et les devis (envoyés dès qu'ils
 * sont choisis), 6. la vérification de tout le dossier puis l'envoi en revue.
 * Chaque étape est contrôlée avant de passer à la suivante, avec les mêmes
 * règles que l'envoi : plus de refus surprise à la fin.
 */
export function CampaignWizard({ initial, step: initialStep, campaign, photos, docs, report, references, today, publicationFee }: Props) {
  const lastStep = campaign ? 6 : 2;
  const [step, setStep] = useState(Math.min(Math.max(1, initialStep), lastStep));
  const [dirty, setDirty] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLInputElement>(null);
  const go = useCallback((n: number) => {
    setStep(n);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Réponse du serveur : étape suivante si tout est enregistré, sinon retour au champ fautif.
  const { state, pending: saving, formProps } = useFormAction(async (prev: FormState, data: FormData) => {
    const result = await saveCampaign(prev, data);
    if (result.step) {
      setDirty(false);
      go(result.step);
    } else if (result.field) {
      go(stepOfCampaignField(result.field));
    }
    return result;
  });

  const [budget, setBudgetState] = useState<BudgetLineDraft[]>(() =>
    (initial.budget.length ? initial.budget : [EMPTY_LINE]).map((l) => ({
      ...EMPTY_LINE,
      ...l,
      quantity: String(l.quantity || "1"),
      reference_id: l.reference_id ?? "",
      manual: true,
    })),
  );
  const [milestones, setMilestonesState] = useState<MilestoneDraft[]>(() =>
    initial.milestones.length ? initial.milestones : [{ label: "", target: "" }],
  );
  const setBudget = (next: BudgetLineDraft[]) => {
    setBudgetState(next);
    setDirty(true);
  };
  const setMilestones = (next: MilestoneDraft[]) => {
    setMilestonesState(next);
    setDirty(true);
  };
  const [goal, setGoal] = useState(initial.goal);
  const [duration, setDuration] = useState(initial.duration_days);
  const [category, setCategory] = useState(initial.category);
  const [descLen, setDescLen] = useState(initial.description.trim().length);
  const [clientError, setClientError] = useState<{ field: string; message: string } | null>(null);

  const shown: { error?: string; field?: string } = clientError ? { error: clientError.message, field: clientError.field } : state;
  const invalid = (name: string) => (shown.field === name ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  // Budget : prix unitaire comparé au référentiel, comme le fera la base.
  const refById = new Map(references.map((r) => [r.id, r]));
  const groups = CAMPAIGN_CATEGORIES.map((c) => ({ category: c, refs: references.filter((r) => r.category === c) })).filter((g) => g.refs.length);
  const analysis = budget.map((line) => {
    const chosen = line.reference_id ? (refById.get(line.reference_id) ?? null) : null;
    const ref = chosen ?? (line.label.trim() ? suggestReference(line.label, references) : null);
    const quantity = Number(line.quantity) || 0;
    const unit = quantity > 0 ? (Number(line.amount) || 0) / quantity : 0;
    return { ref, chosen: !!chosen, unit, ...rateLine(unit, ref, !!chosen) };
  });
  const blocking = analysis.filter((a) => a.level === "block").length;
  const total = budget.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = total === Number(goal) && total > 0;
  const days = Number(duration);
  const durationOk = Number.isInteger(days) && days >= CAMPAIGN_LIMITS.minDuration && days <= CAMPAIGN_LIMITS.maxDuration;

  const updateAt = <T,>(list: T[], set: (v: T[]) => void, i: number, patch: Partial<T>) =>
    set(list.map((item, j) => (j === i ? { ...item, ...patch } : item)));

  /** Valeurs du formulaire en ce moment (étapes 1 et 2), avec le budget et les jalons. */
  function draftNow(): CampaignDraft {
    const data = formRef.current ? new FormData(formRef.current) : new FormData();
    const get = (k: string) => {
      const v = data.get(k);
      return typeof v === "string" ? v : "";
    };
    return {
      title: get("title"),
      category: get("category"),
      summary: get("summary"),
      description: get("description"),
      goal: get("goal"),
      duration_days: get("duration_days"),
      min_contribution: get("min_contribution"),
      max_contribution: get("max_contribution"),
      budget,
      milestones,
    };
  }

  /** Contrôle les étapes 1 à `upTo` ; en cas d'erreur, affiche la première étape fautive. */
  function validUpTo(upTo: number): boolean {
    const d = draftNow();
    for (const s of [1, 2, 3, 4] as const) {
      if (s > upTo) break;
      const problem = checkCampaignStep(s, d, s === 3 ? blocking : 0);
      if (problem) {
        setClientError(problem);
        go(s);
        return false;
      }
    }
    setClientError(null);
    return true;
  }

  /** Quitte une étape d'informations (1 à 4) vers `target` ; enregistre quand il le faut. */
  function leaveInfoStep(target: number) {
    if (target < step) {
      setClientError(null);
      go(target);
      return;
    }
    if (!validUpTo(Math.min(target - 1, 4))) return;
    const mustSave = campaign ? dirty : step === 2 && target >= 3;
    if (!mustSave) {
      go(target);
      return;
    }
    if (nextRef.current) nextRef.current.value = String(target);
    formRef.current?.requestSubmit();
  }

  function onStepper(n: number) {
    if (n === step) return;
    // Depuis une étape d'informations, on contrôle (et on enregistre) avant d'avancer.
    if (step <= 4) leaveInfoStep(n);
    else go(n);
  }

  // Ce qui est enregistré (les coches de la barre d'étapes et de l'étape 6).
  const hasDevis = docs.some((d) => d.kind === "devis" || d.kind === "facture");
  const savedOk = (n: number) => {
    if (!campaign) return false;
    if (n >= 1 && n <= 4) return checkCampaignStep(n as 1 | 2 | 3 | 4, initial) === null;
    if (n === 5) return photos.length > 0 && hasDevis;
    return false;
  };
  const infoOk = [1, 2, 3, 4].every(savedOk);
  const blocked = report?.level === "block";
  const canSubmit = !!campaign && infoOk && photos.length > 0 && hasDevis && !blocked && !dirty;
  const reachable = (n: number) => (campaign ? true : n <= 2);
  const suggestions = SUGGESTED_MILESTONES[category] ?? SUGGESTED_MILESTONES["Équipement"];

  return (
    <div className="wizard" ref={topRef}>
      <div>
        <div className="eyebrow">Campagne · étape {step} sur 6</div>
        <h2 style={{ fontSize: "1.8rem", marginTop: 4 }}>{CAMPAIGN_STEPS[step - 1].title}</h2>
      </div>
      <nav className="stepper wz-steps" aria-label="Étapes de la campagne">
        {CAMPAIGN_STEPS.map((s) => (
          <button
            key={s.n}
            type="button"
            className={s.n === step ? "on" : savedOk(s.n) ? "done" : ""}
            aria-current={s.n === step ? "step" : undefined}
            disabled={!reachable(s.n) || saving}
            onClick={() => onStepper(s.n)}
          >
            {s.n} · {s.label}
            {savedOk(s.n) && s.n !== step ? " ✓" : ""}
          </button>
        ))}
      </nav>

      {campaign?.status === "changes_requested" && campaign.review_note ? (
        <p className="flash info">
          <b>Corrections demandées par l&apos;équipe Tribune :</b> {campaign.review_note} Faites les modifications, puis renvoyez la
          campagne à l&apos;étape 6.
        </p>
      ) : null}

      {/* Étapes 1 à 4 : un seul formulaire, les étapes cachées gardent leurs valeurs. */}
      <form {...formProps} ref={formRef} className="panel form" noValidate onInput={() => setDirty(true)} hidden={step > 4}>
        <input type="hidden" name="next_step" ref={nextRef} defaultValue="" />
        {campaign ? <input type="hidden" name="campaign_id" value={campaign.id} /> : null}
        <input
          type="hidden"
          name="budget"
          value={JSON.stringify(
            budget
              .filter((l) => l.label.trim() || l.amount)
              .map((l) => ({ label: l.label, amount: l.amount, quantity: l.quantity || "1", reference_id: l.reference_id || null })),
          )}
        />
        <input type="hidden" name="milestones" value={JSON.stringify(milestones.filter((m) => m.label.trim()))} />
        <Flash state={state.error && !state.field ? state : {}} />

        <fieldset hidden={step !== 1}>
          <legend>Le projet</legend>
          <div className="field">
            <label htmlFor="title">Titre du projet</label>
            <input type="text" id="title" name="title" defaultValue={initial.title} placeholder="Ex. : Construction d'un centre d'entraînement" {...invalid("title")} />
            <FieldError state={shown} name="title" />
          </div>
          <div className="field">
            <label htmlFor="category">Thème</label>
            <select id="category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} {...invalid("category")}>
              {CAMPAIGN_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <FieldError state={shown} name="category" />
          </div>
          <div className="field">
            <label htmlFor="summary">
              Résumé en une phrase <span className="muted">(conseillé)</span>
            </label>
            <input type="text" id="summary" name="summary" maxLength={300} defaultValue={initial.summary} />
            <div className="hint">Il apparaît sur la fiche de la campagne et dans les partages sur les réseaux sociaux.</div>
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              style={{ minHeight: 160 }}
              defaultValue={initial.description}
              onChange={(e) => setDescLen(e.target.value.trim().length)}
              placeholder="Le problème, ce que vous allez faire, qui en profite. Laissez une ligne vide entre deux paragraphes."
              {...invalid("description")}
            />
            <FieldError state={shown} name="description" />
            <div className="hint" style={{ color: descLen >= DESCRIPTION_MIN ? "var(--ok)" : undefined }}>
              {descLen >= DESCRIPTION_MIN ? `${descLen} caractères ✓` : `${descLen} / ${DESCRIPTION_MIN} caractères au moins.`}
            </div>
          </div>
        </fieldset>

        <fieldset hidden={step !== 2}>
          <legend>Objectif et conditions de la collecte</legend>
          <div className="two">
            <div className="field">
              <label htmlFor="goal">Objectif financier (USD)</label>
              <input type="number" id="goal" name="goal" min={100} step={1} value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="numeric" {...invalid("goal")} />
              <FieldError state={shown} name="goal" />
              <div className="hint">Le montant exact du budget de l&apos;étape 3.</div>
            </div>
            <div className="field">
              <label htmlFor="duration_days">Durée de la collecte (jours)</label>
              <input
                type="number"
                id="duration_days"
                name="duration_days"
                min={CAMPAIGN_LIMITS.minDuration}
                max={CAMPAIGN_LIMITS.maxDuration}
                step={1}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                inputMode="numeric"
                {...invalid("duration_days")}
              />
              <FieldError state={shown} name="duration_days" />
              <div className="hint">
                Entre {CAMPAIGN_LIMITS.minDuration} et {CAMPAIGN_LIMITS.maxDuration} jours, à partir de la publication.
                {durationOk ? ` Publiée aujourd'hui, la campagne se terminerait le ${formatDate(addDays(today, days - 1))}.` : ""}
              </div>
            </div>
          </div>
          <div className="two">
            <div className="field">
              <label htmlFor="min_contribution">Contribution minimum par supporter (USD)</label>
              <input
                type="number"
                id="min_contribution"
                name="min_contribution"
                min={1}
                max={CAMPAIGN_LIMITS.maxMinContribution}
                step={1}
                defaultValue={initial.min_contribution}
                inputMode="numeric"
                {...invalid("min_contribution")}
              />
              <FieldError state={shown} name="min_contribution" />
              <div className="hint">Un montant bas permet à plus de supporters de participer.</div>
            </div>
            <div className="field">
              <label htmlFor="max_contribution">
                Maximum par supporter (USD) <span className="muted">(facultatif)</span>
              </label>
              <input
                type="number"
                id="max_contribution"
                name="max_contribution"
                min={1}
                step={1}
                defaultValue={initial.max_contribution}
                placeholder="Aucun plafond"
                inputMode="numeric"
                {...invalid("max_contribution")}
              />
              <FieldError state={shown} name="max_contribution" />
              <div className="hint">Plafond du total versé par un même supporter, si vous voulez une collecte très partagée.</div>
            </div>
          </div>
          <FeesNotice publicationFee={publicationFee} />
          {campaign ? null : (
            <p className="small muted">
              En passant à l&apos;étape suivante, la campagne est enregistrée comme brouillon : vous pourrez la reprendre plus tard
              depuis « Mon club ». Rien n&apos;est envoyé à l&apos;équipe Tribune avant l&apos;étape 6.
            </p>
          )}
        </fieldset>

        <fieldset hidden={step !== 3}>
          <legend>Budget détaillé</legend>
          <p className="small muted" style={{ marginTop: -6 }}>
            Ce que vous allez acheter ou payer, poste par poste. Pour chaque poste, choisissez l&apos;article du référentiel et la
            quantité : le prix unitaire est comparé au prix normal. Le total doit être égal à l&apos;objectif.
          </p>
          <div className="rowlist">
            {budget.map((line, i) => {
              const a = analysis[i];
              return (
                <div className={`budget-line lvl-${a.level}`} key={i}>
                  <input
                    type="text"
                    className="bl-label"
                    aria-label={`Poste ${i + 1}`}
                    placeholder="Poste (ex. : Maillots de match)"
                    value={line.label}
                    onChange={(e) => {
                      const label = e.target.value;
                      const auto = line.manual ? null : suggestReference(label, references);
                      updateAt(budget, setBudget, i, line.manual ? { label } : { label, reference_id: auto?.id ?? "" });
                    }}
                  />
                  <label className="bl-ref">
                    <span>Article de référence</span>
                    <select
                      aria-label={`Article de référence du poste ${i + 1}`}
                      value={line.reference_id}
                      onChange={(e) => updateAt(budget, setBudget, i, { reference_id: e.target.value, manual: true })}
                    >
                      <option value="">Autre (pas dans la liste)</option>
                      {groups.map((g) => (
                        <optgroup key={g.category} label={g.category}>
                          {g.refs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label} — {formatMoney(r.unit_price)} / {r.unit}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                  <label className="bl-qty">
                    <span>Quantité</span>
                    <input
                      type="number"
                      aria-label={`Quantité du poste ${i + 1}`}
                      min={0.01}
                      step="any"
                      value={line.quantity}
                      onChange={(e) => updateAt(budget, setBudget, i, { quantity: e.target.value })}
                    />
                  </label>
                  <label className="bl-amount">
                    <span>Montant total ($)</span>
                    <input
                      type="number"
                      aria-label={`Montant total du poste ${i + 1}`}
                      min={1}
                      value={line.amount}
                      onChange={(e) => updateAt(budget, setBudget, i, { amount: e.target.value })}
                    />
                  </label>
                  <button type="button" className="btn btn-ghost btn-sm bl-del" onClick={() => setBudget(budget.filter((_, j) => j !== i))} aria-label="Retirer ce poste">
                    ✕
                  </button>
                  {a.unit > 0 && line.label.trim() ? (
                    <div className="bl-check small">
                      {formatMoney(a.unit)} l&apos;unité
                      {a.ref && a.ratio !== null ? (
                        <>
                          {" · "}référence {formatMoney(a.ref.unit_price)} / {a.ref.unit}
                          {a.chosen ? "" : " (suggérée)"}
                          {" · "}
                          <b>
                            {a.level === "ok"
                              ? "au prix normal ✓"
                              : a.level === "block"
                                ? `${formatRatio(a.ratio)} fois le prix normal : corrigez le montant ou la quantité`
                                : `${formatRatio(a.ratio)} fois le prix normal : à justifier par le devis`}
                          </b>
                        </>
                      ) : (
                        " · pas de prix de référence : le devis fera foi"
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBudget([...budget, EMPTY_LINE])}>
              + Ajouter un poste
            </button>
            <span className="small num" style={{ color: balanced ? "var(--ok)" : "var(--warn)", fontWeight: 700 }}>
              Total : {formatMoney(total)} {balanced ? "= objectif ✓" : `· objectif : ${formatMoney(Number(goal) || 0)}`}
            </span>
          </div>
          {!balanced && total > 0 ? (
            <p className="small">
              Le total doit être égal à l&apos;objectif.{" "}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setGoal(String(total));
                  setDirty(true);
                }}
              >
                Mettre l&apos;objectif à {formatMoney(total)}
              </button>
            </p>
          ) : null}
          {blocking ? (
            <p className="flash error" style={{ margin: 0 }}>
              {blocking > 1 ? `${blocking} postes dépassent` : "Un poste dépasse"} 3 fois le prix de référence : corrigez le montant ou la
              quantité pour continuer.
            </p>
          ) : null}
          <FieldError state={shown} name="budget" />
        </fieldset>

        <fieldset hidden={step !== 4}>
          <legend>Les étapes du projet (jalons)</legend>
          <div className="note info">
            <b className="ic">i</b>
            <span>
              Un jalon est une étape vérifiable de votre projet. <b>Rien n&apos;est à prouver maintenant</b> : vous expliquez seulement
              comment le projet va se dérouler. Si l&apos;objectif est atteint, les fonds sont versés au club par tranches, chacune
              après la preuve d&apos;un jalon (facture, bon de livraison, photo).
            </span>
          </div>
          <div className="rowlist">
            {milestones.map((m, i) => (
              <div className="budget-row ms" key={i}>
                <input
                  type="text"
                  aria-label={`Jalon ${i + 1}`}
                  placeholder={`Étape ${i + 1} (ex. : ${suggestions[Math.min(i, suggestions.length - 1)].label})`}
                  value={m.label}
                  onChange={(e) => updateAt(milestones, setMilestones, i, { label: e.target.value })}
                />
                <input
                  type="text"
                  aria-label={`Échéance prévue du jalon ${i + 1}`}
                  placeholder="Quand ? (ex. : 1 mois après la collecte)"
                  value={m.target}
                  onChange={(e) => updateAt(milestones, setMilestones, i, { target: e.target.value })}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} aria-label="Retirer ce jalon">
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMilestones([...milestones, { label: "", target: "" }])}>
              + Ajouter un jalon
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                const empty = milestones.every((m) => !m.label.trim());
                if (empty || window.confirm("Remplacer vos jalons par les étapes proposées ?")) setMilestones(suggestions);
              }}
            >
              Proposer des étapes pour « {category} »
            </button>
          </div>
          <FieldError state={shown} name="milestones" />
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
            {saving ? "Enregistrement…" : `Suivant : ${CAMPAIGN_STEPS[Math.min(step, 5)].label.toLowerCase()} →`}
          </button>
        </div>
      </form>

      {campaign && step === 5 ? (
        <div className="wz-docs">
          <p className="muted">
            Les supporters voient les photos sur la page de la campagne ; les devis restent privés (club et équipe Tribune). Chaque
            fichier est envoyé dès qu&apos;il est choisi.
          </p>
          <section className="panel">
            <h3>
              Photos de la situation actuelle <span className="req">*</span>
            </h3>
            <p className="small muted" style={{ margin: "4px 0 12px" }}>
              Montrez de quoi il s&apos;agit : la pelouse aujourd&apos;hui, le vestiaire, le matériel usé… Au moins une, jusqu&apos;à 6, chacune
              avec une légende.
            </p>
            <CampaignPhotos campaignId={campaign.id} photos={photos} coverPath={campaign.cover_path} editable today={today} />
          </section>
          <section className="panel">
            <h3>
              Devis des fournisseurs <span className="req">*</span>
            </h3>
            <p className="small muted" style={{ margin: "4px 0 12px" }}>
              Au moins un devis (ou une facture pro forma) qui justifie le budget. L&apos;équipe Tribune peut appeler le fournisseur
              pour vérifier que le projet est réel et les prix justes.
            </p>
            <CampaignDocuments campaignId={campaign.id} documents={docs} editable />
          </section>
          <div className="wz-nav">
            <button type="button" className="btn btn-ghost" onClick={() => go(4)}>
              ← Précédent
            </button>
            <button type="button" className="btn btn-primary" onClick={() => go(6)}>
              Suivant : vérifier et envoyer →
            </button>
          </div>
        </div>
      ) : null}

      {campaign && step === 6 ? (
        <div className="split">
          <section className="panel">
            <h3>Votre campagne</h3>
            <div className="recap small" style={{ marginTop: 10 }}>
              <div>
                <span className="muted">Titre</span>
                <span>{initial.title}</span>
              </div>
              <div>
                <span className="muted">Thème</span>
                <span>{initial.category}</span>
              </div>
              <div>
                <span className="muted">Objectif</span>
                <b className="num">{formatMoney(Number(initial.goal) || 0)}</b>
              </div>
              <div>
                <span className="muted">Durée de la collecte</span>
                <span>{plural(Number(initial.duration_days) || 0, "jour")}</span>
              </div>
              <div>
                <span className="muted">Contribution minimum · maximum</span>
                <span className="num">
                  {formatMoney(Number(initial.min_contribution) || 1)} · {initial.max_contribution ? formatMoney(Number(initial.max_contribution)) : "aucun"}
                </span>
              </div>
              <div>
                <span className="muted">Budget</span>
                <span>
                  {plural(initial.budget.length, "poste")} · {formatMoney(initial.budget.reduce((s, l) => s + (Number(l.amount) || 0), 0))}
                </span>
              </div>
              <div>
                <span className="muted">Photos · devis</span>
                <span>
                  {plural(photos.length, "photo")} · {plural(docs.length, "justificatif")}
                </span>
              </div>
            </div>
            {initial.milestones.length ? (
              <>
                <h4 style={{ margin: "16px 0 6px" }}>Jalons</h4>
                <ol className="small" style={{ paddingLeft: 18, display: "grid", gap: 4 }}>
                  {initial.milestones.map((m, i) => (
                    <li key={i}>
                      {m.label}
                      {m.target ? <span className="muted"> · {m.target}</span> : null}
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </section>
          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div className="panel" style={{ display: "grid", gap: 12 }}>
              <h3>Avant l&apos;envoi</h3>
              <div className="rules">
                <CheckRow ok={savedOk(1)} label="Le projet : titre, thème et description" onEdit={() => go(1)} />
                <CheckRow ok={savedOk(2)} label="L'objectif et la durée de la collecte" onEdit={() => go(2)} />
                <CheckRow ok={savedOk(3)} label="Le budget, égal à l'objectif" onEdit={() => go(3)} />
                <CheckRow ok={savedOk(4)} label="Au moins un jalon" onEdit={() => go(4)} />
                <CheckRow ok={photos.length > 0} label="Au moins une photo de la situation actuelle" onEdit={() => go(5)} />
                <CheckRow ok={hasDevis} label="Au moins un devis de fournisseur" onEdit={() => go(5)} />
              </div>
              {canSubmit ? (
                <ActionForm action={submitCampaignForReview} className="form">
                  <input type="hidden" name="campaign_id" value={campaign.id} />
                  <SubmitButton
                    pendingLabel="Envoi…"
                    confirm={`Envoyer la campagne à l'équipe Tribune ? Vous ne pourrez plus la modifier pendant la revue.${
                      publicationFee > 0 ? ` Si elle est publiée, ${formatMoney(publicationFee)} de frais d'instruction et de publication seront facturés au club.` : ""
                    }`}
                  >
                    {campaign.status === "changes_requested" ? "Renvoyer en revue" : "Envoyer en revue"}
                  </SubmitButton>
                </ActionForm>
              ) : (
                <>
                  <button type="button" className="btn btn-primary" disabled>
                    Envoyer en revue
                  </button>
                  <p className="small" style={{ color: "var(--bad)" }}>
                    {blocked ? "Le contrôle automatique signale un point bloquant (ci-dessous)." : "Complétez d'abord les points marqués « ! »."}
                  </p>
                </>
              )}
              <p className="small muted">
                L&apos;équipe Tribune vérifie que le projet est clair, faisable, cohérent et authentique, puis publie la campagne ou vous
                demande des corrections. Vous êtes prévenu ici et dans vos notifications.
              </p>
            </div>
            {report ? (
              <div className="panel">
                <h3>Contrôle automatique</h3>
                <ComplianceReportView report={report} />
              </div>
            ) : null}
            <FeesNotice publicationFee={publicationFee} />
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => go(5)}>
              ← Précédent
            </button>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

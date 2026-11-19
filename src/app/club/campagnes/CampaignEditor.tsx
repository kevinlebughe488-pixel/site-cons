"use client";

import { useActionState, useState } from "react";
import { saveCampaign } from "@/lib/actions/club";
import { FieldError, Flash, SubmitButton } from "@/components/forms";
import { formatDate, formatMoney } from "@/lib/format";
import { formatRatio, rateLine, suggestReference } from "@/lib/compliance";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_LIMITS, type PriceReference } from "@/lib/types";

/** Poste du budget. `manual` : l'article de référence a été choisi à la main (sinon il est suggéré d'après le libellé). */
type Line = { label: string; amount: string; quantity: string; reference_id: string; manual?: boolean };
type Step = { label: string; target: string };

export type EditorValues = {
  id?: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  goal: string;
  duration_days: string;
  min_contribution: string;
  max_contribution: string;
  budget: Line[];
  milestones: Step[];
};

function parse<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CampaignEditor({
  initial,
  today,
  publicationFee,
  references,
}: {
  initial: EditorValues;
  /** Référentiel des prix (articles actifs). */
  references: PriceReference[];
  /** Date du jour à Kinshasa (AAAA-MM-JJ), pour montrer la date de fin si la campagne était publiée aujourd'hui. */
  today: string;
  /** Frais d'instruction et de publication en vigueur (USD). */
  publicationFee: number;
}) {
  const [state, action] = useActionState(saveCampaign, {});
  const f = state.fields;
  const emptyLine: Line = { label: "", amount: "", quantity: "1", reference_id: "" };
  const [budget, setBudget] = useState<Line[]>(() =>
    (f ? parse(f.budget, initial.budget) : initial.budget.length ? initial.budget : [emptyLine]).map((l) => ({
      ...emptyLine,
      ...l,
      quantity: String(l.quantity || "1"),
      reference_id: l.reference_id ?? "",
      manual: true,
    })),
  );
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
  const [milestones, setMilestones] = useState<Step[]>(() =>
    f ? parse(f.milestones, initial.milestones) : initial.milestones.length ? initial.milestones : [{ label: "", target: "" }],
  );
  const [goal, setGoal] = useState(f?.goal ?? initial.goal);
  const [duration, setDuration] = useState(f?.duration_days ?? initial.duration_days);
  const total = budget.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = total === Number(goal) && total > 0;
  const days = Number(duration);
  const durationOk = Number.isInteger(days) && days >= CAMPAIGN_LIMITS.minDuration && days <= CAMPAIGN_LIMITS.maxDuration;
  const invalid = (name: string) => (state.field === name ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {});

  const update = <T,>(list: T[], set: (v: T[]) => void, i: number, patch: Partial<T>) =>
    set(list.map((item, j) => (j === i ? { ...item, ...patch } : item)));

  return (
    <form className="panel form" action={action} noValidate>
      <Flash state={state} />
      {initial.id ? <input type="hidden" name="campaign_id" value={initial.id} /> : null}
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

      <div className="field">
        <label htmlFor="title">Titre du projet</label>
        <input type="text" id="title" name="title" defaultValue={f?.title ?? initial.title} placeholder="Ex. : Construction d'un centre d'entraînement" {...invalid("title")} />
        <FieldError state={state} name="title" />
      </div>
      <div className="field">
        <label htmlFor="category">Thème</label>
        <select id="category" name="category" defaultValue={f?.category ?? initial.category}>
          {CAMPAIGN_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="summary">Résumé en une phrase</label>
        <input type="text" id="summary" name="summary" maxLength={300} defaultValue={f?.summary ?? initial.summary} />
        <div className="hint">Il apparaît sur la fiche de la campagne et dans les partages sur les réseaux sociaux.</div>
      </div>
      <div className="field">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          name="description"
          style={{ minHeight: 160 }}
          defaultValue={f?.description ?? initial.description}
          placeholder="Le problème, ce que vous allez faire, qui en profite. Laissez une ligne vide entre deux paragraphes."
        />
        <div className="hint">Au moins 80 caractères pour l&apos;envoi en revue.</div>
      </div>

      <fieldset>
        <legend>Objectif et conditions de la collecte</legend>
        <div className="two">
          <div className="field">
            <label htmlFor="goal">Objectif financier (USD)</label>
            <input type="number" id="goal" name="goal" min={100} step={1} value={goal} onChange={(e) => setGoal(e.target.value)} inputMode="numeric" {...invalid("goal")} />
            <FieldError state={state} name="goal" />
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
            <FieldError state={state} name="duration_days" />
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
              defaultValue={f?.min_contribution ?? initial.min_contribution}
              inputMode="numeric"
              {...invalid("min_contribution")}
            />
            <FieldError state={state} name="min_contribution" />
            <div className="hint">Un montant bas permet à plus de supporters de participer.</div>
          </div>
          <div className="field">
            <label htmlFor="max_contribution">
              Maximum par supporter (USD) <span className="muted">— facultatif</span>
            </label>
            <input
              type="number"
              id="max_contribution"
              name="max_contribution"
              min={1}
              step={1}
              defaultValue={f?.max_contribution ?? initial.max_contribution}
              placeholder="Aucun plafond"
              inputMode="numeric"
              {...invalid("max_contribution")}
            />
            <FieldError state={state} name="max_contribution" />
            <div className="hint">Plafond du total versé par un même supporter, si vous voulez une collecte très partagée.</div>
          </div>
        </div>
      </fieldset>

      <div className="field">
        <label>Budget détaillé</label>
        <p className="hint" style={{ marginTop: 0, marginBottom: 8 }}>
          Pour chaque poste, choisissez l&apos;article du référentiel et la quantité : le prix unitaire est comparé au prix
          normal. Un poste à 3 fois le prix de référence ou plus bloque l&apos;envoi.
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
                    update(budget, setBudget, i, line.manual ? { label } : { label, reference_id: auto?.id ?? "" });
                  }}
                />
                <label className="bl-ref">
                  <span>Article de référence</span>
                  <select
                    aria-label={`Article de référence du poste ${i + 1}`}
                    value={line.reference_id}
                    onChange={(e) => update(budget, setBudget, i, { reference_id: e.target.value, manual: true })}
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
                    onChange={(e) => update(budget, setBudget, i, { quantity: e.target.value })}
                  />
                </label>
                <label className="bl-amount">
                  <span>Montant total ($)</span>
                  <input
                    type="number"
                    aria-label={`Montant total du poste ${i + 1}`}
                    min={1}
                    value={line.amount}
                    onChange={(e) => update(budget, setBudget, i, { amount: e.target.value })}
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
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBudget([...budget, emptyLine])}>
            + Ajouter un poste
          </button>
          <span className="small num" style={{ color: balanced ? "var(--ok)" : "var(--warn)", fontWeight: 700 }}>
            Total : {formatMoney(total)} {balanced ? "= objectif ✓" : `· l'objectif est ${formatMoney(Number(goal) || 0)}`}
          </span>
        </div>
        {blocking ? (
          <p className="flash error" style={{ marginTop: 10, marginBottom: 0 }}>
            {blocking > 1 ? `${blocking} postes dépassent` : "Un poste dépasse"} 3 fois le prix de référence : la campagne ne pourra pas être
            envoyée en revue tant que le montant n&apos;est pas corrigé.
          </p>
        ) : null}
        <FieldError state={state} name="budget" />
      </div>

      <div className="field">
        <label>Jalons</label>
        <div className="rowlist">
          {milestones.map((m, i) => (
            <div className="budget-row ms" key={i}>
              <input
                type="text"
                aria-label={`Jalon ${i + 1}`}
                placeholder="Ex. : Commande passée au fournisseur"
                value={m.label}
                onChange={(e) => update(milestones, setMilestones, i, { label: e.target.value })}
              />
              <input
                type="text"
                aria-label={`Échéance du jalon ${i + 1}`}
                placeholder="Échéance (ex. : déc. 2026)"
                value={m.target}
                onChange={(e) => update(milestones, setMilestones, i, { target: e.target.value })}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setMilestones(milestones.filter((_, j) => j !== i))} aria-label="Retirer ce jalon">
                ✕
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => setMilestones([...milestones, { label: "", target: "" }])}>
          + Ajouter un jalon
        </button>
        <FieldError state={state} name="milestones" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <SubmitButton className="btn btn-ghost" name="intent" value="save">
          Enregistrer le brouillon
        </SubmitButton>
        <SubmitButton
          name="intent"
          value="submit"
          pendingLabel="Envoi…"
          confirm={`Envoyer la campagne à l'équipe Tribune ? Vous ne pourrez plus la modifier pendant la revue.${
            publicationFee > 0 ? ` Si elle est publiée, ${formatMoney(publicationFee)} de frais d'instruction et de publication seront facturés au club.` : ""
          }`}
        >
          Enregistrer et envoyer en revue
        </SubmitButton>
      </div>
    </form>
  );
}

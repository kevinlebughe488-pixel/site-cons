"use client";

import { useActionState, useState } from "react";
import { saveCampaign } from "@/lib/actions/club";
import { FieldError, Flash, SubmitButton } from "@/components/forms";
import { formatDate, formatMoney } from "@/lib/format";
import { CAMPAIGN_CATEGORIES, CAMPAIGN_LIMITS } from "@/lib/types";

type Line = { label: string; amount: string };
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
}: {
  initial: EditorValues;
  /** Date du jour à Kinshasa (AAAA-MM-JJ), pour montrer la date de fin si la campagne était publiée aujourd'hui. */
  today: string;
  /** Frais d'instruction et de publication en vigueur (USD). */
  publicationFee: number;
}) {
  const [state, action] = useActionState(saveCampaign, {});
  const f = state.fields;
  const [budget, setBudget] = useState<Line[]>(() =>
    f ? parse(f.budget, initial.budget) : initial.budget.length ? initial.budget : [{ label: "", amount: "" }],
  );
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
      <input type="hidden" name="budget" value={JSON.stringify(budget.filter((l) => l.label.trim() || l.amount))} />
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
        <div className="rowlist">
          {budget.map((line, i) => (
            <div className="budget-row" key={i}>
              <input
                type="text"
                aria-label={`Poste ${i + 1}`}
                placeholder="Poste (ex. : Maillots, 40 pièces)"
                value={line.label}
                onChange={(e) => update(budget, setBudget, i, { label: e.target.value })}
              />
              <input
                type="number"
                aria-label={`Montant du poste ${i + 1}`}
                placeholder="Montant"
                min={1}
                value={line.amount}
                onChange={(e) => update(budget, setBudget, i, { amount: e.target.value })}
              />
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBudget(budget.filter((_, j) => j !== i))} aria-label="Retirer ce poste">
                ✕
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setBudget([...budget, { label: "", amount: "" }])}>
            + Ajouter un poste
          </button>
          <span className="small num" style={{ color: balanced ? "var(--ok)" : "var(--warn)", fontWeight: 700 }}>
            Total : {formatMoney(total)} {balanced ? "= objectif ✓" : `· l'objectif est ${formatMoney(Number(goal) || 0)}`}
          </span>
        </div>
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

"use client";

import { useActionState, useState } from "react";
import { saveCampaign } from "@/lib/actions/club";
import { Flash, SubmitButton } from "@/components/forms";
import { formatMoney } from "@/lib/format";
import { CAMPAIGN_CATEGORIES } from "@/lib/types";

type Line = { label: string; amount: string };
type Step = { label: string; target: string };

export type EditorValues = {
  id?: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  goal: string;
  end_date: string;
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

export function CampaignEditor({
  initial,
  minDate,
  maxDate,
  publicationFee,
}: {
  initial: EditorValues;
  minDate: string;
  maxDate: string;
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
  const total = budget.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const balanced = total === Number(goal) && total > 0;

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
        <input type="text" id="title" name="title" defaultValue={f?.title ?? initial.title} placeholder="Ex. : Tenues pour l'équipe U17" />
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor="category">Thème</label>
          <select id="category" name="category" defaultValue={f?.category ?? initial.category}>
            {CAMPAIGN_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="end_date">Date de clôture</label>
          <input type="date" id="end_date" name="end_date" min={minDate} max={maxDate} defaultValue={f?.end_date ?? initial.end_date} />
          <div className="hint">Entre 2 et 10 semaines après l&apos;envoi en revue.</div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="summary">Résumé en une phrase</label>
        <input type="text" id="summary" name="summary" maxLength={300} defaultValue={f?.summary ?? initial.summary} />
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
      <div className="field">
        <label htmlFor="goal">Objectif (USD)</label>
        <input type="number" id="goal" name="goal" min={100} step={1} value={goal} onChange={(e) => setGoal(e.target.value)} />
      </div>

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

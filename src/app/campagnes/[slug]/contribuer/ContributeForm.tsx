"use client";

import { useState } from "react";
import Link from "next/link";
import { contribute } from "@/lib/actions/contribute";
import { Flash, SubmitButton, useFormAction } from "@/components/forms";
import { COMMISSION_RATE, formatMoney, KYC_THRESHOLD, round2 } from "@/lib/format";
import { DRC_PROVIDERS, guessProvider } from "@/lib/payments/providers";
import { normalizeDrcPhone } from "@/lib/phone";
import type { KycStatus } from "@/lib/types";

const PRESETS = [5, 10, 25, 50, 100, 250];
/** Plafond d'une contribution, fixé par la plateforme (en plus du plafond éventuel de la campagne). */
const MAX_PER_PAYMENT = 5000;

type Props = {
  campaignSlug: string;
  currency: "USD" | "CDF";
  defaultPhone: string;
  cumulative: number;
  kycStatus: KycStatus;
  simulation: boolean;
  /** Contribution minimum fixée par le club. */
  minAmount: number;
  /** Ce que le supporter peut encore verser à cette campagne (null : pas de plafond). */
  remaining: number | null;
  /** Déjà versé par le supporter à cette campagne. */
  alreadyGiven: number;
};

export function ContributeForm({ campaignSlug, currency, defaultPhone, cumulative, kycStatus, simulation, minAmount, remaining, alreadyGiven }: Props) {
  const { state, formProps } = useFormAction(contribute);
  const f = state.fields ?? {};
  const ceiling = Math.min(MAX_PER_PAYMENT, remaining ?? MAX_PER_PAYMENT);
  const presets = PRESETS.filter((v) => v >= minAmount && v <= ceiling).slice(0, 5);
  const suggested = presets.includes(25) ? 25 : (presets[0] ?? minAmount);
  const [amount, setAmount] = useState(f.amount || String(suggested));
  const [phone, setPhone] = useState(f.phone || defaultPhone);
  const [provider, setProvider] = useState(f.provider || guessProvider(normalizeDrcPhone(defaultPhone)) || DRC_PROVIDERS[0].code);

  const value = Math.max(0, Number(amount.replace(",", ".")) || 0);
  const fee = round2(value * COMMISSION_RATE);
  const needsId = kycStatus === "none" && cumulative + value > KYC_THRESHOLD;

  function onPhoneChange(next: string) {
    setPhone(next);
    const guessed = guessProvider(normalizeDrcPhone(next));
    if (guessed) setProvider(guessed);
  }

  return (
    <div className="split">
      <form className="form panel" {...formProps} noValidate>
        <Flash state={state} />
        <input type="hidden" name="campaign" value={campaignSlug} />
        <div className="field">
          <label htmlFor="amount">Montant ({currency})</label>
          <div className="chips">
            {presets.map((v) => (
              <button key={v} type="button" className="chip" aria-pressed={value === v} onClick={() => setAmount(String(v))}>
                {formatMoney(v, currency)}
              </button>
            ))}
          </div>
          <input
            type="number"
            id="amount"
            name="amount"
            min={minAmount}
            max={ceiling}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{ marginTop: 10 }}
            inputMode="numeric"
          />
          <div className="hint">
            Montant entier, au moins {formatMoney(minAmount, currency)} (minimum fixé par le club)
            {remaining !== null
              ? `, au plus ${formatMoney(ceiling, currency)} : maximum par supporter pour cette campagne${alreadyGiven > 0 ? `, dont ${formatMoney(alreadyGiven, currency)} déjà versés` : ""}.`
              : "."}
          </div>
          {value > 0 && value < minAmount ? (
            <div className="hint field-error">Le minimum pour cette campagne est de {formatMoney(minAmount, currency)}.</div>
          ) : value > ceiling ? (
            <div className="hint field-error">Le maximum possible ici est de {formatMoney(ceiling, currency)}.</div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="phone">Numéro Mobile Money à débiter</label>
          <input type="tel" id="phone" name="phone" value={phone} onChange={(e) => onPhoneChange(e.target.value)} placeholder="081 234 5678" autoComplete="tel" />
          <div className="hint">Vous recevrez la demande de paiement sur ce téléphone.</div>
        </div>

        <div className="field">
          <label>Opérateur</label>
          <div className="pay">
            {DRC_PROVIDERS.map((p) => (
              <label key={p.code}>
                <input type="radio" name="provider" value={p.code} checked={provider === p.code} onChange={() => setProvider(p.code)} />
                <span>
                  <b>{p.label}</b>
                  <br />
                  <span className="small muted">Numéros 0{p.prefixes.join(", 0")}…</span>
                </span>
                <span className="tag">Mobile Money</span>
              </label>
            ))}
          </div>
        </div>

        {needsId ? (
          <>
            <div className="note warn">
              <b className="ic">!</b>
              <span>
                <b>Vérification d&apos;identité requise.</b> Avec ce montant, votre cumul dépasse {formatMoney(KYC_THRESHOLD)}.
                La pièce reste confidentielle : seule l&apos;équipe conformité la consulte.
              </span>
            </div>
            <div className="two">
              <div className="field">
                <label htmlFor="doc_type">Type de pièce</label>
                <select id="doc_type" name="doc_type" defaultValue={f.doc_type || "carte_electeur"}>
                  <option value="carte_electeur">Carte d&apos;électeur</option>
                  <option value="passeport">Passeport</option>
                  <option value="permis">Permis de conduire</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="doc_number">Numéro de la pièce</label>
                <input type="text" id="doc_number" name="doc_number" autoComplete="off" defaultValue={f.doc_number} />
                <div className="hint">Seuls les 4 derniers caractères sont conservés.</div>
              </div>
            </div>
          </>
        ) : null}

        <label className="check">
          <input type="checkbox" name="anonymous" />
          <span>Ne pas afficher mon nom sur la page publique. Vous restez identifié auprès de Tribune.</span>
        </label>
        <label className="check">
          <input type="checkbox" name="rules" />
          <span>
            J&apos;ai lu les <Link href="/comment-ca-marche">règles</Link> : tout ou rien, commission de 5 %, remboursement si
            l&apos;objectif n&apos;est pas atteint.
          </span>
        </label>
        <SubmitButton pendingLabel="Envoi de la demande de paiement…">Payer {formatMoney(value, currency)} par Mobile Money</SubmitButton>
        <p className="small muted">
          Vous validerez le paiement sur votre téléphone avec votre code secret. Tribune ne voit jamais ce code.
        </p>
      </form>
      <aside className="side">
        <div className="panel">
          <h3>Récapitulatif</h3>
          <div className="recap num">
            <div>
              <span>Votre contribution</span>
              <b>{formatMoney(value, currency)}</b>
            </div>
            <div>
              <span>Commission Tribune (5 %)</span>
              <span>− {formatMoney(fee, currency)}</span>
            </div>
            <div className="tot">
              <span>Reçu par le club</span>
              <span>{formatMoney(round2(value - fee), currency)}</span>
            </div>
            <div className="small muted">
              <span>Débité sur votre téléphone</span>
              <span>{formatMoney(value, currency)}</span>
            </div>
          </div>
        </div>
        <div className="note info">
          <b className="ic">i</b>
          <span>
            Votre cumul enregistré : <b className="num">{formatMoney(cumulative)}</b>.{" "}
            {kycStatus === "none"
              ? `Au-delà de ${formatMoney(KYC_THRESHOLD)} cumulés, une pièce d'identité est demandée.`
              : kycStatus === "pending"
                ? "Votre pièce d'identité est en cours de vérification."
                : kycStatus === "verified"
                  ? "Votre identité est vérifiée."
                  : "Votre pièce d'identité a été refusée : contactez l'équipe Tribune."}
          </span>
        </div>
        {simulation ? (
          <div className="note warn">
            <b className="ic">!</b>
            <span>
              <b>Mode simulation.</b> Aucun argent ne sera débité. Le paiement est confirmé au bout de 5 secondes, sauf
              pour un numéro qui se termine par 0000 (échec simulé).
            </span>
          </div>
        ) : null}
      </aside>
    </div>
  );
}

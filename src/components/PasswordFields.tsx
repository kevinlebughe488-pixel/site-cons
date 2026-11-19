"use client";

import { useState } from "react";
import { FieldError } from "@/components/forms";
import type { FormState } from "@/lib/forms";

/** Champ mot de passe avec bouton « Afficher ». */
export function PasswordInput({
  id,
  label,
  autoComplete,
  state,
  value,
  onChange,
}: {
  id: string;
  label: string;
  autoComplete: "current-password" | "new-password";
  state: FormState;
  value?: string;
  onChange?: (v: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="pw">
        <input
          type={visible ? "text" : "password"}
          id={id}
          name={id}
          autoComplete={autoComplete}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          aria-invalid={state.field === id || undefined}
          aria-describedby={state.field === id ? `${id}-error` : undefined}
          maxLength={72}
          required
        />
        <button type="button" className="pw-toggle" onClick={() => setVisible(!visible)} aria-pressed={visible} aria-controls={id}>
          {visible ? "Masquer" : "Afficher"}
        </button>
      </div>
      <FieldError state={state} name={id} />
    </div>
  );
}

/** Nouveau mot de passe + confirmation, avec les règles cochées au fil de la saisie. */
export function NewPasswordFields({ state, current }: { state: FormState; current?: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const rules = [
    { ok: password.length >= 10, label: "10 caractères au moins" },
    { ok: /\d/.test(password) && /[a-zA-Z]/.test(password), label: "des lettres et des chiffres" },
    ...(current !== undefined ? [{ ok: password.length > 0 && password !== current, label: "différent de l'actuel" }] : []),
    { ok: confirm.length > 0 && confirm === password, label: "les deux saisies sont identiques" },
  ];
  return (
    <>
      <PasswordInput id="password" label="Nouveau mot de passe" autoComplete="new-password" state={state} value={password} onChange={setPassword} />
      <PasswordInput id="password_confirm" label="Confirmez le nouveau mot de passe" autoComplete="new-password" state={state} value={confirm} onChange={setConfirm} />
      <ul className="pw-rules" aria-label="Règles du mot de passe">
        {rules.map((r) => (
          <li key={r.label} className={r.ok ? "ok" : ""}>
            <span aria-hidden="true">{r.ok ? "✓" : "•"}</span> {r.label}
          </li>
        ))}
      </ul>
    </>
  );
}

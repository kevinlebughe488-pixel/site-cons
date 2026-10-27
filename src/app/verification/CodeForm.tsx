"use client";

import { useActionState } from "react";
import { verifyCode } from "@/lib/actions/auth";
import { FieldError, Flash, SubmitButton } from "@/components/forms";

export function CodeForm() {
  const [state, action] = useActionState(verifyCode, {});
  return (
    <form className="form" action={action} noValidate>
      <Flash state={state} />
      <div className="field">
        <label htmlFor="code">Code reçu par SMS</label>
        <input
          type="text"
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="123456"
          className="code-input"
          aria-invalid={state.field === "code" || undefined}
          autoFocus
          required
        />
        <FieldError state={state} name="code" />
      </div>
      <SubmitButton pendingLabel="Vérification…">Valider le code</SubmitButton>
    </form>
  );
}

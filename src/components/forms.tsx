"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  className = "btn btn-primary",
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      name={name}
      value={value}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

export function Flash({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p className="flash error" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p className="flash success" role="status">
        {state.success}
      </p>
    );
  }
  return null;
}

/**
 * Formulaire branché sur une action serveur, avec message de retour.
 * Pour les formulaires simples (décisions, boutons d'action).
 */
export function ActionForm({
  action,
  children,
  className = "form",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      <Flash state={state} />
      {children}
    </form>
  );
}

"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/forms";

export function SubmitButton({
  children,
  pendingLabel = "Enregistrement…",
  className = "btn btn-primary",
  name,
  value,
  confirm,
  disabled = false,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending || disabled}
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
  // Le message apparaît en haut du formulaire : on l'amène à l'écran, sinon
  // la personne qui vient de cliquer en bas de page croit que rien ne s'est passé.
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error || state.success) ref.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [state]);
  if (state.error) {
    return (
      <p ref={ref} className="flash error" role="alert">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p ref={ref} className="flash success" role="status">
        {state.success}
      </p>
    );
  }
  return null;
}

/**
 * Identité prouvée : chargement complet de la page qui ouvre la session (pas une
 * navigation interne), en remplaçant la page de connexion dans l'historique. Le
 * navigateur oublie ainsi les pages affichées avant, avec un autre compte ou sans compte.
 */
export function SessionRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);
  return (
    <p className="flash success" role="status">
      Connexion en cours… <a href={to}>Continuer</a>
    </p>
  );
}

/** Message d'erreur affiché sous le champ concerné. */
export function FieldError({ state, name }: { state: FormState; name: string }) {
  if (state.field !== name || !state.error) return null;
  return (
    <div className="hint field-error" id={`${name}-error`}>
      {state.error}
    </div>
  );
}

type ServerAction = (state: FormState, form: FormData) => Promise<FormState>;

/**
 * Branche un formulaire sur une action serveur SANS l'effacer quand elle échoue.
 *
 * Laissé à lui-même, React vide les champs d'un formulaire après chaque envoi,
 * même refusé : une case oubliée faisait retaper le mot de passe. Ici l'envoi
 * passe par onSubmit : les champs gardent ce qui a été saisi, l'état « envoi
 * en cours » (useFormStatus) fonctionne toujours, et le formulaire n'est vidé
 * qu'après un succès quand `resetOnSuccess` est demandé (commentaire publié,
 * fichier envoyé…).
 */
export function useFormAction(action: ServerAction, { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = useActionState(async (previous: FormState, data: FormData) => {
    const result = await action(previous, data);
    if (resetOnSuccess && result.success && !result.error) formRef.current?.reset();
    return result;
  }, {});

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Envoi déjà bloqué (par exemple un fichier obligatoire manquant) : rien à faire.
    if (event.nativeEvent.defaultPrevented) return;
    event.preventDefault();
    const form = event.currentTarget;
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const data = new FormData(form, submitter);
    // Navigateurs qui ignorent le bouton d'envoi dans FormData : on l'ajoute (ex. « decision »).
    if (submitter?.name && !data.has(submitter.name)) data.append(submitter.name, submitter.value);
    startTransition(() => dispatch(data));
  }

  return { state, pending, formProps: { ref: formRef, action: dispatch, onSubmit } };
}

/**
 * Formulaire branché sur une action serveur, avec message de retour.
 * Pour les formulaires simples (décisions, boutons d'action). Les champs restent
 * remplis après une erreur ; ils sont vidés après un succès.
 */
export function ActionForm({
  action,
  children,
  className = "form",
}: {
  action: ServerAction;
  children: React.ReactNode;
  className?: string;
}) {
  const { state, formProps } = useFormAction(action, { resetOnSuccess: true });
  return (
    <form {...formProps} className={className}>
      <Flash state={state} />
      {children}
    </form>
  );
}

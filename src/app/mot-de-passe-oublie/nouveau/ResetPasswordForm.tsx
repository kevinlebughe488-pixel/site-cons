"use client";

import { useActionState } from "react";
import { resetPassword } from "@/lib/actions/auth";
import { Flash, SubmitButton } from "@/components/forms";
import { NewPasswordFields } from "@/components/PasswordFields";

export function ResetPasswordForm() {
  const [state, action] = useActionState(resetPassword, {});
  return (
    <form className="panel form" action={action} noValidate>
      <Flash state={state.field ? {} : state} />
      <NewPasswordFields state={state} />
      <SubmitButton>Enregistrer le nouveau mot de passe</SubmitButton>
    </form>
  );
}

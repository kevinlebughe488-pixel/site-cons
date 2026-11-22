"use client";

import { resetPassword } from "@/lib/actions/auth";
import { Flash, SubmitButton, useFormAction } from "@/components/forms";
import { NewPasswordFields } from "@/components/PasswordFields";

export function ResetPasswordForm() {
  const { state, formProps } = useFormAction(resetPassword);
  return (
    <form className="panel form" {...formProps} noValidate>
      <Flash state={state.field ? {} : state} />
      <NewPasswordFields state={state} />
      <SubmitButton>Enregistrer le nouveau mot de passe</SubmitButton>
    </form>
  );
}

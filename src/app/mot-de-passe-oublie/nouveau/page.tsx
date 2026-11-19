import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { passwordResetGrant } from "@/lib/verification";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

/** Après le code SMS « mot de passe oublié » : choisir un nouveau mot de passe, sans l'ancien. */
export default async function ResetPasswordPage() {
  const [viewer, granted] = await Promise.all([getViewer(), passwordResetGrant()]);
  const allowed = !!viewer && granted === viewer.profile.id;
  return (
    <div className="wrap page" style={{ maxWidth: 520 }}>
      <h1 className="page-title">Choisir un nouveau mot de passe</h1>
      {allowed ? (
        <>
          <p className="muted" style={{ marginBottom: 20 }}>
            Code vérifié. Choisissez votre nouveau mot de passe : vous avez 15 minutes.
          </p>
          <ResetPasswordForm />
        </>
      ) : (
        <div className="panel">
          <p style={{ marginBottom: 14 }}>Ce lien a expiré ou n&apos;est valable qu&apos;après un code reçu par SMS.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/mot-de-passe-oublie">
              Recevoir un nouveau code
            </Link>
            {viewer ? (
              <Link className="btn btn-ghost" href="/compte/mot-de-passe">
                Je connais mon mot de passe actuel
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

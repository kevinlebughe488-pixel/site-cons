import type { Metadata } from "next";
import Link from "next/link";
import { requireViewer } from "@/lib/auth";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata: Metadata = { title: "Modifier mon mot de passe" };

export default async function ChangePasswordPage() {
  await requireViewer("/compte/mot-de-passe");
  return (
    <div className="wrap page" style={{ maxWidth: 520 }}>
      <div className="crumbs muted">
        <Link href="/compte">← Mon compte</Link>
      </div>
      <h1 className="page-title">Modifier mon mot de passe</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Par sécurité, confirmez d&apos;abord votre mot de passe actuel.
      </p>
      <ChangePasswordForm />
    </div>
  );
}

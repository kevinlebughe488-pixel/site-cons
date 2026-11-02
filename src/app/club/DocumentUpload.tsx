"use client";

import { useActionState, useState } from "react";
import { uploadClubDocument } from "@/lib/actions/club";
import { Flash, SubmitButton } from "@/components/forms";
import { FileField } from "@/components/FileField";
import { CLUB_DOCUMENT_KINDS, type ClubDocumentKind } from "@/lib/types";

/** Ajout d'une pièce au dossier d'un club (PDF ou photo, allégée avant l'envoi). */
export function DocumentUpload({ clubId, suggested = "statuts" }: { clubId: string; suggested?: ClubDocumentKind }) {
  const [state, action] = useActionState(uploadClubDocument, {});
  const [busy, setBusy] = useState(false);
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <Flash state={state} />
      <input type="hidden" name="club_id" value={clubId} />
      <div className="field">
        <label htmlFor={`kind-${clubId}`}>Type de document</label>
        <select id={`kind-${clubId}`} name="kind" defaultValue={suggested}>
          {CLUB_DOCUMENT_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <FileField
        id={`file-${clubId}`}
        name="file"
        label="Fichier"
        hint="PDF ou photo lisible (JPEG, PNG, WebP), 4 Mo au plus. Une photo prise au téléphone est allégée automatiquement."
        accept="application/pdf,image/jpeg,image/png,image/webp"
        maxSide={2000}
        maxBytes={4 * 1024 * 1024}
        onBusy={setBusy}
      />
      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…" disabled={busy}>
        Ajouter au dossier
      </SubmitButton>
    </form>
  );
}

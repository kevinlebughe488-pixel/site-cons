"use client";

import { useActionState } from "react";
import { uploadClubDocument } from "@/lib/actions/club";
import { Flash } from "@/components/forms";
import { FileField } from "@/components/FileField";
import { CLUB_DOCUMENT_KINDS, type ClubDocumentKind } from "@/lib/types";

/**
 * Ajout d'une pièce au dossier d'un club (PDF ou photo, allégée avant l'envoi).
 * Le fichier part dès qu'il est choisi : pas de bouton « Ajouter » à oublier.
 *
 * - `kind` : type imposé (pas de liste) ;
 * - `kinds` : types proposés dans la liste (par défaut, tous) ;
 * - `required` : la pièce est exigée pour envoyer le dossier (astérisque).
 */
export function DocumentUpload({
  clubId,
  suggested = "statuts",
  kind,
  kinds,
  label = "Fichier",
  hint = "PDF ou photo lisible (JPEG, PNG, WebP), 4 Mo au plus. Une photo prise au téléphone est allégée automatiquement.",
  required = true,
}: {
  clubId: string;
  suggested?: ClubDocumentKind;
  kind?: ClubDocumentKind;
  kinds?: readonly ClubDocumentKind[];
  label?: string;
  hint?: string;
  required?: boolean;
}) {
  const [state, action] = useActionState(uploadClubDocument, {});
  const options = CLUB_DOCUMENT_KINDS.filter((k) => !kinds || kinds.includes(k.id));
  const id = `${clubId}-${kind ?? "choix"}`;
  return (
    <form action={action} className="form" style={{ gap: 12 }}>
      <Flash state={state} />
      <input type="hidden" name="club_id" value={clubId} />
      {kind ? (
        <input type="hidden" name="kind" value={kind} />
      ) : (
        <div className="field">
          <label htmlFor={`kind-${id}`}>Type de document</label>
          <select id={`kind-${id}`} name="kind" defaultValue={options.some((k) => k.id === suggested) ? suggested : options[0]?.id}>
            {options.map((k) => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </div>
      )}
      <FileField
        id={`file-${id}`}
        name="file"
        label={label}
        hint={hint}
        accept="application/pdf,image/jpeg,image/png,image/webp"
        maxSide={2000}
        maxBytes={4 * 1024 * 1024}
        required={required}
        autoSubmit
      />
    </form>
  );
}

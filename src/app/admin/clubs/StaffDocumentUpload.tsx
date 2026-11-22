"use client";

import { useActionState, useState } from "react";
import { addClubDocument } from "@/lib/actions/admin";
import { Flash, SubmitButton } from "@/components/forms";
import { formatBytes } from "@/lib/images";
import { CLUB_DOCUMENT_MAX_BYTES } from "@/lib/club-dossier";
import { CLUB_DOCUMENT_KINDS } from "@/lib/types";

/**
 * Ajout, par l'équipe Tribune, d'une pièce reçue du club en dehors du site.
 * Un seul formulaire : type, fichier, puis bouton d'envoi (actif dès qu'un
 * fichier valable est choisi) ; le fichier choisi est rappelé au-dessus du bouton.
 */
export function StaffDocumentUpload({ clubId }: { clubId: string }) {
  const [state, action] = useActionState(addClubDocument, {});
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);

  const tooBig = !!file && file.size > CLUB_DOCUMENT_MAX_BYTES;
  return (
    // Après un envoi réussi, React vide le formulaire (événement « reset ») : le rappel du fichier aussi.
    <form action={action} className="form bo-upload" onReset={() => setFile(null)}>
      <Flash state={state} />
      <input type="hidden" name="club_id" value={clubId} />
      <div className="field">
        <label htmlFor={`kind-${clubId}`}>Type de document</label>
        <select id={`kind-${clubId}`} name="kind" required defaultValue="">
          <option value="" disabled>
            Choisir le type…
          </option>
          {CLUB_DOCUMENT_KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor={`file-${clubId}`}>Fichier</label>
        <input
          type="file"
          id={`file-${clubId}`}
          name="file"
          required
          accept="application/pdf,image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const f = e.currentTarget.files?.[0];
            setFile(f ? { name: f.name, size: f.size } : null);
          }}
        />
        <div className={`hint${tooBig ? " field-error" : ""}`}>
          {tooBig
            ? `Fichier trop lourd (${formatBytes(file.size)}) : 4 Mo au plus. Réduisez-le avant de l'ajouter.`
            : file
              ? `Fichier choisi : ${file.name} (${formatBytes(file.size)}). Cliquez sur « Ajouter au dossier » pour l'envoyer.`
              : "PDF ou image (JPEG, PNG, WebP), 4 Mo au plus."}
        </div>
      </div>
      <div>
        <SubmitButton className="btn btn-primary btn-sm" pendingLabel="Envoi…" disabled={!file || tooBig}>
          Ajouter au dossier
        </SubmitButton>
      </div>
    </form>
  );
}

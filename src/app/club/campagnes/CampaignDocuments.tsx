"use client";

import { useState } from "react";
import { deleteCampaignDocument, uploadCampaignDocument } from "@/lib/actions/club";
import { ActionForm, Flash, SubmitButton, useFormAction } from "@/components/forms";
import { FileField } from "@/components/FileField";
import { formatBytes } from "@/lib/images";
import { formatDate } from "@/lib/format";
import { CAMPAIGN_DOCUMENT_KINDS, type CampaignDocument } from "@/lib/types";

const KIND_LABELS = Object.fromEntries(CAMPAIGN_DOCUMENT_KINDS.map((k) => [k.id, k.label]));

/** Devis des fournisseurs : liste (lien de lecture privé) et ajout tant que le dossier est modifiable. */
export function CampaignDocuments({
  campaignId,
  documents,
  editable,
  removable = false,
}: {
  campaignId: string;
  documents: CampaignDocument[];
  editable: boolean;
  /** Équipe Tribune : peut retirer un devis (modération), sans en ajouter. */
  removable?: boolean;
}) {
  const { state, formProps } = useFormAction(uploadCampaignDocument, { resetOnSuccess: true });
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {documents.length ? (
        <ul className="doclist">
          {documents.map((d) => (
            <li key={d.id}>
              <span className="ic" aria-hidden="true">
                {d.mime_type === "application/pdf" ? "PDF" : "IMG"}
              </span>
              <span style={{ minWidth: 0 }}>
                <a href={`/club/campagnes/justificatifs/${d.id}`} target="_blank" rel="noopener">
                  {KIND_LABELS[d.kind]}
                  {d.supplier ? ` · ${d.supplier}` : ""}
                </a>
                <span className="small muted" style={{ display: "block", overflowWrap: "anywhere" }}>
                  {d.file_name} · {formatBytes(d.size_bytes)} · {formatDate(d.created_at)}
                </span>
              </span>
              {editable || removable ? (
                <ActionForm action={deleteCampaignDocument} className="inline-form">
                  <input type="hidden" name="document_id" value={d.id} />
                  <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Retirer ce justificatif ?">
                    Retirer
                  </SubmitButton>
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="small muted">Aucun devis pour le moment. Au moins un est exigé pour envoyer la campagne en revue.</p>
      )}
      {editable ? (
        <form {...formProps} className="form" style={{ gap: 12 }}>
          <Flash state={state} />
          <input type="hidden" name="campaign_id" value={campaignId} />
          <p className="small muted" style={{ margin: 0 }}>
            Indiquez le fournisseur, puis choisissez le fichier : il est envoyé aussitôt.
          </p>
          <div className="two">
          <div className="field">
            <label htmlFor={`dkind-${campaignId}`}>Type</label>
            <select id={`dkind-${campaignId}`} name="kind" defaultValue="devis">
              {CAMPAIGN_DOCUMENT_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor={`dsup-${campaignId}`}>Fournisseur</label>
            <input type="text" id={`dsup-${campaignId}`} name="supplier" maxLength={120} placeholder="Nom et ville du fournisseur" />
          </div>
          </div>
          <FileField
            id={`dfile-${campaignId}`}
            name="file"
            label="Devis ou facture pro forma"
            hint="PDF ou photo lisible, 4 Mo au plus."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            maxSide={2000}
            maxBytes={4 * 1024 * 1024}
            onBusy={setBusy}
            autoSubmit
          />
          {/* Le fichier part dès qu'il est choisi ; ce bouton sert si l'envoi a dû attendre (légende manquante, erreur). */}
          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…" disabled={busy}>
            Envoyer le devis
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

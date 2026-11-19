"use client";

import { useActionState, useState } from "react";
import { deleteCampaignDocument, uploadCampaignDocument } from "@/lib/actions/club";
import { ActionForm, Flash, SubmitButton } from "@/components/forms";
import { FileField } from "@/components/FileField";
import { formatBytes } from "@/lib/images";
import { formatDate } from "@/lib/format";
import { CAMPAIGN_DOCUMENT_KINDS, type CampaignDocument } from "@/lib/types";

const KIND_LABELS = Object.fromEntries(CAMPAIGN_DOCUMENT_KINDS.map((k) => [k.id, k.label]));

/** Devis des fournisseurs : liste (lien de lecture privé) et ajout tant que le dossier est modifiable. */
export function CampaignDocuments({ campaignId, documents, editable }: { campaignId: string; documents: CampaignDocument[]; editable: boolean }) {
  const [state, action] = useActionState(uploadCampaignDocument, {});
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
              {editable ? (
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
        <form action={action} className="form" style={{ gap: 12 }}>
          <Flash state={state} />
          <input type="hidden" name="campaign_id" value={campaignId} />
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
          <FileField
            id={`dfile-${campaignId}`}
            name="file"
            label="Fichier"
            hint="PDF ou photo lisible du devis, 4 Mo au plus."
            accept="application/pdf,image/jpeg,image/png,image/webp"
            maxSide={2000}
            maxBytes={4 * 1024 * 1024}
            onBusy={setBusy}
          />
          <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="Envoi…" disabled={busy}>
            Ajouter le justificatif
          </SubmitButton>
        </form>
      ) : null}
    </div>
  );
}

import { deleteClubDocument } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { PAYOUT_METHOD_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/images";
import { maskPhone } from "@/lib/phone";
import { providerLabel } from "@/lib/payments/providers";
import { CLUB_DOCUMENT_KINDS, type ClubDocument, type ClubPrivate } from "@/lib/types";

// Morceaux partagés par les pages de l'espace club.

const KIND_LABEL = Object.fromEntries(CLUB_DOCUMENT_KINDS.map((k) => [k.id, k.label]));

/** Compte de versement, masqué : seuls les derniers chiffres apparaissent. */
export function PayoutSummary({ priv }: { priv: ClubPrivate | null }) {
  if (!priv) return <p className="small muted">Aucun compte de versement enregistré.</p>;
  return (
    <div className="recap small">
      <div>
        <span className="muted">Type</span>
        <span>{PAYOUT_METHOD_LABELS[priv.payout_method]}</span>
      </div>
      <div>
        <span className="muted">Titulaire</span>
        <span>{priv.payout_holder || "—"}</span>
      </div>
      {priv.payout_method === "bank" ? (
        <div>
          <span className="muted">{priv.bank_name ?? "Banque"}</span>
          <span className="num">•••• {priv.bank_account?.slice(-4)}</span>
        </div>
      ) : (
        <div>
          <span className="muted">{priv.payout_provider ? providerLabel(priv.payout_provider) : "Numéro"}</span>
          <span className="num">{maskPhone(priv.payout_phone)}</span>
        </div>
      )}
    </div>
  );
}

export function DocumentList({ docs, editable }: { docs: ClubDocument[]; editable: boolean }) {
  if (!docs.length) return <p className="small muted">Aucun document pour l&apos;instant.</p>;
  return (
    <ul className="doclist">
      {docs.map((d) => (
        <li key={d.id}>
          <span className="ic" aria-hidden="true">
            {d.mime_type === "application/pdf" ? "PDF" : "IMG"}
          </span>
          <span style={{ minWidth: 0 }}>
            <a href={`/club/documents/${d.id}`} target="_blank" rel="noopener">
              {KIND_LABEL[d.kind] ?? d.kind}
            </a>
            <span className="small muted" style={{ display: "block", overflowWrap: "anywhere" }}>
              {d.file_name} · {formatBytes(d.size_bytes)} · {formatDate(d.created_at)}
            </span>
          </span>
          {editable ? (
            <ActionForm action={deleteClubDocument} className="inline-form">
              <input type="hidden" name="document_id" value={d.id} />
              <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Retirer ce document du dossier ?">
                Retirer
              </SubmitButton>
            </ActionForm>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function Check({ ok, label, optional }: { ok: boolean; label: string; optional?: boolean }) {
  return (
    <div>
      <span className="ck" style={{ color: ok ? "var(--ok)" : optional ? "var(--muted)" : "var(--warn)" }}>{ok ? "✓" : optional ? "○" : "!"}</span>
      <span>
        {label}
        {optional ? <span className="muted"> (conseillé)</span> : null}
      </span>
    </div>
  );
}

import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { savePriceReference } from "@/lib/actions/admin";
import { listPriceReferences } from "@/lib/campaigns";
import { ActionForm, SubmitButton } from "@/components/forms";
import { Pill } from "@/components/visuals";
import { formatDate, formatMoney } from "@/lib/format";
import { BLOCK_RATIO, WARN_RATIO, formatRatio } from "@/lib/compliance";
import { CAMPAIGN_CATEGORIES, type PriceReference } from "@/lib/types";

export const metadata: Metadata = { title: "Référentiel des prix · Back-office" };

function ReferenceFields({ r }: { r?: PriceReference }) {
  const key = r?.id ?? "new";
  return (
    <>
      {r ? <input type="hidden" name="id" value={r.id} /> : null}
      <div className="field">
        <label htmlFor={`label-${key}`}>Article ou service</label>
        <input type="text" id={`label-${key}`} name="label" defaultValue={r?.label} maxLength={120} placeholder="Ex. : Maillot de match" required />
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor={`category-${key}`}>Thème</label>
          <select id={`category-${key}`} name="category" defaultValue={r?.category ?? "Équipement"}>
            {CAMPAIGN_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`active-${key}`}>Statut</label>
          <select id={`active-${key}`} name="active" defaultValue={r && !r.active ? "off" : "on"}>
            <option value="on">Utilisé pour le contrôle</option>
            <option value="off">Retiré du référentiel</option>
          </select>
        </div>
      </div>
      <div className="two">
        <div className="field">
          <label htmlFor={`price-${key}`}>Prix normal (USD)</label>
          <input type="number" id={`price-${key}`} name="unit_price" min={0.01} step="0.01" defaultValue={r ? Number(r.unit_price) : undefined} required />
        </div>
        <div className="field">
          <label htmlFor={`unit-${key}`}>Par</label>
          <input type="text" id={`unit-${key}`} name="unit" defaultValue={r?.unit} maxLength={30} placeholder="pièce, paire, m², jour…" required />
        </div>
      </div>
      <div className="field">
        <label htmlFor={`keywords-${key}`}>Mots-clés</label>
        <input type="text" id={`keywords-${key}`} name="keywords" defaultValue={r?.keywords.join(", ")} placeholder="maillot, vareuse" />
        <div className="hint">Séparés par des virgules. Ils rapprochent un poste du budget de cet article quand le club n&apos;a rien choisi.</div>
      </div>
      <div className="field">
        <label htmlFor={`source-${key}`}>Source du prix</label>
        <input type="text" id={`source-${key}`} name="source" defaultValue={r?.source} maxLength={300} placeholder="Ex. : 3 devis reçus à Kinshasa, nov. 2026" required />
      </div>
    </>
  );
}

export default async function PriceReferencesPage() {
  await requirePermission("campaign:review", "/admin/prix");
  const refs = await listPriceReferences(await createClient(), true);
  const toConfirm = refs.filter((r) => r.active && !r.confirmed_at).length;

  return (
    <>
      <h2>Référentiel des prix</h2>
      <p className="muted" style={{ margin: "8px 0 16px", maxWidth: "60em" }}>
        Le prix normal de chaque article sert au contrôle automatique des budgets. Un poste à {formatRatio(BLOCK_RATIO)} fois ce prix ou
        plus bloque l&apos;envoi et la publication ; à {formatRatio(WARN_RATIO)} fois, il est signalé. Un prix « à confirmer » signale
        sans bloquer : enregistrez-le après vérification pour le confirmer. Chaque changement est inscrit au journal d&apos;audit.
      </p>
      {toConfirm ? (
        <p className="flash info">
          {toConfirm} prix de départ à confirmer : ce sont des valeurs indicatives, vérifiez-les avant qu&apos;elles ne servent à bloquer.
        </p>
      ) : null}

      <details className="panel" style={{ marginBottom: 20 }}>
        <summary style={{ fontWeight: 700, cursor: "pointer" }}>+ Ajouter un article</summary>
        <ActionForm action={savePriceReference} className="form" key="new">
          <ReferenceFields />
          <SubmitButton className="btn btn-primary btn-sm">Ajouter au référentiel</SubmitButton>
        </ActionForm>
      </details>

      <div className="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th>Prix normal</th>
              <th>Source</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {refs.map((r) => (
              <tr key={r.id} style={r.active ? undefined : { opacity: 0.6 }}>
                <td>
                  <b>{r.label}</b>
                  <div className="small muted">
                    {r.category}
                    {r.keywords.length ? ` · ${r.keywords.join(", ")}` : ""}
                  </div>
                  <details style={{ marginTop: 6 }}>
                    <summary className="small" style={{ cursor: "pointer" }}>
                      Modifier ou confirmer
                    </summary>
                    <ActionForm action={savePriceReference} className="form">
                      <ReferenceFields r={r} />
                      <SubmitButton className="btn btn-primary btn-sm">Enregistrer et confirmer</SubmitButton>
                    </ActionForm>
                  </details>
                </td>
                <td className="num" style={{ whiteSpace: "nowrap" }}>
                  {formatMoney(r.unit_price)} / {r.unit}
                </td>
                <td className="small">{r.source}</td>
                <td>
                  {!r.active ? (
                    <Pill tone="muted">Retiré</Pill>
                  ) : r.confirmed_at ? (
                    <Pill tone="ok">Confirmé le {formatDate(r.confirmed_at)}</Pill>
                  ) : (
                    <Pill tone="warn">À confirmer</Pill>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

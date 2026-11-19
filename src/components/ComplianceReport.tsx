import { formatMoney, formatDate } from "@/lib/format";
import { formatRatio, LEVEL_LABELS, LEVEL_TONES, type ComplianceReport } from "@/lib/compliance";
import { Pill } from "@/components/visuals";

const ICONS = { ok: "✓", warn: "!", block: "✕" } as const;
const SUMMARY = {
  ok: "Aucun point à signaler.",
  warn: "Des points sont à vérifier, sans bloquer.",
  block: "Au moins un point bloque l'envoi et la publication.",
} as const;

/** Contrôle automatique d'une campagne : points de contrôle, puis (équipe) le détail des prix poste par poste. */
export function ComplianceReportView({ report, showLines = false }: { report: ComplianceReport; showLines?: boolean }) {
  return (
    <div className="compliance">
      <div className="compliance-head">
        <Pill tone={LEVEL_TONES[report.level]}>{LEVEL_LABELS[report.level]}</Pill>
        <span className="small muted">
          {SUMMARY[report.level]} Calculé le {formatDate(report.checked_at, true)}.
        </span>
      </div>
      <ul className="checks">
        {report.checks.map((c) => (
          <li key={c.id} className={`lvl-${c.level}`}>
            <span className="ic" aria-hidden="true">
              {ICONS[c.level]}
            </span>
            <div>
              <b>{c.label}</b>
              <span className="small">{c.detail}</span>
            </div>
          </li>
        ))}
      </ul>
      {showLines && report.lines.length ? (
        <div className="tbl-wrap" style={{ marginTop: 14 }}>
          <table className="small num">
            <thead>
              <tr>
                <th>Poste</th>
                <th>Qté</th>
                <th>Prix unitaire</th>
                <th>Référence</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {report.lines.map((l) => (
                <tr key={l.position}>
                  <td>{l.label}</td>
                  <td>{Number(l.quantity).toLocaleString("fr-FR")}</td>
                  <td>{formatMoney(l.unit_price)}</td>
                  <td>
                    {l.reference_label ? (
                      <>
                        {l.reference_label} · {formatMoney(Number(l.reference_price))} / {l.reference_unit}
                        <div className="muted">
                          {l.matched === "choisi" ? "choisi par le club" : "rapproché par mots-clés"}
                          {l.reference_confirmed ? "" : " · prix à confirmer"}
                        </div>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <Pill tone={LEVEL_TONES[l.level]}>
                      {l.ratio === null ? LEVEL_LABELS.unknown : `${formatRatio(l.ratio)} ×`}
                    </Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

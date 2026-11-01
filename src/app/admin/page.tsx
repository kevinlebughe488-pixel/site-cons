import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { updateSettings } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { currentPlanPeriod } from "@/lib/plan";
import { getSettings } from "@/lib/settings";
import type { PublicationFee } from "@/lib/types";

export const metadata: Metadata = { title: "Back-office" };

const WEEKS = 8;

async function loadDashboard() {
  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - WEEKS * 7 * 86_400_000).toISOString();

  const count = (table: string, column: string, values: string[]) =>
    supabase.from(table).select("id", { count: "exact", head: true }).in(column, values);

  const settings = await getSettings(supabase);
  const period = currentPlanPeriod(settings.launch_date);

  const [stats, inReview, pendingClubs, kycPending, pendingUpdates, failed7d, recent, indicators, unpaidFees, reported] = await Promise.all([
    supabase.rpc("platform_stats").single<{ total_raised: number; supporters: number; funded_campaigns: number; active_campaigns: number }>(),
    count("campaigns", "status", ["in_review"]),
    count("clubs", "status", ["pending"]),
    count("profiles", "kyc_status", ["pending"]),
    count("campaign_updates", "status", ["pending"]),
    supabase
      .from("contributions")
      .select("id", { count: "exact", head: true })
      .eq("status", "failed")
      .gt("created_at", new Date(now - 7 * 86_400_000).toISOString()),
    supabase.from("contributions").select("amount, completed_at").eq("status", "completed").gt("completed_at", since).limit(5000),
    supabase
      .rpc("plan_indicators", { p_from: period.from.toISOString(), p_to: period.to.toISOString() })
      .single<{ published: number; funded: number; failed: number; funded_raised: number; commissions: number; fees_invoiced: number; fees_paid: number }>(),
    supabase
      .from("publication_fees")
      .select("campaign_id, amount, currency, invoiced_at, campaign:campaigns(title, club:clubs(name))")
      .is("paid_at", null)
      .order("invoiced_at", { ascending: true })
      .limit(50),
    supabase.from("campaign_comments").select("id", { count: "exact", head: true }).eq("status", "visible").gt("report_count", 0),
  ]);

  // Collecte par semaine (8 dernières semaines).
  const buckets = Array.from({ length: WEEKS }, () => 0);
  for (const row of (recent.data ?? []) as { amount: number; completed_at: string }[]) {
    const weeksAgo = Math.floor((now - new Date(row.completed_at).getTime()) / (7 * 86_400_000));
    if (weeksAgo >= 0 && weeksAgo < WEEKS) buckets[WEEKS - 1 - weeksAgo] += Number(row.amount);
  }
  type Unpaid = Pick<PublicationFee, "campaign_id" | "amount" | "currency" | "invoiced_at"> & {
    campaign: { title: string; club: { name: string } | null } | null;
  };
  return {
    stats, inReview, pendingClubs, kycPending, pendingUpdates, failed7d, buckets, reported,
    settings, period, indicators: indicators.data, unpaid: (unpaidFees.data ?? []) as unknown as Unpaid[],
  };
}

/** Réalisé et objectif côte à côte, avec le taux d'atteinte. */
function PlanRow({ label, actual, target, format }: { label: string; actual: number; target: number; format: (n: number) => string }) {
  const ratio = target ? Math.round((actual / target) * 100) : 0;
  return (
    <tr>
      <td>{label}</td>
      <td className="r num">
        <b>{format(actual)}</b>
      </td>
      <td className="r num">{format(target)}</td>
      <td className="r num" style={{ color: ratio >= 100 ? "var(--ok)" : "var(--muted)" }}>
        {ratio} %
      </td>
    </tr>
  );
}

export default async function AdminDashboard() {
  const { profile } = await requirePermission("backoffice:access", "/admin");
  const { stats, inReview, pendingClubs, kycPending, pendingUpdates, failed7d, buckets, reported, settings, period, indicators, unpaid } =
    await loadDashboard();
  const max = Math.max(100, ...buckets);
  const W = 560;
  const H = 180;
  const s = stats.data;

  const todo = [
    { n: inReview.count ?? 0, label: "campagne(s) à instruire", href: "/admin/campagnes?statut=in_review" },
    { n: pendingClubs.count ?? 0, label: "club(s) à vérifier", href: "/admin/clubs" },
    { n: kycPending.count ?? 0, label: "identité(s) à vérifier", href: "/admin/utilisateurs?kyc=pending" },
    { n: pendingUpdates.count ?? 0, label: "nouvelle(s) et message(s) à relire", href: "/admin/nouvelles" },
    { n: reported.count ?? 0, label: "commentaire(s) signalé(s)", href: "/admin/commentaires" },
    { n: unpaid.length, label: "frais de publication à encaisser", href: "/admin#frais" },
  ];

  // Indicateurs du plan d'affaires (§ 11.9) sur l'année du plan en cours.
  const t = period.target;
  const ind = indicators;
  const closed = Number(ind?.funded ?? 0) + Number(ind?.failed ?? 0);
  const successRate = closed ? Number(ind?.funded ?? 0) / closed : 0;
  const averageRaised = Number(ind?.funded ?? 0) ? Number(ind?.funded_raised ?? 0) / Number(ind?.funded) : 0;
  const revenue = Number(ind?.commissions ?? 0) + Number(ind?.fees_invoiced ?? 0);
  const usd = (n: number) => formatMoney(Math.round(n));
  const pct = (n: number) => `${Math.round(n * 100)} %`;

  return (
    <>
      <h2>Tableau de bord</h2>
      <p className="muted">Chiffres en direct depuis la base de données.</p>
      <div className="kpis">
        <div className="kpi">
          <div className="l">Collecté (confirmé)</div>
          <div className="v num">{formatMoney(s?.total_raised ?? 0)}</div>
          <div className="d">toutes campagnes</div>
        </div>
        <div className="kpi">
          <div className="l">Supporters contributeurs</div>
          <div className="v num">{s?.supporters ?? 0}</div>
          <div className="d">au moins une contribution confirmée</div>
        </div>
        <div className="kpi">
          <div className="l">Campagnes en cours</div>
          <div className="v num">{s?.active_campaigns ?? 0}</div>
          <div className="d">{s?.funded_campaigns ?? 0} financée(s) au total</div>
        </div>
        <div className={`kpi ${(failed7d.count ?? 0) > 0 ? "alert" : ""}`}>
          <div className="l">Paiements échoués (7 j)</div>
          <div className="v num">{failed7d.count ?? 0}</div>
          <div className="d">
            <Link href="/admin/transactions?statut=failed">voir le détail</Link>
          </div>
        </div>
      </div>

      <div className="split half" style={{ marginBottom: 20 }}>
        <div className="panel">
          <h3>À traiter</h3>
          <ul className="log">
            {todo.map((t) => (
              <li key={t.href}>
                <b className="num" style={{ color: t.n ? "var(--bad)" : "var(--muted)" }}>
                  {t.n}
                </b>
                <Link href={t.href}>{t.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="panel">
          <h3>Collecte par semaine</h3>
          <div style={{ overflowX: "auto" }}>
            <svg className="chart" viewBox={`0 0 ${W} ${H + 30}`} width="100%" style={{ minWidth: 380, maxWidth: W }} role="img" aria-label="Collecte confirmée des 8 dernières semaines">
              {[0, max / 2, max].map((v) => {
                const y = 10 + H - (v / max) * H;
                return (
                  <g key={v}>
                    <line className="g" x1="54" x2={W} y1={y} y2={y} />
                    <text x="48" y={y + 4} textAnchor="end">
                      {formatNumber(Math.round(v))} $
                    </text>
                  </g>
                );
              })}
              {buckets.map((v, i) => {
                const h = (v / max) * H;
                const x = 70 + i * 60;
                return (
                  <g key={i}>
                    <rect className={`b ${i === WEEKS - 1 ? "last" : ""}`} x={x} y={10 + H - h} width={40} height={h} rx="3" />
                    <text x={x + 20} y={H + 26} textAnchor="middle">
                      {i === WEEKS - 1 ? "cette sem." : `S-${WEEKS - 1 - i}`}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 20 }}>
        <h3>Plan d&apos;affaires · année {t.year}</h3>
        <p className="small muted" style={{ marginBottom: 12 }}>
          {period.dated
            ? `Du ${formatDate(period.from.toISOString())} au ${formatDate(new Date(period.to.getTime() - 86_400_000).toISOString())}${period.beyond ? " (au-delà de l'horizon de trois ans du plan : comparaison avec l'année 3)" : ""}.`
            : settings.launch_date
              ? `Lancement prévu le ${formatDate(settings.launch_date)} : en attendant, chiffres depuis le début, comparés à l'année 1.`
              : "Date de lancement non renseignée : chiffres depuis le début, comparés à l'année 1."}{" "}
          Objectifs du plan d&apos;affaires de Plumes Capital pour le financement participatif.
        </p>
        {ind ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Indicateur</th>
                  <th className="r">Réalisé</th>
                  <th className="r">Plan</th>
                  <th className="r">Atteint</th>
                </tr>
              </thead>
              <tbody>
                <PlanRow label="Campagnes publiées" actual={Number(ind.published)} target={t.published} format={(n) => String(n)} />
                <PlanRow label={`Taux de succès des collectes (${closed} clôturée(s))`} actual={successRate} target={t.successRate} format={pct} />
                <PlanRow label="Montant moyen par campagne financée" actual={averageRaised} target={t.averageRaised} format={usd} />
                <PlanRow label="Montants collectés (campagnes financées)" actual={Number(ind.funded_raised)} target={t.raised} format={usd} />
                <PlanRow label="Commissions de 5 %" actual={Number(ind.commissions)} target={t.commissions} format={usd} />
                <PlanRow label={`Frais d'instruction facturés (dont ${usd(Number(ind.fees_paid))} encaissés)`} actual={Number(ind.fees_invoiced)} target={t.fees} format={usd} />
                <PlanRow label="Chiffre d'affaires" actual={revenue} target={t.revenue} format={usd} />
              </tbody>
            </table>
          </div>
        ) : (
          <p className="flash error">Indicateurs indisponibles : la migration « plan d&apos;affaires » est-elle appliquée ?</p>
        )}
      </div>

      <div className="split half">
        <div className="panel" id="frais">
          <h3>Frais de publication à encaisser</h3>
          {unpaid.length ? (
            <ul className="log">
              {unpaid.map((f) => (
                <li key={f.campaign_id}>
                  <b className="num">{formatMoney(f.amount, f.currency)}</b>
                  <span>
                    <Link href={`/admin/campagnes/${f.campaign_id}#frais`}>{f.campaign?.title ?? "Campagne"}</Link>
                    <span className="small muted">
                      {" "}
                      · {f.campaign?.club?.name} · facturés le {formatDate(f.invoiced_at)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="small muted">Aucun frais en attente de règlement.</p>
          )}
        </div>
        <div className="panel">
          <h3>Tarifs et lancement</h3>
          {settings.publication_fee !== t.publicationFee ? (
            <p className="flash info">
              Le plan d&apos;affaires prévoit {formatMoney(t.publicationFee)} de frais par campagne publiée en année {t.year}.
            </p>
          ) : null}
          {can(profile.role, "settings:update") ? (
            <ActionForm action={updateSettings}>
              <div className="two">
                <div className="field">
                  <label htmlFor="publication_fee">Frais d&apos;instruction et de publication (USD)</label>
                  <input type="number" id="publication_fee" name="publication_fee" min={0} max={10000} step={1} defaultValue={settings.publication_fee} />
                  <div className="hint">Par campagne publiée. Plan : 400 $ en année 1, 500 $ ensuite.</div>
                </div>
                <div className="field">
                  <label htmlFor="launch_date">Début de l&apos;année 1</label>
                  <input type="date" id="launch_date" name="launch_date" defaultValue={settings.launch_date ?? ""} />
                  <div className="hint">Date de lancement public de la plateforme.</div>
                </div>
              </div>
              <SubmitButton className="btn btn-ghost btn-sm">Enregistrer les réglages</SubmitButton>
            </ActionForm>
          ) : (
            <div className="recap small">
              <div>
                <span className="muted">Frais d&apos;instruction et de publication</span>
                <b className="num">{formatMoney(settings.publication_fee)}</b>
              </div>
              <div>
                <span className="muted">Début de l&apos;année 1</span>
                <span>{formatDate(settings.launch_date)}</span>
              </div>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>Commission sur les fonds collectés : 5 %, prélevée seulement si l&apos;objectif est atteint.</p>
        </div>
      </div>
    </>
  );
}

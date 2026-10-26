import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Back-office" };

const WEEKS = 8;

async function loadDashboard() {
  const supabase = await createClient();
  const now = Date.now();
  const since = new Date(now - WEEKS * 7 * 86_400_000).toISOString();

  const count = (table: string, column: string, values: string[]) =>
    supabase.from(table).select("id", { count: "exact", head: true }).in(column, values);

  const [stats, inReview, pendingClubs, kycPending, pendingUpdates, failed7d, recent] = await Promise.all([
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
  ]);

  // Collecte par semaine (8 dernières semaines).
  const buckets = Array.from({ length: WEEKS }, () => 0);
  for (const row of (recent.data ?? []) as { amount: number; completed_at: string }[]) {
    const weeksAgo = Math.floor((now - new Date(row.completed_at).getTime()) / (7 * 86_400_000));
    if (weeksAgo >= 0 && weeksAgo < WEEKS) buckets[WEEKS - 1 - weeksAgo] += Number(row.amount);
  }
  return { stats, inReview, pendingClubs, kycPending, pendingUpdates, failed7d, buckets };
}

export default async function AdminDashboard() {
  await requirePermission("backoffice:access", "/admin");
  const { stats, inReview, pendingClubs, kycPending, pendingUpdates, failed7d, buckets } = await loadDashboard();
  const max = Math.max(100, ...buckets);
  const W = 560;
  const H = 180;
  const s = stats.data;

  const todo = [
    { n: inReview.count ?? 0, label: "campagne(s) à instruire", href: "/admin/campagnes?statut=in_review" },
    { n: pendingClubs.count ?? 0, label: "club(s) à vérifier", href: "/admin/clubs" },
    { n: kycPending.count ?? 0, label: "identité(s) à vérifier", href: "/admin/utilisateurs?kyc=pending" },
    { n: pendingUpdates.count ?? 0, label: "nouvelle(s) à relire", href: "/admin/nouvelles" },
  ];

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
                      {Math.round(v).toLocaleString("fr-FR")} $
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
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { can, isStaff } from "@/lib/rbac";
import { CAMPAIGN_WITH_CLUB } from "@/lib/campaigns";
import { CampaignPill, Crest, FieldSvg, ProgressBar } from "@/components/visuals";
import { daysLeft, formatDate, formatMoney, percent } from "@/lib/format";
import type { BudgetLine, CampaignUpdate, CampaignWithClub, Milestone } from "@/lib/types";

type Detail = CampaignWithClub & {
  budget: BudgetLine[];
  milestones: Milestone[];
  updates: CampaignUpdate[];
};

async function loadCampaign(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(
      `${CAMPAIGN_WITH_CLUB}, budget:campaign_budget_lines(id, position, label, amount),
       milestones:campaign_milestones(id, position, label, target_label, done_at, proof_note),
       updates:campaign_updates(id, campaign_id, title, body, status, created_at, published_at)`,
    )
    .eq("slug", slug)
    .maybeSingle<Detail>();
  return { supabase, campaign: data };
}

export async function generateMetadata(props: PageProps<"/campagnes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { campaign } = await loadCampaign(slug);
  return { title: campaign?.title ?? "Campagne" };
}

export default async function CampaignPage(props: PageProps<"/campagnes/[slug]">) {
  const { slug } = await props.params;
  const [{ supabase, campaign: c }, viewer] = await Promise.all([loadCampaign(slug), getViewer()]);
  if (!c) notFound();

  const { data: registry } = await supabase.rpc("campaign_public_contributions", { p_campaign_id: c.id, p_limit: 20 });
  const rows = (registry ?? []) as { completed_at: string; supporter: string; amount: number; currency: string }[];

  const budget = [...c.budget].sort((a, b) => a.position - b.position);
  const milestones = [...c.milestones].sort((a, b) => a.position - b.position);
  const updates = c.updates
    .filter((u) => u.status === "published")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const done = milestones.filter((m) => m.done_at).length;
  const left = daysLeft(c.end_date);
  const open = c.status === "published" && left > 0;
  const role = viewer?.profile.role;
  const isMember = viewer?.club?.id === c.club_id;
  const p = percent(c.raised_amount, c.goal_amount);

  return (
    <>
      <div className="camp-hero on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="crumbs">
            <Link href="/campagnes">Campagnes</Link> / {c.category}
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Crest club={c.club} size={52} />
            <div>
              <div style={{ fontWeight: 700 }}>{c.club.name}</div>
              <div className="small" style={{ opacity: 0.8 }}>
                {[c.club.commune, c.club.city].filter(Boolean).join(", ")}
                {c.club.founded_year ? ` · fondé en ${c.club.founded_year}` : ""} · club vérifié
              </div>
            </div>
          </div>
          <h1 style={{ marginTop: 16, fontSize: "clamp(2rem,4.6vw,3.2rem)", maxWidth: "22ch" }}>{c.title}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <CampaignPill status={c.status} />
            <span className="tag" style={{ color: "var(--on-pitch)", borderColor: "var(--pitch-line)" }}>
              Don
            </span>
            <span className="tag" style={{ color: "var(--on-pitch)", borderColor: "var(--pitch-line)" }}>
              {c.published_at ? `Du ${formatDate(c.published_at)} au ${formatDate(c.end_date)}` : `Clôture prévue le ${formatDate(c.end_date)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="wrap camp-layout">
        <div>
          {!["published", "funded", "failed"].includes(c.status) ? (
            <p className="flash info">
              Cette campagne n&apos;est pas publique ({c.status === "suspended" ? "suspendue" : "en préparation"}). Vous la
              voyez parce que vous gérez ce club ou faites partie de l&apos;équipe Tribune.
            </p>
          ) : null}
          <nav className="subnav" aria-label="Sections de la campagne">
            <a href="#projet">Le projet</a>
            <a href="#budget">Budget</a>
            <a href="#jalons">Jalons et preuves</a>
            <a href="#nouvelles">Nouvelles ({updates.length})</a>
            <a href="#registre">Registre ({rows.length})</a>
            <a href="#regles">Règles</a>
          </nav>

          <div className="block" id="projet">
            <h2>Le projet</h2>
            {c.summary ? <p><b>{c.summary}</b></p> : null}
            {c.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          <div className="block" id="budget">
            <h2>À quoi sert l&apos;argent</h2>
            <div className="alloc">
              {budget.map((b) => (
                <div key={b.id} className="row num">
                  <span>{b.label}</span>
                  <b>{formatMoney(b.amount, c.currency)}</b>
                  <div className="bar">
                    <i style={{ width: `${Math.round((Number(b.amount) / Number(c.goal_amount)) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="row num" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                <b>Total du budget = objectif</b>
                <b>{formatMoney(c.goal_amount, c.currency)}</b>
              </div>
            </div>
            <p className="small muted" style={{ marginTop: 12 }}>
              Le budget a été vérifié par l&apos;équipe Tribune avant publication.
            </p>
          </div>

          <div className="block" id="jalons">
            <h2>Jalons et preuves</h2>
            {milestones.length ? (
              <>
                <p className="muted" style={{ marginBottom: 16 }}>
                  {done} jalon{done > 1 ? "s" : ""} sur {milestones.length} atteint{done > 1 ? "s" : ""}. Le club reçoit
                  l&apos;argent par tranche, après la preuve de chaque jalon.
                </p>
                <ol className="steps">
                  {milestones.map((m, i) => {
                    const now = !m.done_at && (i === 0 || !!milestones[i - 1].done_at);
                    return (
                      <li key={m.id} className={m.done_at ? "done" : now ? "now" : ""}>
                        <span className="dot">{m.done_at ? "✓" : i + 1}</span>
                        <div>
                          <b>{m.label}</b>
                          <span className="small muted">
                            {m.done_at ? `Preuve publiée le ${formatDate(m.done_at)} : ${m.proof_note}` : now ? "Étape en cours" : "À venir"}
                          </span>
                        </div>
                        <span className="when">{m.target_label}</span>
                      </li>
                    );
                  })}
                </ol>
              </>
            ) : (
              <p className="muted">Les jalons seront publiés à l&apos;ouverture de la campagne.</p>
            )}
          </div>

          <div className="block" id="nouvelles">
            <h2>Nouvelles du club</h2>
            {updates.length ? (
              updates.map((u) => (
                <div className="update" key={u.id}>
                  <span className="small muted">{formatDate(u.published_at)} · publiée après revue Tribune</span>
                  <h4>{u.title}</h4>
                  <p style={{ whiteSpace: "pre-line" }}>{u.body}</p>
                </div>
              ))
            ) : (
              <p className="muted">Pas encore de nouvelle.</p>
            )}
          </div>

          <div className="block" id="registre">
            <h2>Registre des contributions</h2>
            <p className="muted" style={{ marginBottom: 14 }}>
              Chaque contribution est rattachée à un supporter inscrit et identifié. Les noms sont abrégés ici ;
              l&apos;identité complète est conservée par l&apos;équipe Tribune.
            </p>
            {rows.length ? (
              <div className="tbl-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Supporter</th>
                      <th className="r">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="num small" style={{ whiteSpace: "nowrap" }}>
                          {formatDate(r.completed_at, true)}
                        </td>
                        <td>{r.supporter}</td>
                        <td className="r num">
                          <b>{formatMoney(r.amount, r.currency)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="panel empty">
                <p>
                  <b>Aucune contribution confirmée pour l&apos;instant.</b>
                </p>
                {open ? <p className="small muted">Soyez le premier à soutenir ce projet.</p> : null}
              </div>
            )}
          </div>

          <div className="block" id="regles">
            <h2>Les règles de cette campagne</h2>
            <div className="rules">
              <div>
                <span className="ck">✓</span>
                <span>
                  <b>Tout ou rien.</b> Si l&apos;objectif n&apos;est pas atteint le {formatDate(c.end_date)}, chaque
                  supporter est remboursé sur son compte Mobile Money.
                </span>
              </div>
              <div>
                <span className="ck">✓</span>
                <span>
                  <b>Commission unique de 5 %</b> sur les fonds collectés. Aucun autre frais pour le supporter.
                </span>
              </div>
              <div>
                <span className="ck">✓</span>
                <span>
                  <b>Versement par tranches</b> au club, jalon par jalon, après vérification des justificatifs.
                </span>
              </div>
              <div>
                <span className="ck">✓</span>
                <span>
                  <b>Suspension possible</b> de la campagne en cas de doute sérieux, avec information des supporters.
                </span>
              </div>
            </div>
          </div>
        </div>

        <aside className="side">
          <div className="panel">
            <div className="big num">{formatMoney(c.raised_amount, c.currency)}</div>
            <p className="muted num" style={{ margin: "4px 0 12px" }}>
              collectés sur un objectif de {formatMoney(c.goal_amount, c.currency)}
            </p>
            <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
            <div className="split3 num" style={{ marginTop: 16, textAlign: "center" }}>
              <div>
                <div className="big" style={{ fontSize: "1.6rem" }}>
                  {p} %
                </div>
                <div className="small muted">atteints</div>
              </div>
              <div>
                <div className="big" style={{ fontSize: "1.6rem" }}>
                  {c.backers_count}
                </div>
                <div className="small muted">supporters</div>
              </div>
              <div>
                <div className="big" style={{ fontSize: "1.6rem" }}>
                  {c.status === "published" ? left : 0}
                </div>
                <div className="small muted">jours restants</div>
              </div>
            </div>
            {open && viewer && !can(role, "contribution:create") ? (
              <p className="small muted" style={{ marginTop: 16 }}>
                Les contributions sont réservées aux comptes supporters.
              </p>
            ) : open ? (
              <>
                <Link className="btn btn-primary" style={{ width: "100%", marginTop: 18 }} href={`/campagnes/${c.slug}/contribuer`}>
                  Contribuer
                </Link>
                <p className="small muted" style={{ marginTop: 10, textAlign: "center" }}>
                  M-Pesa · Airtel Money · Orange Money — remboursé si l&apos;objectif n&apos;est pas atteint
                </p>
              </>
            ) : (
              <p className="small" style={{ marginTop: 16 }}>
                <b>
                  {c.status === "funded"
                    ? "Campagne financée et clôturée."
                    : c.status === "failed"
                      ? "Objectif non atteint : les supporters sont remboursés."
                      : c.status === "published"
                        ? "La collecte est terminée, la clôture est en cours."
                        : "Les contributions ne sont pas ouvertes."}
                </b>
              </p>
            )}
          </div>
          {isMember ? (
            <div className="panel">
              <h4 style={{ marginBottom: 8 }}>Vous gérez ce club</h4>
              <Link className="btn btn-ghost btn-sm" href={`/club/campagnes/${c.id}`}>
                Gérer la campagne
              </Link>
            </div>
          ) : null}
          {isStaff(role) ? (
            <div className="panel">
              <h4 style={{ marginBottom: 8 }}>Équipe Tribune</h4>
              <Link className="btn btn-ghost btn-sm" href={`/admin/campagnes/${c.id}`}>
                Ouvrir dans le back-office
              </Link>
            </div>
          ) : null}
          {!isMember && !isStaff(role) && (can(role, "contribution:create") || !viewer) ? (
            <div className="panel">
              <h4 style={{ marginBottom: 8 }}>Un problème avec cette campagne ?</h4>
              <p className="small muted">
                Écrivez à l&apos;équipe Tribune en indiquant le nom de la campagne. Chaque signalement est lu sous 48 h.
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}

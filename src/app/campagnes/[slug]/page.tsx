import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/auth";
import { can, isStaff } from "@/lib/rbac";
import { env } from "@/lib/env";
import { CAMPAIGN_WITH_CLUB } from "@/lib/campaigns";
import { CampaignStatusBadge, coverUrl, Crest, FieldSvg, ProgressBar } from "@/components/visuals";
import { ShareButtons } from "@/components/ShareButtons";
import { campaignTiming, daysLeft, formatDate, formatMoney, formatNumber, percent, plural } from "@/lib/format";
import type { BudgetLine, CampaignUpdate, CampaignWithClub, CommentRow, Milestone } from "@/lib/types";
import { Comments } from "./Comments";

type Detail = CampaignWithClub & {
  budget: BudgetLine[];
  milestones: Milestone[];
  updates: CampaignUpdate[];
};

// Mis en cache pour la requête : le titre de la page et la page elle-même partagent la même lecture.
const loadCampaign = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("campaigns")
    .select(
      `${CAMPAIGN_WITH_CLUB}, budget:campaign_budget_lines(id, position, label, amount),
       milestones:campaign_milestones(id, position, label, target_label, done_at, proof_note),
       updates:campaign_updates(id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at)`,
    )
    .eq("slug", slug)
    .maybeSingle<Detail>();
  return { supabase, campaign: data };
});

export async function generateMetadata(props: PageProps<"/campagnes/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const { campaign: c } = await loadCampaign(slug);
  if (!c) return { title: "Campagne" };
  const description =
    c.summary ||
    `${c.club.name} collecte ${formatMoney(c.goal_amount, c.currency)} pour ce projet. Contribuez par Mobile Money et suivez chaque dollar.`;
  // Aperçu de partage : la photo du projet (JPEG allégé à l'envoi, assez léger pour WhatsApp),
  // sinon une image aux couleurs du club générée par /campagnes/<slug>/image-partage.
  const image = c.cover_path
    ? { url: coverUrl(c.cover_path), alt: `Photo du projet : ${c.title}` }
    : { url: `/campagnes/${c.slug}/image-partage`, width: 1200, height: 630, alt: `${c.club.name} · ${c.title}` };
  return {
    title: c.title,
    description,
    openGraph: { title: `${c.club.name} · ${c.title}`, description, type: "website", siteName: "Tribune", locale: "fr_FR", images: [image] },
    twitter: { card: "summary_large_image", title: `${c.club.name} · ${c.title}`, description, images: [image.url] },
  };
}

export default async function CampaignPage(props: PageProps<"/campagnes/[slug]">) {
  const { slug } = await props.params;
  const [{ supabase, campaign: c }, viewer] = await Promise.all([loadCampaign(slug), getViewer()]);
  if (!c) notFound();

  const [{ data: registry }, { data: commentData }] = await Promise.all([
    supabase.rpc("campaign_public_contributions", { p_campaign_id: c.id, p_limit: 20 }),
    supabase.rpc("campaign_comments_feed", { p_campaign_id: c.id }),
  ]);
  const rows = (registry ?? []) as { completed_at: string; supporter: string; amount: number; currency: string }[];
  const comments = (commentData ?? []) as CommentRow[];

  const budget = [...c.budget].sort((a, b) => a.position - b.position);
  const milestones = [...c.milestones].sort((a, b) => a.position - b.position);
  // Nouvelles publiques et, pour un contributeur, messages qui lui sont réservés (la base filtre).
  const updates = c.updates
    .filter((u) => u.status === "published")
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const done = milestones.filter((m) => m.done_at).length;
  const left = daysLeft(c.end_date);
  const open = c.status === "published" && left > 0;
  const isPublic = ["published", "funded", "failed"].includes(c.status);
  const role = viewer?.profile.role;
  const isMember = viewer?.club?.id === c.club_id;
  const p = percent(c.raised_amount, c.goal_amount);
  const timing = campaignTiming(c);
  const canComment = !!viewer && (role === "supporter" || (can(role, "club:manage") && isMember));

  // Lien de partage : avec le code d'ambassadeur du compte connecté.
  const shareUrl = `${env.siteUrl}/campagnes/${c.slug}${viewer?.profile.referral_code ? `?ref=${viewer.profile.referral_code}` : ""}`;
  const shareText = `${c.club.name} : ${c.title}. ${p} % de l'objectif déjà atteint, soutenez le projet sur Tribune !`;

  return (
    <>
      <div className="camp-hero on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="crumbs">
            <Link href="/campagnes">Campagnes</Link> / {c.category}
          </div>
          <Link href={`/clubs/${c.club.slug}`} style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", textDecoration: "none" }}>
            <Crest club={c.club} size={52} />
            <div>
              <div style={{ fontWeight: 700 }}>{c.club.name}</div>
              <div className="small" style={{ opacity: 0.8 }}>
                {[c.club.commune, c.club.city].filter(Boolean).join(", ")}
                {c.club.founded_year ? ` · fondé en ${c.club.founded_year}` : ""} · {c.club.sport} · club vérifié
              </div>
            </div>
          </Link>
          <h1 style={{ marginTop: 16, fontSize: "clamp(2rem,4.6vw,3.2rem)", maxWidth: "22ch" }}>{c.title}</h1>
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <CampaignStatusBadge campaign={c} />
            <span className="tag" style={{ color: "var(--on-pitch)", borderColor: "var(--pitch-line)" }}>
              Don
            </span>
            <span className="tag" style={{ color: "var(--on-pitch)", borderColor: "var(--pitch-line)" }}>
              {c.published_at ? `Du ${formatDate(c.published_at)} au ${formatDate(c.end_date)}` : `Collecte de ${plural(c.duration_days, "jour")}`}
            </span>
          </div>
        </div>
      </div>

      <div className="wrap camp-layout">
        <div>
          {!isPublic ? (
            <p className="flash info">
              Cette campagne n&apos;est pas publique ({c.status === "suspended" ? "suspendue" : "en préparation"}). Vous la
              voyez parce que vous gérez ce club ou faites partie de l&apos;équipe Tribune.
            </p>
          ) : null}
          {c.cover_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="camp-photo" src={coverUrl(c.cover_path)} alt={`Photo du projet : ${c.title}`} />
          ) : null}
          <nav className="subnav" aria-label="Sections de la campagne">
            <a href="#projet">Le projet</a>
            <a href="#budget">Budget</a>
            <a href="#jalons">Jalons et preuves</a>
            <a href="#nouvelles">Nouvelles ({updates.length})</a>
            <a href="#commentaires">Commentaires ({comments.length})</a>
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
                <div className={`update${u.audience === "contributors" ? " private" : ""}`} key={u.id}>
                  <span className="small muted">
                    {formatDate(u.published_at)} ·{" "}
                    {u.audience === "contributors" ? <b className="badge">Message réservé aux contributeurs</b> : "publiée après revue Tribune"}
                  </span>
                  <h4>{u.title}</h4>
                  <p style={{ whiteSpace: "pre-line" }}>{u.body}</p>
                </div>
              ))
            ) : (
              <p className="muted">Pas encore de nouvelle.</p>
            )}
            {role === "supporter" ? (
              <p className="small muted" style={{ marginTop: 10 }}>
                Les contributeurs reçoivent aussi les messages que le club leur réserve.
              </p>
            ) : null}
          </div>

          <Comments
            campaignId={c.id}
            slug={c.slug}
            rows={comments}
            canPost={canComment}
            loggedIn={!!viewer}
            staff={isStaff(role)}
            open={isPublic}
          />

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
                  <b>Contribution minimum de {formatMoney(c.min_contribution, c.currency)}</b>
                  {c.max_contribution !== null
                    ? `, et ${formatMoney(c.max_contribution, c.currency)} au plus par supporter pour toute la campagne : le club veut une collecte partagée par le plus grand nombre.`
                    : "."}
                </span>
              </div>
              <div>
                <span className="ck">✓</span>
                <span>
                  <b>Aucun frais pour le supporter.</b> Une commission de 5 % sur les fonds collectés fait fonctionner la
                  plateforme, seulement si l&apos;objectif est atteint.
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
            <div className="money num">
              <div>
                <b className="raised">{formatMoney(c.raised_amount, c.currency)}</b>
                <span>Montant collecté</span>
              </div>
              <div className="r">
                <b>{formatMoney(c.goal_amount, c.currency)}</b>
                <span>Objectif financier</span>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
            </div>
            <div className="figs num" style={{ marginTop: 10 }}>
              <span>
                <b>{p} %</b> atteint
              </span>
              <span>
                <b>{formatNumber(c.backers_count)}</b> supporter{c.backers_count > 1 ? "s" : ""}
              </span>
            </div>
            <dl className="terms" style={{ marginTop: 14 }}>
              <div>
                <dt>Contribution minimum</dt>
                <dd className="num">{formatMoney(c.min_contribution, c.currency)}</dd>
              </div>
              {c.max_contribution !== null ? (
                <div>
                  <dt>Maximum par supporter</dt>
                  <dd className="num">{formatMoney(c.max_contribution, c.currency)}</dd>
                </div>
              ) : null}
              <div>
                <dt>{timing.label}</dt>
                <dd className="num">{timing.value}</dd>
              </div>
              <div>
                <dt>Durée de la collecte</dt>
                <dd className="num">{plural(c.duration_days, "jour")}</dd>
              </div>
            </dl>
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
          {isPublic ? (
            <div className="panel">
              <h4 style={{ marginBottom: 6 }}>Faites connaître la campagne</h4>
              <p className="small muted" style={{ marginBottom: 12 }}>
                {viewer?.profile.referral_code && role === "supporter"
                  ? "Votre lien d'ambassadeur : les supporters qui contribuent après l'avoir suivi vous sont attribués."
                  : "Partagez-la avec les supporters du club."}
              </p>
              <ShareButtons url={shareUrl} text={shareText} compact />
              {role === "supporter" ? (
                <p className="small" style={{ marginTop: 10 }}>
                  <Link href="/compte#ambassadeur">Mes résultats d&apos;ambassadeur →</Link>
                </p>
              ) : null}
            </div>
          ) : null}
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

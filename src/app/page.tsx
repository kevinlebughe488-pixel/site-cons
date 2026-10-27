import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { navigationFor } from "@/lib/navigation";
import { createClient } from "@/lib/supabase/server";
import { CAMPAIGN_WITH_CLUB, listCampaigns } from "@/lib/campaigns";
import { CampaignCard } from "@/components/CampaignCard";
import { Crest, FieldSvg, ProgressBar } from "@/components/visuals";
import { daysLeft, formatMoney, percent } from "@/lib/format";
import type { CampaignWithClub, Milestone } from "@/lib/types";

export default async function HomePage() {
  // L'accueil public s'adresse aux supporters : les autres rôles vont sur leur espace.
  const viewer = await getViewer();
  const home = navigationFor(viewer).home;
  if (home !== "/") redirect(home);

  const supabase = await createClient();
  const [live, statsRes, provenRes] = await Promise.all([
    listCampaigns(supabase, ["published"]),
    supabase.rpc("platform_stats").single<{
      total_raised: number;
      supporters: number;
      funded_campaigns: number;
      active_campaigns: number;
    }>(),
    supabase
      .from("campaigns")
      .select(`${CAMPAIGN_WITH_CLUB}, milestones:campaign_milestones(id, position, label, target_label, done_at)`)
      .eq("status", "funded")
      .order("closed_at", { ascending: false })
      .limit(1)
      .maybeSingle<CampaignWithClub & { milestones: Milestone[] }>(),
  ]);
  const stats = statsRes.data;
  const featured = [...live].sort((a, b) => percent(b.raised_amount, b.goal_amount) - percent(a.raised_amount, a.goal_amount))[0];
  const proven = provenRes.data;

  return (
    <>
      <section className="hero on-pitch">
        <FieldSvg />
        <div className="wrap">
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>
              {viewer ? `Bonjour ${viewer.profile.first_name}` : "Financement participatif des clubs"}
            </div>
            <h1 style={{ marginTop: 12 }}>
              Le club, c&apos;est vous.
              <br />
              <em>Financez-le</em> et voyez où va chaque dollar.
            </h1>
            <p className="lead">
              Une pelouse, des chaussures pour les jeunes, un bus pour les déplacements : choisissez un projet de votre
              club, payez par M-Pesa, Airtel Money ou Orange Money et suivez l&apos;avancement avec les factures et les
              photos.
            </p>
            <div className="ctas">
              <Link className="btn btn-gold" href="/campagnes">
                Voir les campagnes
              </Link>
              {viewer ? (
                <Link className="btn btn-ghost" href="/compte">
                  Mes contributions
                </Link>
              ) : (
                <Link className="btn btn-ghost" href="/inscription">
                  Créer mon compte supporter
                </Link>
              )}
            </div>
            {stats ? (
              <div className="facts num">
                <div>
                  <b>{formatMoney(stats.total_raised)}</b>collectés par les supporters
                </div>
                <div>
                  <b>{stats.supporters.toLocaleString("fr-FR")}</b>supporters contributeurs
                </div>
                <div>
                  <b>{stats.active_campaigns}</b>campagne{stats.active_campaigns > 1 ? "s" : ""} en cours
                </div>
              </div>
            ) : null}
          </div>
          {featured ? (
            <div className="board" aria-label="Campagne à la une">
              <div className="head">
                <Crest club={featured.club} size={40} />
                <div>
                  <div className="club">{featured.club.name}</div>
                  <div className="small" style={{ opacity: 0.8 }}>
                    À la une · {featured.category}
                  </div>
                </div>
              </div>
              <h3 style={{ marginTop: 14, fontSize: "1.6rem" }}>{featured.title}</h3>
              <div className="score num">
                <div>
                  <div className="v">{formatMoney(featured.raised_amount, featured.currency)}</div>
                  <div className="l">Collectés</div>
                </div>
                <div className="sep">/</div>
                <div className="r">
                  <div className="v">{formatMoney(featured.goal_amount, featured.currency)}</div>
                  <div className="l">Objectif</div>
                </div>
              </div>
              <ProgressBar raised={featured.raised_amount} goal={featured.goal_amount} />
              <div className="meta num">
                <span>{percent(featured.raised_amount, featured.goal_amount)} % atteints</span>
                <span>{featured.backers_count} supporters</span>
                <span>{daysLeft(featured.end_date)} jours restants</span>
              </div>
              <Link className="btn btn-gold" href={`/campagnes/${featured.slug}/contribuer`}>
                Contribuer à cette campagne
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="eyebrow">En cours</div>
              <h2 style={{ marginTop: 6 }}>Les campagnes ouvertes</h2>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/campagnes">
              Toutes les campagnes →
            </Link>
          </div>
          {live.length ? (
            <div className="grid">
              {live.slice(0, 6).map((c) => (
                <CampaignCard key={c.id} campaign={c} />
              ))}
            </div>
          ) : (
            <div className="panel empty">
              <p>
                <b>Aucune campagne ouverte pour le moment.</b>
              </p>
              <p className="small muted">Les premières campagnes vérifiées apparaîtront ici.</p>
            </div>
          )}
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <div className="sec-head">
            <div>
              <div className="eyebrow">Où va votre argent</div>
              <h2 style={{ marginTop: 6 }}>Le site ne garde pas l&apos;argent</h2>
              <p className="muted">
                Votre paiement passe par pawaPay, un prestataire agréé relié à M-Pesa, Airtel Money et Orange Money.
                Tribune enregistre la contribution, prélève une commission unique affichée avant de payer, et le club
                reçoit le reste selon les règles de la campagne.
              </p>
            </div>
          </div>
          <div className="flow">
            <div className="node">
              <div className="eyebrow">1 · Vous</div>
              <h4>Vous donnez 20 $</h4>
              <p className="small muted">Vous validez le paiement sur votre téléphone avec votre code secret.</p>
            </div>
            <div className="arrow" aria-hidden="true">
              →
            </div>
            <div className="node hl">
              <div className="eyebrow">2 · Prestataire de paiement</div>
              <h4>Encaisse et confirme</h4>
              <p className="small">Tribune n&apos;a jamais accès à votre compte ni à votre code Mobile Money.</p>
            </div>
            <div className="arrow" aria-hidden="true">
              →
            </div>
            <div className="node">
              <div className="eyebrow">3 · Votre club</div>
              <h4 className="num">19 $ pour le projet</h4>
              <p className="small muted num">1 $ (5 %) finance la plateforme : vérifications, support, sécurité.</p>
            </div>
          </div>
        </div>
      </section>

      {proven ? (
        <section className="band">
          <div className="wrap">
            <div className="proof">
              <div>
                <div className="eyebrow">La preuve après le don</div>
                <h2 style={{ marginTop: 6 }}>
                  {proven.club.name} : {formatMoney(proven.raised_amount, proven.currency)} collectés,{" "}
                  {proven.milestones.filter((m) => m.done_at).length} jalon(s) sur {proven.milestones.length} prouvés
                </h2>
                <p className="muted" style={{ marginTop: 12 }}>
                  Chaque campagne financée publie ses jalons, ses justificatifs et un rapport final.
                </p>
                <div style={{ marginTop: 20 }}>
                  <Link className="btn btn-primary" href={`/campagnes/${proven.slug}`}>
                    Voir la campagne
                  </Link>
                </div>
              </div>
              <ol className="steps">
                {[...proven.milestones]
                  .sort((a, b) => a.position - b.position)
                  .map((m, i) => (
                    <li key={m.id} className={m.done_at ? "done" : ""}>
                      <span className="dot">{i + 1}</span>
                      <div>
                        <b>{m.label}</b>
                      </div>
                      <span className="when">{m.target_label}</span>
                    </li>
                  ))}
              </ol>
            </div>
          </div>
        </section>
      ) : null}

      <section className="band">
        <div className="wrap">
          <div className="proof" style={{ background: "var(--pitch)", color: "var(--on-pitch)", border: 0 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--gold)" }}>
                Pour les clubs
              </div>
              <h2 style={{ marginTop: 6 }}>Votre club a un projet ? Proposez-le.</h2>
              <p style={{ marginTop: 12, opacity: 0.9 }}>
                Inscrivez votre club, puis déposez le dossier : objectif, budget détaillé, calendrier et jalons.
                L&apos;équipe Tribune vérifie l&apos;identité du club et la cohérence du budget avant publication.
              </p>
            </div>
            <div style={{ display: "grid", gap: 12, alignContent: "center" }}>
              <div className="rules" style={{ opacity: 0.95 }}>
                <div>
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span>Aucun frais d&apos;inscription, 5 % seulement sur les fonds collectés</span>
                </div>
                <div>
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span>Si l&apos;objectif n&apos;est pas atteint, les supporters sont remboursés</span>
                </div>
                <div>
                  <span style={{ color: "var(--gold)" }}>✓</span>
                  <span>Versement au club par tranches, à chaque jalon prouvé</span>
                </div>
              </div>
              <Link className="btn btn-gold" href="/club" style={{ justifySelf: "start" }}>
                Proposer une campagne
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

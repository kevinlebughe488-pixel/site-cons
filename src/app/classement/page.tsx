import type { Metadata } from "next";
import Link from "next/link";
import { getViewer } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { listCampaigns } from "@/lib/campaigns";
import { CampaignStatusBadge, Crest, FieldSvg, ProgressBar } from "@/components/visuals";
import { formatMoney, formatNumber, percent, plural } from "@/lib/format";
import type { Club } from "@/lib/types";

export const metadata: Metadata = {
  title: "Classement",
  description: "Les campagnes les plus soutenues, les clubs qui rassemblent le plus de supporters et les ambassadeurs qui font connaître les projets.",
};

type ClubRank = Pick<Club, "id" | "slug" | "name" | "short_name" | "color_primary" | "color_secondary" | "logo_path" | "city"> & {
  supporters: number;
  raised: number;
  funded: number;
};
type AmbassadorRank = { rank: number; label: string; supporters: number; amount: number; is_me: boolean };

export default async function RankingPage(props: PageProps<"/classement">) {
  const { periode } = await props.searchParams;
  const all = periode === "toutes";
  const viewer = await getViewer();
  const supabase = await createClient();
  const [campaigns, { data: clubData }, { data: ambassadorData }] = await Promise.all([
    listCampaigns(supabase, all ? ["published", "funded", "failed"] : ["published"], 200),
    supabase.rpc("club_ranking", { p_limit: 10 }),
    supabase.rpc("ambassador_ranking", { p_limit: 10 }),
  ]);
  // Les plus soutenues : d'abord le nombre de supporters, puis le montant collecté.
  const ranked = [...campaigns]
    .sort((a, b) => b.backers_count - a.backers_count || Number(b.raised_amount) - Number(a.raised_amount))
    .slice(0, 20);
  const clubs = (clubData ?? []) as ClubRank[];
  const ambassadors = (ambassadorData ?? []) as AmbassadorRank[];
  const supporter = can(viewer?.profile.role, "contribution:create");

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Classement
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>Les campagnes les plus soutenues</h1>
          <p>Classées par nombre de supporters, puis par montant collecté. Le soutien compte autant que les montants.</p>
        </div>
      </div>
      <div className="wrap page" style={{ display: "grid", gap: 40 }}>
        <section>
          <nav className="tabs" aria-label="Période">
            <Link href="/classement" aria-current={!all ? "page" : undefined}>
              Campagnes en cours
            </Link>
            <Link href="/classement?periode=toutes" aria-current={all ? "page" : undefined}>
              Toutes les campagnes
            </Link>
          </nav>
          {ranked.length ? (
            <ol className="ranking">
              {ranked.map((c, i) => (
                <li key={c.id}>
                  <span className={`rank${i < 3 ? " top" : ""}`}>{i + 1}</span>
                  <Crest club={c.club} size={30} />
                  <div className="who">
                    <Link href={`/campagnes/${c.slug}`}>
                      <b>{c.title}</b>
                    </Link>
                    <span className="small muted">
                      {c.club.name} · <CampaignStatusBadge campaign={c} />
                    </span>
                    <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
                  </div>
                  <div className="score num">
                    <b>{plural(c.backers_count, "supporter")}</b>
                    <span className="small muted">
                      {formatMoney(c.raised_amount, c.currency)} · {percent(c.raised_amount, c.goal_amount)} %
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="panel empty">
              <p className="muted">Aucune campagne {all ? "publiée" : "en cours"} pour l&apos;instant.</p>
            </div>
          )}
        </section>

        <div className="split half">
          <section>
            <h2 style={{ fontSize: "1.8rem", marginBottom: 14 }}>Les clubs les plus soutenus</h2>
            {clubs.length ? (
              <ol className="ranking compact">
                {clubs.map((k, i) => (
                  <li key={k.id}>
                    <span className={`rank${i < 3 ? " top" : ""}`}>{i + 1}</span>
                    <Crest club={k} size={28} />
                    <div className="who">
                      <Link href={`/clubs/${k.slug}`}>
                        <b>{k.name}</b>
                      </Link>
                      <span className="small muted">
                        {k.city} · {plural(Number(k.funded), "projet financé", "projets financés")}
                      </span>
                    </div>
                    <div className="score num">
                      <b>{plural(Number(k.supporters), "supporter")}</b>
                      <span className="small muted">{formatMoney(Number(k.raised))}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Pas encore de club soutenu.</p>
            )}
          </section>

          <section id="ambassadeurs">
            <h2 style={{ fontSize: "1.8rem", marginBottom: 6 }}>Les ambassadeurs</h2>
            <p className="small muted" style={{ marginBottom: 14 }}>
              Ils partagent les campagnes autour d&apos;eux : chaque supporter qui contribue après avoir suivi leur lien
              compte ici.
            </p>
            {ambassadors.length ? (
              <ol className="ranking compact">
                {ambassadors.map((a) => (
                  <li key={a.rank} className={a.is_me ? "me" : undefined}>
                    <span className={`rank${a.rank <= 3 ? " top" : ""}`}>{a.rank}</span>
                    <span className="avatar" aria-hidden="true">
                      {a.label === "Ambassadeur anonyme" ? "?" : a.label.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="who">
                      <b>
                        {a.label}
                        {a.is_me ? " (vous)" : ""}
                      </b>
                    </div>
                    <div className="score num">
                      <b>{plural(Number(a.supporters), "supporter amené", "supporters amenés")}</b>
                      <span className="small muted">{formatMoney(Number(a.amount))} collectés</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Aucun ambassadeur pour l&apos;instant : soyez le premier.</p>
            )}
            <div className="panel" style={{ marginTop: 16 }}>
              <h3>Devenir ambassadeur</h3>
              <p className="small muted" style={{ marginBottom: 12 }}>
                Chaque compte supporter a son lien de partage. Partagez une campagne sur WhatsApp ou Facebook depuis sa
                page : les contributions qui suivent vous sont attribuées.
              </p>
              {supporter ? (
                <Link className="btn btn-primary btn-sm" href="/compte#ambassadeur">
                  Mon lien d&apos;ambassadeur
                </Link>
              ) : !viewer ? (
                <Link className="btn btn-primary btn-sm" href="/inscription?profil=supporter">
                  Créer mon compte supporter
                </Link>
              ) : null}
              <p className="small muted" style={{ marginTop: 10 }}>
                {formatNumber(ambassadors.reduce((s, a) => s + Number(a.supporters), 0))} supporters amenés par les
                ambassadeurs du classement.
              </p>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

import Link from "next/link";
import type { CampaignWithClub } from "@/lib/types";
import { campaignTiming, formatMoney, percent, plural } from "@/lib/format";
import { CampaignCover, CampaignStatusBadge, coverUrl, Crest, ProgressBar } from "@/components/visuals";

/**
 * Fiche d'une campagne : le club et l'état de la collecte en tête, la photo du
 * projet, puis ce qu'un supporter doit voir d'un coup d'œil (collecté, objectif,
 * avancement, nombre de supporters, contribution minimum, durée restante).
 */
export function CampaignCard({ campaign: c }: { campaign: CampaignWithClub }) {
  const timing = campaignTiming(c);
  return (
    <Link className="card camp-card" href={`/campagnes/${c.slug}`}>
      <div className="card-head">
        <span className="club-line">
          <Crest club={c.club} size={20} />
          <b>{c.club.name}</b>
        </span>
        <CampaignStatusBadge campaign={c} />
      </div>
      <div className="cover">
        {c.cover_path ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl(c.cover_path)} alt="" loading="lazy" decoding="async" />
        ) : (
          <CampaignCover club={c.club} />
        )}
        <span className="tag">Don · {c.category}</span>
      </div>
      <div className="body">
        <h3>Projet : {c.title}</h3>
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
        <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
        <div className="figs num">
          <span>{percent(c.raised_amount, c.goal_amount)} % atteint</span>
          <span>{plural(c.backers_count, "supporter")}</span>
        </div>
        <dl className="terms">
          <div>
            <dt>Contribution minimum</dt>
            <dd className="num">{formatMoney(c.min_contribution, c.currency)}</dd>
          </div>
          <div>
            <dt>{timing.label}</dt>
            <dd className="num">{timing.value}</dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}

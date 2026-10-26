import Link from "next/link";
import type { CampaignWithClub } from "@/lib/types";
import { daysLeft, formatDate, formatMoney, percent } from "@/lib/format";
import { CampaignCover, CampaignPill, ProgressBar } from "@/components/visuals";

export function CampaignCard({ campaign: c }: { campaign: CampaignWithClub }) {
  const left = daysLeft(c.end_date);
  return (
    <Link className="card" href={`/campagnes/${c.slug}`}>
      <div className="cover">
        <CampaignCover club={c.club} />
        <CampaignPill status={c.status} />
        <span className="tag">Don</span>
      </div>
      <div className="body">
        <div className="club-line">
          {c.club.name} · {c.category}
        </div>
        <h3>{c.title}</h3>
        <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
        <div className="figs num">
          <span>
            <b>{formatMoney(c.raised_amount, c.currency)}</b> sur {formatMoney(c.goal_amount, c.currency)}
          </span>
          <span>
            <b>{percent(c.raised_amount, c.goal_amount)} %</b>
          </span>
        </div>
        <div className="figs num">
          <span>
            {c.backers_count} supporter{c.backers_count > 1 ? "s" : ""}
          </span>
          <span>
            {c.status === "published" && left > 0
              ? `${left} jour${left > 1 ? "s" : ""} restant${left > 1 ? "s" : ""}`
              : `Clôture le ${formatDate(c.end_date)}`}
          </span>
        </div>
      </div>
    </Link>
  );
}

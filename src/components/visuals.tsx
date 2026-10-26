import type { CampaignStatus, Club } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/labels";
import { percent } from "@/lib/format";

type CrestClub = Pick<Club, "short_name" | "color_primary" | "color_secondary"> & { logo_path?: string | null };

/** Adresse publique d'un logo stocké dans Supabase Storage. */
export function logoUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/club-logos/${path}`;
}

export function Crest({ club, size = 34 }: { club: CrestClub; size?: number }) {
  if (club.logo_path) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl(club.logo_path)}
        alt=""
        width={size * 1.15}
        height={size * 1.15}
        style={{ flex: "none", objectFit: "contain", borderRadius: 8, background: "#fff", padding: 2 }}
      />
    );
  }
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-hidden="true" style={{ flex: "none" }}>
      <path d="M20 1 38 7v15c0 12-8 19-18 23C10 41 2 34 2 22V7Z" fill={club.color_primary} stroke={club.color_secondary} strokeWidth="2" />
      <path d="M2 20h36" stroke={club.color_secondary} strokeWidth="1.5" opacity=".6" />
      <text
        x="20"
        y="31"
        textAnchor="middle"
        fontFamily="Barlow Condensed,Arial Narrow,sans-serif"
        fontWeight="800"
        fontSize="13"
        fill={club.color_secondary}
      >
        {club.short_name}
      </text>
    </svg>
  );
}

export function FieldSvg({ opacity = 1 }: { opacity?: number }) {
  return (
    <svg className="field" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ opacity }}>
      <g fill="none" stroke="var(--pitch-line)" strokeWidth="2">
        <rect x="40" y="30" width="1120" height="440" />
        <path d="M600 30v440" />
        <circle cx="600" cy="250" r="80" />
        <rect x="40" y="140" width="150" height="220" />
        <rect x="1010" y="140" width="150" height="220" />
        <rect x="40" y="200" width="55" height="100" />
        <rect x="1105" y="200" width="55" height="100" />
        <path d="M190 200a70 70 0 0 1 0 100M1010 200a70 70 0 0 0 0 100" />
      </g>
      <g fill="rgba(255,255,255,.025)">
        {Array.from({ length: 12 }, (_, i) =>
          i % 2 ? <rect key={i} x={40 + i * 93.3} y="30" width="93.3" height="440" /> : null,
        )}
      </g>
    </svg>
  );
}

export function CampaignCover({ club }: { club: CrestClub }) {
  return (
    <svg viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="320" height="160" fill={club.color_primary} />
      <g fill="rgba(255,255,255,.05)">
        <rect x="0" width="40" height="160" />
        <rect x="80" width="40" height="160" />
        <rect x="160" width="40" height="160" />
        <rect x="240" width="40" height="160" />
      </g>
      <g fill="none" stroke="rgba(255,255,255,.18)" strokeWidth="1.5">
        <path d="M160 0v160" />
        <circle cx="160" cy="80" r="34" />
        <rect x="-1" y="40" width="50" height="80" />
        <rect x="271" y="40" width="50" height="80" />
      </g>
      {club.logo_path ? (
        <g>
          <circle cx="160" cy="80" r="30" fill="#fff" />
          <image href={logoUrl(club.logo_path)} x="134" y="54" width="52" height="52" preserveAspectRatio="xMidYMid meet" />
        </g>
      ) : (
      <g transform="translate(142 56)">
        <path d="M18 1 34 6v14c0 11-7 17-16 21C9 37 2 31 2 20V6Z" fill={club.color_primary} stroke={club.color_secondary} strokeWidth="2" />
        <text x="18" y="27" textAnchor="middle" fontFamily="Barlow Condensed,Arial Narrow,sans-serif" fontWeight="800" fontSize="11" fill={club.color_secondary}>
          {club.short_name}
        </text>
      </g>
      )}
    </svg>
  );
}

const PILL_CLASS: Record<CampaignStatus, string> = {
  draft: "s-brouillon",
  in_review: "s-revue",
  changes_requested: "s-ajournee",
  rejected: "s-refusee",
  published: "s-publiee",
  suspended: "s-suspendue",
  funded: "s-financee",
  failed: "s-nonfinancee",
};

export function CampaignPill({ status }: { status: CampaignStatus }) {
  return <span className={`pill ${PILL_CLASS[status]}`}>{STATUS_LABELS[status]}</span>;
}

/** Pastille générique : tone = ok | warn | bad | info | muted | gold. */
export function Pill({ tone, children }: { tone: "ok" | "warn" | "bad" | "info" | "muted" | "gold"; children: React.ReactNode }) {
  const cls = { ok: "s-publiee", warn: "s-moyenne", bad: "s-refusee", info: "s-revue", muted: "s-faible", gold: "s-financee" }[tone];
  return <span className={`pill ${cls}`}>{children}</span>;
}

export function ProgressBar({ raised, goal, label }: { raised: number; goal: number; label?: string }) {
  const p = percent(raised, goal);
  return (
    <div className="bar" role="img" aria-label={label ?? `${p} % de l'objectif`}>
      <i style={{ width: `${p}%` }} />
    </div>
  );
}

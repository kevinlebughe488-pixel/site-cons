import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { listCampaigns } from "@/lib/campaigns";
import { CampaignCard } from "@/components/CampaignCard";
import { FieldSvg } from "@/components/visuals";
import { CAMPAIGN_CATEGORIES, type CampaignStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Campagnes" };

const STATUS_FILTERS: Record<string, CampaignStatus[]> = {
  "": ["published", "funded", "failed"],
  en_cours: ["published"],
  financees: ["funded"],
  cloturees: ["failed"],
};

export default async function CampaignsPage(props: PageProps<"/campagnes">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const cat = typeof sp.theme === "string" ? sp.theme : "";
  const statut = typeof sp.statut === "string" && sp.statut in STATUS_FILTERS ? sp.statut : "";

  const supabase = await createClient();
  const all = await listCampaigns(supabase, STATUS_FILTERS[statut], 200);
  const list = all.filter(
    (c) => (!q || `${c.title} ${c.club.name}`.toLowerCase().includes(q)) && (!cat || c.category === cat),
  );

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.7} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Catalogue
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>Toutes les campagnes</h1>
          <p>
            Chaque campagne a été vérifiée par l&apos;équipe Tribune avant publication : identité du club, budget et
            calendrier.
          </p>
        </div>
      </div>
      <div className="wrap page">
        <form className="filters" method="get">
          <input type="text" name="q" defaultValue={q} placeholder="Rechercher un club ou un projet" aria-label="Rechercher" />
          <select name="theme" defaultValue={cat} aria-label="Thème">
            <option value="">Tous les thèmes</option>
            {CAMPAIGN_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <select name="statut" defaultValue={statut} aria-label="Statut">
            <option value="">Tous les statuts</option>
            <option value="en_cours">En cours</option>
            <option value="financees">Financées</option>
            <option value="cloturees">Non financées</option>
          </select>
          <button className="btn btn-ghost btn-sm" type="submit">
            Filtrer
          </button>
        </form>
        <p className="small muted" style={{ marginBottom: 14 }}>
          {list.length} campagne{list.length > 1 ? "s" : ""}
        </p>
        {list.length ? (
          <div className="grid">
            {list.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        ) : (
          <p className="muted">Aucune campagne ne correspond. Essayez un autre thème ou effacez la recherche.</p>
        )}
      </div>
    </>
  );
}

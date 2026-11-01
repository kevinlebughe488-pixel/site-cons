import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";
import { formatMoney, percent } from "@/lib/format";

// Image d'aperçu d'une campagne SANS photo, quand elle est partagée (WhatsApp, Facebook, X…) :
// couleurs du club, titre et avancement. Image légère (quelques dizaines de ko), ce qui compte
// pour WhatsApp. Une campagne avec photo utilise la photo elle-même (voir generateMetadata).
// Lecture publique (clé anonyme) : une campagne non publiée donne une image générique.

const SIZE = { width: 1200, height: 630 };

// La police par défaut des images n'a pas l'espace fine insécable des montants.
const money = (amount: number, currency: string) => formatMoney(amount, currency).replace(/ /g, " ");

type Row = {
  title: string;
  raised_amount: number;
  goal_amount: number;
  backers_count: number;
  currency: string;
  club: { name: string; color_primary: string };
};

export async function GET(_request: Request, ctx: RouteContext<"/campagnes/[slug]/image-partage">) {
  const { slug } = await ctx.params;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let c: Row | null = null;
  if (url && key && /^[a-z0-9-]{1,100}$/.test(slug)) {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data } = await supabase
      .from("campaigns")
      .select("title, raised_amount, goal_amount, backers_count, currency, club:clubs!inner(name, color_primary)")
      .eq("slug", slug)
      .maybeSingle<Row>();
    c = data;
  }

  const gold = "#ecd083";
  const p = c ? percent(c.raised_amount, c.goal_amount) : 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "56px 64px",
          color: "#ffffff",
          backgroundColor: c?.club.color_primary ?? "#1d5237",
          backgroundImage: "linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.45) 100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>{c ? c.club.name : "Tribune"}</div>
          <div style={{ display: "flex", fontSize: 26, fontWeight: 700, background: gold, color: "#2a2208", padding: "8px 20px", borderRadius: 999 }}>
            TRIBUNE
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: c && c.title.length > 60 ? 54 : 66, fontWeight: 800, lineHeight: 1.05, maxWidth: 1050 }}>
            {c ? c.title : "Les supporters financent leur club"}
          </div>
          {c ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 18, width: "100%" }}>
              <div style={{ display: "flex", width: "100%", height: 22, borderRadius: 999, background: "rgba(255,255,255,.25)" }}>
                <div style={{ display: "flex", width: `${Math.max(p, 2)}%`, height: 22, borderRadius: 999, background: gold }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32 }}>
                <div style={{ display: "flex" }}>
                  <b style={{ color: gold }}>{money(c.raised_amount, c.currency)}</b>
                  <span style={{ marginLeft: 12, opacity: 0.9 }}>{`sur ${money(c.goal_amount, c.currency)}`}</span>
                </div>
                <div style={{ display: "flex", opacity: 0.95 }}>
                  {`${p} % · ${c.backers_count} supporter${c.backers_count > 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 32, opacity: 0.9 }}>Financement participatif des clubs, payé par Mobile Money.</div>
          )}
        </div>
      </div>
    ),
    { ...SIZE, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
}

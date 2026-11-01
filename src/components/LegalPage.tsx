import { FieldSvg } from "@/components/visuals";
import { LEGAL } from "@/lib/legal";

export type LegalSection = { id?: string; title: string; body: React.ReactNode };

/** Mise en page commune des textes juridiques (conditions, confidentialité). */
export function LegalPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: LegalSection[] }) {
  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap">
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            {eyebrow}
          </div>
          <h1 style={{ marginTop: 8, fontSize: "clamp(2.2rem,5vw,3.2rem)" }}>{title}</h1>
          <p>{intro}</p>
        </div>
      </div>
      <div className="wrap page legal-page" style={{ maxWidth: 860 }}>
        <p className="small muted" style={{ marginBottom: 24 }}>
          Dernière mise à jour : {LEGAL.updated}
        </p>
        {sections.map((s) => (
          <section key={s.title} id={s.id} className="block">
            <h2>{s.title}</h2>
            {s.body}
          </section>
        ))}
      </div>
    </>
  );
}

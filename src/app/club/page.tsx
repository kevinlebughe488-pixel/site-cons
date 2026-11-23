import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { can, canUseClubSpace, isStaff } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { LogoUpload } from "@/components/LogoUpload";
import { CampaignPill, Crest, FieldSvg, Pill, ProgressBar } from "@/components/visuals";
import { CLUB_STATUS_LABELS, updateStatusLabel } from "@/lib/labels";
import { formatDate, formatMoney, plural, todayInKinshasa } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { CLUB_DOCUMENT_KINDS, type Campaign, type Club, type ClubDocument, type ClubPrivate, type CampaignUpdate } from "@/lib/types";
import { EMPTY_DOSSIER, type DossierValues } from "@/lib/club-dossier";
import { ClubWizard } from "./ClubWizard";
import { Check, DocumentList, PayoutSummary } from "./parts";

export const metadata: Metadata = { title: "Espace club" };

const NEXT_STEP: Partial<Record<Campaign["status"], string>> = {
  draft: "Compléter et envoyer en revue",
  changes_requested: "Corriger selon la note de Tribune",
  in_review: "Instruction par l'équipe Tribune",
  published: "Publier une nouvelle au moins une fois par mois",
  suspended: "Répondre à l'équipe Tribune",
  funded: "Publier les preuves des jalons",
};

const OK_MESSAGES: Record<string, string> = {
  dossier_ouvert: "Informations enregistrées. Ajoutez maintenant les documents du club (et son logo si vous le souhaitez).",
};

const PROOF_KINDS = new Set(CLUB_DOCUMENT_KINDS.filter((k) => k.proof).map((k) => k.id));

function dossierValues(club: Club, priv: ClubPrivate | null): DossierValues {
  const phone = (v: string | null | undefined) => (v ? formatPhone(v) : "");
  return {
    name: club.name,
    short_name: club.short_name,
    sport: club.sport,
    city: club.city,
    commune: club.commune ?? "",
    address: priv?.address ?? "",
    founded_on: club.founded_on ?? "",
    legal_id: priv?.legal_id ?? "",
    rep_name: club.president_name,
    rep_title: priv?.rep_title ?? "",
    rep_phone: phone(priv?.rep_phone),
    rep_email: priv?.rep_email ?? "",
    contact_phone: club.contact_phone !== priv?.rep_phone ? phone(club.contact_phone) : "",
    description: club.description,
    color_primary: club.color_primary,
    color_secondary: club.color_secondary,
    payout_method: priv?.payout_method ?? "mobile_money",
    payout_holder: priv?.payout_holder ?? "",
    payout_phone: priv?.payout_phone ? `0${priv.payout_phone.slice(3)}` : "",
    payout_provider: priv?.payout_provider ?? "",
    bank_name: priv?.bank_name ?? "",
    bank_account: priv?.bank_account ?? "",
  };
}

/** La date est-elle plus ancienne que `days` jours ? */
function olderThanDays(iso: string, days: number): boolean {
  return Date.now() - new Date(iso).getTime() > days * 86_400_000;
}

export default async function ClubPage(props: PageProps<"/club">) {
  const viewer = await requireViewer("/club");
  // L'équipe Tribune n'a pas d'espace club : ses clubs sont dans le back-office.
  if (isStaff(viewer.profile.role)) redirect("/admin/clubs");
  if (!canUseClubSpace(viewer.profile.role)) redirect("/acces-refuse");
  const { ok, etape } = await props.searchParams;
  const okMessage = typeof ok === "string" ? OK_MESSAGES[ok] : undefined;
  const askedStep = Number(etape) || 0;
  const club = viewer.club;
  const me = {
    name: `${viewer.profile.first_name} ${viewer.profile.last_name}`,
    phone: formatPhone(viewer.profile.phone),
    email: viewer.profile.email ?? "",
  };

  // Aucun club (ou demande refusée) : ouverture du dossier.
  if (!club || club.status === "rejected") {
    return (
      <div className="wrap page">
        <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginBottom: 20 }}>Espace club</h1>
        {club?.status === "rejected" ? (
          <p className="flash error">
            La demande pour « {club.name} » a été refusée{club.review_note ? ` : ${club.review_note}` : "."} Vous pouvez
            déposer une nouvelle demande.
          </p>
        ) : null}
        {can(viewer.profile.role, "club:register") ? (
          <ClubWizard
            key="nouveau"
            initial={EMPTY_DOSSIER}
            me={me}
            maxDate={todayInKinshasa()}
            step={1}
            club={null}
            docs={[]}
            saved={{ info: false, payout: false }}
          />
        ) : (
          <p className="muted">Votre rôle ne permet pas d&apos;inscrire un club.</p>
        )}
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: privData }, { data: docData }] = await Promise.all([
    supabase.from("club_private").select("*").eq("club_id", club.id).maybeSingle<ClubPrivate>(),
    supabase.from("club_documents").select("id, club_id, kind, file_name, mime_type, size_bytes, created_at").eq("club_id", club.id).order("created_at"),
  ]);
  const priv = privData ?? null;
  const docs = (docData ?? []) as ClubDocument[];

  const head = (
    <div className="page-head on-pitch">
      <FieldSvg opacity={0.6} />
      <div className="wrap" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
        <Crest club={club} size={56} />
        <div>
          <div className="eyebrow" style={{ color: "var(--gold)" }}>
            Espace club · {CLUB_STATUS_LABELS[club.status]}
          </div>
          <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginTop: 4 }}>{club.name}</h1>
        </div>
      </div>
    </div>
  );

  // Dossier en préparation ou à compléter : le parcours en étapes, avec « Suivant ».
  if (club.status === "draft" || club.status === "changes_requested") {
    const hasProof = docs.some((d) => PROOF_KINDS.has(d.kind));
    const saved = { info: !!priv?.rep_phone && !!priv.address, payout: !!priv?.payout_holder };
    // Sans étape demandée : la première qui reste à faire.
    const firstTodo = !saved.info ? 1 : !saved.payout ? 3 : !hasProof ? 4 : 5;
    return (
      <>
        {head}
        <div className="wrap page">
          <ClubWizard
            key={club.id}
            initial={dossierValues(club, priv)}
            me={me}
            maxDate={todayInKinshasa()}
            step={askedStep >= 1 && askedStep <= 5 ? askedStep : firstTodo}
            club={club}
            docs={docs}
            saved={saved}
            okMessage={okMessage}
          />
        </div>
      </>
    );
  }

  // Dossier envoyé, en cours de vérification : lecture seule.
  if (club.status === "pending") {
    const hasProof = docs.some((d) => PROOF_KINDS.has(d.kind));
    const infoOk = !!priv?.rep_phone && !!priv.address;
    const payoutOk = !!priv?.payout_holder;
    const steps: [string, boolean][] = [
      ["Dossier", infoOk && payoutOk],
      ["Documents", hasProof],
      ["Envoi", true],
      ["Vérification", false],
      ["Club vérifié", false],
    ];
    return (
      <>
        {head}
        <div className="wrap page">
          <section className="thanks" role="status">
            <span className="thanks-ic" aria-hidden="true">
              ✓
            </span>
            <div>
              <h2>{ok === "dossier_envoye" ? "Merci d'avoir envoyé votre demande !" : "Votre demande est en cours de validation"}</h2>
              <p>
                {ok === "dossier_envoye" ? "Elle est maintenant en cours de validation par l'équipe Tribune. " : `Envoyée le ${formatDate(club.submitted_at)}. `}
                L&apos;équipe vérifie l&apos;existence du club, son représentant légal et son compte de versement. Vous serez
                prévenu de sa décision ici et dans vos notifications ; si un document manque, elle vous dira lequel.
              </p>
              <p className="small muted">En attendant, votre dossier ne peut plus être modifié. Vous pouvez le relire ci-dessous.</p>
            </div>
          </section>
          <div className="stepper" aria-label="Avancement du dossier">
            {steps.map(([label, done], i) => (
              <span key={label} className={done ? "done" : i === 3 ? "on" : ""}>
                {i + 1} · {label}
                {done ? " ✓" : ""}
              </span>
            ))}
          </div>

          <div className="split">
            <div className="panel">
              <h3>Dossier envoyé</h3>
              <div className="recap small">
                <div>
                  <span className="muted">Nom officiel · sigle</span>
                  <span>
                    {club.name} · {club.short_name}
                  </span>
                </div>
                <div>
                  <span className="muted">Discipline</span>
                  <span>{club.sport}</span>
                </div>
                <div>
                  <span className="muted">Siège</span>
                  <span>{[priv?.address, club.commune, club.city].filter(Boolean).join(", ")}</span>
                </div>
                <div>
                  <span className="muted">Date de création</span>
                  <span>{club.founded_on ? formatDate(club.founded_on) : (club.founded_year ?? "—")}</span>
                </div>
                <div>
                  <span className="muted">Identifiant juridique</span>
                  <span>{priv?.legal_id ?? "—"}</span>
                </div>
                <div>
                  <span className="muted">Représentant légal</span>
                  <span>
                    {club.president_name}
                    {priv?.rep_title ? `, ${priv.rep_title}` : ""} · {formatPhone(priv?.rep_phone)}
                    {priv?.rep_email ? ` · ${priv.rep_email}` : ""}
                  </span>
                </div>
              </div>
              <h4 style={{ margin: "18px 0 8px" }}>Compte de versement</h4>
              <PayoutSummary priv={priv} />
            </div>
            <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
              <div className="panel">
                <h3>Contenu du dossier</h3>
                <div className="rules">
                  <Check ok={infoOk} label="Identité du club, siège et représentant légal" />
                  <Check ok={hasProof} label="Un document attestant l'existence du club (statuts, enregistrement ou affiliation)" />
                  <Check ok={payoutOk} label="Compte de versement au nom du club" />
                  <Check ok={docs.some((d) => d.kind === "identite_representant")} label="Pièce d'identité du représentant légal" />
                  <Check ok={docs.some((d) => d.kind === "compte_versement")} label="Justificatif du compte de versement" optional />
                </div>
              </div>
              <div className="panel">
                <h3>Documents du dossier</h3>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  Visibles seulement par les gestionnaires du club et l&apos;équipe Tribune.
                </p>
                <DocumentList docs={docs} editable={false} />
              </div>
              <div className="panel">
                <h3>Logo</h3>
                <LogoUpload club={club} />
              </div>
            </aside>
          </div>
        </div>
      </>
    );
  }

  // Club vérifié (ou suspendu) : tableau de bord. L'en-tête et les rubriques
  // (campagnes, actualités, profil du club) viennent de la mise en page de l'espace club.
  const [{ data }, { data: fees }, { data: newsData }, { data: stats }] = await Promise.all([
    supabase.from("campaigns").select("*").eq("club_id", club.id).order("created_at", { ascending: false }),
    supabase.from("publication_fees").select("campaign_id, amount, currency").is("paid_at", null),
    supabase
      .from("campaign_updates")
      .select("id, campaign_id, club_id, audience, title, body, status, review_note, created_at, published_at")
      .eq("club_id", club.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.rpc("club_stats", { p_club_id: club.id }).maybeSingle<{ supporters: number; raised: number; funded: number; active: number }>(),
  ]);
  const campaigns = (data ?? []) as Campaign[];
  const news = (newsData ?? []) as CampaignUpdate[];
  const unpaid = new Map(((fees ?? []) as { campaign_id: string; amount: number; currency: string }[]).map((f) => [f.campaign_id, f]));
  const running = campaigns.filter((c) => c.status === "published" || c.status === "funded");
  const { data: openMilestones } = running.length
    ? await supabase
        .from("campaign_milestones")
        .select("id, campaign_id, label, position")
        .in("campaign_id", running.filter((c) => c.status === "funded").map((c) => c.id))
        .is("done_at", null)
        .order("position")
    : { data: [] };

  // Ce que le club a à faire, du plus urgent au moins urgent.
  type Todo = { tone: "bad" | "warn" | "info"; title: string; text?: string; href: string; cta: string };
  const todos: Todo[] = [];
  for (const c of campaigns) {
    if (c.status === "changes_requested") {
      todos.push({ tone: "bad", title: `Corriger « ${c.title} »`, text: c.review_note ?? "L'équipe Tribune demande des corrections.", href: `/club/campagnes/${c.id}`, cta: "Corriger" });
    }
  }
  for (const c of campaigns) {
    const fee = unpaid.get(c.id);
    if (fee) {
      todos.push({
        tone: "warn",
        title: `Régler les frais de publication de « ${c.title} »`,
        text: `${formatMoney(fee.amount, fee.currency)} : l'équipe Tribune vous indique comment payer.`,
        href: `/club/campagnes/${c.id}`,
        cta: "Voir",
      });
    }
  }
  for (const m of (openMilestones ?? []) as { id: string; campaign_id: string; label: string }[]) {
    const c = campaigns.find((k) => k.id === m.campaign_id);
    if (c && !todos.some((t) => t.href === `/club/campagnes/${c.id}` && t.title.startsWith("Prouver"))) {
      todos.push({ tone: "warn", title: `Prouver le jalon « ${m.label} »`, text: `Campagne « ${c.title} » : la preuve débloque la tranche suivante.`, href: `/club/campagnes/${c.id}`, cta: "Ajouter la preuve" });
    }
  }
  const lastNews = new Map<string, string>();
  for (const u of news) if (u.campaign_id && u.status === "published" && u.published_at && !lastNews.has(u.campaign_id)) lastNews.set(u.campaign_id, u.published_at);
  for (const c of campaigns.filter((k) => k.status === "published")) {
    const last = lastNews.get(c.id);
    if (!last || olderThanDays(last, 30)) {
      todos.push({ tone: "info", title: `Donner des nouvelles de « ${c.title} »`, text: last ? `Dernière nouvelle le ${formatDate(last)}.` : "Aucune nouvelle publiée depuis le lancement.", href: `/club/actualites?campagne=${c.id}`, cta: "Publier une nouvelle" });
    }
  }
  for (const c of campaigns.filter((k) => k.status === "draft")) {
    todos.push({ tone: "info", title: `Terminer la campagne « ${c.title} »`, text: "Brouillon : complétez-la puis envoyez-la en revue.", href: `/club/campagnes/${c.id}`, cta: "Reprendre" });
  }
  if (!club.logo_path) {
    todos.push({ tone: "info", title: "Ajouter le logo du club", text: "Sans logo, un blason aux couleurs du club est affiché.", href: "/club/profil", cta: "Ajouter" });
  }

  return (
    <div className="wrap page">
      {club.status === "suspended" ? (
        <p className="flash error">
          Le club est suspendu{club.review_note ? ` : ${club.review_note}` : "."} Ses campagnes ne collectent plus ; écrivez à l&apos;équipe
          Tribune pour la suite.
        </p>
      ) : null}
      <div className="kpis" style={{ marginTop: 0 }}>
        <div className="kpi">
          <div className="l">Collecté au total</div>
          <div className="v num">{formatMoney(Number(stats?.raised ?? 0))}</div>
          <div className="d">contributions confirmées</div>
        </div>
        <div className="kpi">
          <div className="l">Supporters contributeurs</div>
          <div className="v num">{Number(stats?.supporters ?? 0)}</div>
          <div className="d">au moins une contribution</div>
        </div>
        <div className="kpi">
          <div className="l">Campagnes en cours</div>
          <div className="v num">{Number(stats?.active ?? 0)}</div>
          <div className="d">{Number(stats?.funded ?? 0)} financée(s) au total</div>
        </div>
      </div>

      <div className="split">
        <div style={{ display: "grid", gap: 28, alignContent: "start" }}>
          <section>
            <h2 style={{ fontSize: "1.6rem", marginBottom: 12 }}>À faire</h2>
            {todos.length ? (
              <ul className="todo-list">
                {todos.map((t, i) => (
                  <li key={`${t.href}-${i}`}>
                    <span className={`dot ${t.tone}`} aria-hidden="true" />
                    <span>
                      <b>{t.title}</b>
                      {t.text ? <span className="small muted">{t.text} </span> : null}
                      <Link className="small" href={t.href}>
                        {t.cta} →
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="panel empty">
                <p className="muted">Rien à faire pour l&apos;instant : tout est à jour.</p>
              </div>
            )}
          </section>

          <section>
            <div className="sec-head">
              <h2 style={{ fontSize: "1.6rem" }}>Mes campagnes</h2>
              <Link href="/club/campagnes">Toutes les campagnes →</Link>
            </div>
            {campaigns.length ? (
              <div className="camp-cards">
                {campaigns.slice(0, 4).map((c) => (
                  <Link key={c.id} className="camp-card" href={`/club/campagnes/${c.id}`}>
                    <span className="top">
                      <b>{c.title}</b>
                      <CampaignPill status={c.status} />
                    </span>
                    {["published", "funded", "failed", "suspended"].includes(c.status) ? (
                      <>
                        <ProgressBar raised={c.raised_amount} goal={c.goal_amount} />
                        <span className="small muted num">
                          {formatMoney(c.raised_amount, c.currency)} sur {formatMoney(c.goal_amount, c.currency)} · {plural(c.backers_count, "supporter")}
                        </span>
                      </>
                    ) : (
                      <span className="small muted">
                        Objectif {formatMoney(c.goal_amount, c.currency)} · {NEXT_STEP[c.status] ?? ""}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="panel empty">
                <p>
                  <b>Aucune campagne pour l&apos;instant.</b>
                </p>
                {club.status === "verified" ? (
                  <p className="small muted" style={{ margin: "6px 0 12px" }}>
                    Créez votre première campagne : un parcours en six étapes, enregistré à chaque étape.
                  </p>
                ) : null}
                {club.status === "verified" ? (
                  <Link className="btn btn-primary btn-sm" href="/club/campagnes/nouvelle">
                    Nouvelle campagne
                  </Link>
                ) : null}
              </div>
            )}
          </section>
        </div>

        <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="panel">
            <h3>Dernières actualités</h3>
            {news.length ? (
              news.slice(0, 3).map((u) => (
                <div className="update" key={u.id}>
                  <span className="small muted">
                    {formatDate(u.created_at)} · {u.campaign_id ? (campaigns.find((c) => c.id === u.campaign_id)?.title ?? "Campagne") : "Actualité du club"}
                  </span>
                  <h4>
                    {u.title} <Pill tone={updateStatusLabel(u).tone}>{updateStatusLabel(u).label}</Pill>
                  </h4>
                </div>
              ))
            ) : (
              <p className="small muted">Aucune actualité publiée.</p>
            )}
            {club.status === "verified" ? (
              <Link className="btn btn-ghost btn-sm" href="/club/actualites" style={{ marginTop: 10 }}>
                Publier une actualité
              </Link>
            ) : null}
          </div>
          <div className="panel">
            <h3>Le club</h3>
            <div style={{ display: "flex", gap: 12, alignItems: "center", margin: "8px 0 12px" }}>
              <Crest club={club} size={44} />
              <span className="small muted">{[club.city, club.commune].filter(Boolean).join(", ")}</span>
            </div>
            <Link className="btn btn-ghost btn-sm" href="/club/profil">
              Présentation, logo et compte de versement
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

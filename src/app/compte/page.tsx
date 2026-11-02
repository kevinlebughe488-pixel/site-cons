import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { requestAccountDeletion, updateProfile } from "@/lib/actions/account";
import { followClub, setAmbassadorVisibility } from "@/lib/actions/community";
import { env } from "@/lib/env";
import { ShareButtons } from "@/components/ShareButtons";
import { ActionForm, SubmitButton } from "@/components/forms";
import { FieldSvg, Pill } from "@/components/visuals";
import { CONTRIBUTION_STATUS_LABELS, DOC_TYPES, KYC_LABELS } from "@/lib/labels";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { formatDate, formatMoney, plural } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { contributionRef } from "@/lib/payments/service";
import type { Contribution, ContributionStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Mon compte" };

const STATUS_TONE: Record<ContributionStatus, "ok" | "warn" | "bad" | "info" | "muted"> = {
  initiated: "info",
  pending: "info",
  completed: "ok",
  failed: "bad",
  refund_pending: "warn",
  refunded: "muted",
};

export default async function AccountPage() {
  const { profile: me, club } = await requirePermission("account:read", "/compte");
  // Les contributions et la vérification d'identité ne concernent que les supporters.
  const contributes = can(me.role, "contribution:read");
  const supabase = await createClient();
  const { data } = contributes
    ? await supabase
        .from("contributions")
        .select("*, campaign:campaigns(title, slug)")
        .eq("user_id", me.id)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [] };
  const mine = (data ?? []) as (Contribution & { campaign: { title: string; slug: string } | null })[];
  const confirmed = mine.filter((c) => c.status === "completed");
  const total = confirmed.reduce((s, c) => s + Number(c.amount), 0);
  const [{ data: ambassador }, { data: followed }] = contributes
    ? await Promise.all([
        supabase.rpc("my_ambassador_stats").maybeSingle<{ supporters: number; contributions: number; amount: number }>(),
        me.followed_club_id
          ? supabase.from("clubs").select("id, slug, name").eq("id", me.followed_club_id).maybeSingle<{ id: string; slug: string; name: string }>()
          : Promise.resolve({ data: null }),
      ])
    : [{ data: null }, { data: null }];
  const referralUrl = me.referral_code ? `${env.siteUrl}/?ref=${me.referral_code}` : null;

  return (
    <>
      <div className="page-head on-pitch">
        <FieldSvg opacity={0.6} />
        <div className="wrap" style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
          <div className="avatar" style={{ width: 64, height: 64, fontSize: "1.3rem" }}>
            {(me.first_name[0] + me.last_name[0]).toUpperCase()}
          </div>
          <div>
            <div className="eyebrow" style={{ color: "var(--gold)" }}>
              {ROLE_LABELS[me.role]}
              {club ? ` · ${club.name}` : ""}
            </div>
            <h1 style={{ fontSize: "clamp(2rem,4.5vw,2.8rem)", marginTop: 4 }}>
              {me.first_name} {me.last_name}
            </h1>
          </div>
        </div>
      </div>
      <div className="wrap page">
        {contributes ? (
          <div className="kpis" style={{ marginTop: 0 }}>
            <div className="kpi">
              <div className="l">Total contribué</div>
              <div className="v num">{formatMoney(total)}</div>
              <div className="d">inscrit le {formatDate(me.created_at)}</div>
            </div>
            <div className="kpi">
              <div className="l">Contributions confirmées</div>
              <div className="v num">{confirmed.length}</div>
              <div className="d">sur {plural(new Set(confirmed.map((c) => c.campaign_id)).size, "campagne")}</div>
            </div>
            <div className="kpi">
              <div className="l">Vérification d&apos;identité</div>
              <div className="v" style={{ fontSize: "1.4rem" }}>
                {KYC_LABELS[me.kyc_status]}
              </div>
              <div className="d">{me.kyc_doc_type ? `${DOC_TYPES[me.kyc_doc_type]} ••••${me.kyc_doc_last4}` : "aucune pièce déclarée"}</div>
            </div>
          </div>
        ) : null}
        <div className="split">
          {contributes ? (
            <div>
              <h2 style={{ fontSize: "1.8rem", marginBottom: 12 }}>Mes contributions</h2>
              {mine.length ? (
                <div className="tbl-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Campagne</th>
                        <th className="r">Montant</th>
                        <th>État</th>
                        <th>Reçu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mine.map((c) => (
                        <tr key={c.id}>
                          <td className="num small" style={{ whiteSpace: "nowrap" }}>
                            {formatDate(c.created_at, true)}
                          </td>
                          <td>{c.campaign ? <Link href={`/campagnes/${c.campaign.slug}`}>{c.campaign.title}</Link> : "—"}</td>
                          <td className="r num">
                            <b>{formatMoney(c.amount, c.currency)}</b>
                          </td>
                          <td>
                            <Pill tone={STATUS_TONE[c.status]}>{CONTRIBUTION_STATUS_LABELS[c.status]}</Pill>
                          </td>
                          <td className="num small">
                            <Link href={`/contributions/${c.id}`}>{contributionRef(c.id)}</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="panel empty">
                  <p>
                    <b>Pas encore de contribution.</b>
                  </p>
                  <p className="small muted" style={{ margin: "6px 0 14px" }}>
                    Choisissez une campagne : votre première contribution apparaîtra ici avec son reçu.
                  </p>
                  <Link className="btn btn-primary btn-sm" href="/campagnes">
                    Voir les campagnes
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="panel">
              <h3>Votre espace</h3>
              <p className="small muted" style={{ margin: "6px 0 14px" }}>
                Votre rôle ({ROLE_LABELS[me.role]}) ne permet pas de contribuer aux campagnes : cette page ne sert
                qu&apos;à vos informations personnelles et à votre mot de passe.
              </p>
              {can(me.role, "backoffice:access") ? (
                <Link className="btn btn-primary btn-sm" href="/admin">
                  Ouvrir le back-office
                </Link>
              ) : can(me.role, "club:manage") ? (
                <Link className="btn btn-primary btn-sm" href="/club">
                  Ouvrir l&apos;espace club
                </Link>
              ) : null}
            </div>
          )}
          <aside style={{ display: "grid", gap: 16, alignContent: "start" }}>
            {contributes && referralUrl ? (
              <div className="panel" id="ambassadeur">
                <div className="eyebrow">Ambassadeur</div>
                <h3 style={{ marginTop: 4 }}>Faites connaître les campagnes</h3>
                <p className="small muted" style={{ marginBottom: 12 }}>
                  Partagez votre lien (ou le bouton « Partager » d&apos;une campagne) : les supporters qui contribuent après
                  l&apos;avoir suivi vous sont attribués.
                </p>
                <div className="recap small" style={{ marginBottom: 12 }}>
                  <div>
                    <span className="muted">Supporters amenés</span>
                    <b className="num">{Number(ambassador?.supporters ?? 0)}</b>
                  </div>
                  <div>
                    <span className="muted">Collecté grâce à vous</span>
                    <b className="num">{formatMoney(Number(ambassador?.amount ?? 0))}</b>
                  </div>
                  <div>
                    <span className="muted">Votre code</span>
                    <span className="num">{me.referral_code}</span>
                  </div>
                </div>
                <ShareButtons url={referralUrl} text="Je soutiens les clubs de foot congolais sur Tribune : financez un projet de votre club par Mobile Money !" compact />
                <ActionForm action={setAmbassadorVisibility} className="form" >
                  <input type="hidden" name="visible" value={me.ambassador_public ? "false" : "true"} />
                  <p className="small muted" style={{ marginTop: 12 }}>
                    Dans le <Link href="/classement#ambassadeurs">classement</Link>, vous apparaissez{" "}
                    {me.ambassador_public ? `sous le nom « ${me.first_name} ${me.last_name.slice(0, 1)}. »` : "comme « Ambassadeur anonyme »"}.
                  </p>
                  <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
                    {me.ambassador_public ? "Apparaître anonymement" : "Afficher mon prénom dans le classement"}
                  </SubmitButton>
                </ActionForm>
              </div>
            ) : null}
            {contributes ? (
              <div className="panel">
                <h3>Club suivi</h3>
                {followed ? (
                  <>
                    <p className="small" style={{ marginBottom: 10 }}>
                      Vous suivez <Link href={`/clubs/${followed.slug}`}>{followed.name}</Link> : ses nouveaux projets et ses
                      actualités arrivent dans vos notifications.
                    </p>
                    <ActionForm action={followClub} className="inline-form">
                      <input type="hidden" name="club_id" value={followed.id} />
                      <input type="hidden" name="follow" value="false" />
                      <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…">
                        Ne plus suivre
                      </SubmitButton>
                    </ActionForm>
                  </>
                ) : (
                  <p className="small muted">
                    Aucun. Ouvrez la page d&apos;un club depuis une campagne ou le <Link href="/classement">classement</Link> et
                    choisissez « Suivre ce club ».
                  </p>
                )}
              </div>
            ) : null}
            <div className="panel">
              <h3>Mes informations</h3>
              <ActionForm action={updateProfile}>
                <div className="two">
                  <div className="field">
                    <label htmlFor="first_name">Prénom</label>
                    <input type="text" id="first_name" name="first_name" defaultValue={me.first_name} />
                  </div>
                  <div className="field">
                    <label htmlFor="last_name">Nom</label>
                    <input type="text" id="last_name" name="last_name" defaultValue={me.last_name} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="phone">Téléphone</label>
                  <input type="tel" id="phone" value={formatPhone(me.phone)} readOnly disabled />
                  <div className="hint">
                    Reçoit les codes de connexion par SMS. Pour changer de numéro, contactez l&apos;équipe Tribune.
                  </div>
                </div>
                <div className="two">
                  <div className="field">
                    <label htmlFor="city">Ville</label>
                    <input type="text" id="city" name="city" defaultValue={me.city ?? ""} />
                  </div>
                  <div className="field">
                    <label htmlFor="country">Pays</label>
                    <input type="text" id="country" name="country" defaultValue={me.country ?? ""} />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="residence">Vous vivez</label>
                  <select id="residence" name="residence" defaultValue={me.residence}>
                    <option value="rdc">En RDC</option>
                    <option value="diaspora">Hors de RDC (diaspora)</option>
                  </select>
                </div>
                <label className="check">
                  <input type="checkbox" name="newsletter" defaultChecked={me.newsletter} />
                  <span>Recevoir les nouvelles des campagnes</span>
                </label>
                <p className="small muted">
                  E-mail : {me.email} · consentement du {formatDate(me.consent_at)}
                </p>
                <SubmitButton className="btn btn-ghost btn-sm">Enregistrer</SubmitButton>
              </ActionForm>
            </div>
            <div className="panel">
              <h3>Sécurité</h3>
              <Link className="btn btn-ghost btn-sm" href="/compte/mot-de-passe">
                Changer mon mot de passe
              </Link>
            </div>
            <div className="panel">
              <h3>Supprimer mon compte</h3>
              <p className="small muted" style={{ marginBottom: 10 }}>
                Vos données personnelles sont effacées. Les contributions que la loi oblige à conserver sont gardées à part
                pendant la durée légale. <Link href="/confidentialite">En savoir plus</Link>
              </p>
              <ActionForm action={requestAccountDeletion}>
                <SubmitButton className="btn btn-ghost btn-sm" pendingLabel="…" confirm="Demander la suppression de votre compte Tribune ?">
                  Demander la suppression
                </SubmitButton>
              </ActionForm>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

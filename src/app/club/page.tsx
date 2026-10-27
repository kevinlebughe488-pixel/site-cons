import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { can, canUseClubSpace } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { updateClubInfo } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoUpload } from "@/components/LogoUpload";
import { CampaignPill, Crest, FieldSvg, Pill } from "@/components/visuals";
import { CLUB_STATUS_LABELS } from "@/lib/labels";
import { formatDate, formatMoney } from "@/lib/format";
import { formatPhone, maskPhone } from "@/lib/phone";
import { providerLabel } from "@/lib/payments/providers";
import type { Campaign } from "@/lib/types";
import { RegisterClubForm } from "./RegisterClubForm";

export const metadata: Metadata = { title: "Espace club" };

const NEXT_STEP: Partial<Record<Campaign["status"], string>> = {
  draft: "Compléter et envoyer en revue",
  changes_requested: "Corriger selon la note de Tribune",
  in_review: "Instruction par l'équipe Tribune",
  published: "Publier une nouvelle au moins une fois par mois",
  suspended: "Répondre à l'équipe Tribune",
  funded: "Publier les preuves des jalons",
};

export default async function ClubPage() {
  const viewer = await requireViewer("/club");
  if (!canUseClubSpace(viewer.profile.role)) redirect("/acces-refuse");
  const club = viewer.club;

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
          <div className="split">
            <RegisterClubForm />
            <aside className="panel">
              <h3>Ce qui se passe ensuite</h3>
              <ol className="steps">
                <li className="now">
                  <span className="dot">1</span>
                  <div>
                    <b>Vérification du club</b>
                    <span className="small muted">Identité du club, du président et du compte de versement</span>
                  </div>
                  <span />
                </li>
                <li>
                  <span className="dot">2</span>
                  <div>
                    <b>Dépôt d&apos;une campagne</b>
                    <span className="small muted">Objectif, budget, calendrier, jalons</span>
                  </div>
                  <span />
                </li>
                <li>
                  <span className="dot">3</span>
                  <div>
                    <b>Instruction et publication</b>
                    <span className="small muted">6 jours en moyenne</span>
                  </div>
                  <span />
                </li>
              </ol>
            </aside>
          </div>
        ) : (
          <p className="muted">Votre rôle ne permet pas d&apos;inscrire un club.</p>
        )}
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("*").eq("club_id", club.id).order("created_at", { ascending: false });
  const campaigns = (data ?? []) as Campaign[];
  const canCreate = club.status === "verified" && can(viewer.profile.role, "club:manage");

  return (
    <>
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
      <div className="wrap page">
        {club.status === "pending" ? (
          <p className="flash info">
            Votre demande a bien été reçue le {formatDate(club.created_at)}. L&apos;équipe Tribune vérifie le club avant
            que vous puissiez créer une campagne. Ajoutez votre logo en attendant.
          </p>
        ) : null}
        {club.status === "suspended" ? (
          <p className="flash error">Le club est suspendu{club.review_note ? ` : ${club.review_note}` : "."}</p>
        ) : null}

        <div className="sec-head">
          <h2 style={{ fontSize: "1.8rem" }}>Mes campagnes</h2>
          {canCreate ? (
            <Link className="btn btn-primary btn-sm" href="/club/campagnes/nouvelle">
              Nouvelle campagne
            </Link>
          ) : null}
        </div>
        {campaigns.length ? (
          <div className="tbl-wrap" style={{ marginBottom: 36 }}>
            <table>
              <thead>
                <tr>
                  <th>Campagne</th>
                  <th>Statut</th>
                  <th className="r">Collecté</th>
                  <th className="r">Objectif</th>
                  <th>Prochaine étape</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/club/campagnes/${c.id}`}>{c.title}</Link>
                    </td>
                    <td>
                      <CampaignPill status={c.status} />
                    </td>
                    <td className="r num">{formatMoney(c.raised_amount, c.currency)}</td>
                    <td className="r num">{formatMoney(c.goal_amount, c.currency)}</td>
                    <td className="small">{NEXT_STEP[c.status] ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel empty" style={{ marginBottom: 36 }}>
            <p>
              <b>Aucune campagne pour l&apos;instant.</b>
            </p>
            {canCreate ? <p className="small muted">Créez votre première campagne : elle reste un brouillon tant que vous ne l&apos;envoyez pas.</p> : null}
          </div>
        )}

        <div className="split half">
          <div className="panel">
            <h3>Présentation du club</h3>
            <ActionForm action={updateClubInfo}>
              <div className="two">
                <div className="field">
                  <label htmlFor="city">Ville</label>
                  <input type="text" id="city" name="city" defaultValue={club.city} />
                </div>
                <div className="field">
                  <label htmlFor="commune">Commune</label>
                  <input type="text" id="commune" name="commune" defaultValue={club.commune ?? ""} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="contact_phone">Téléphone de contact</label>
                <input type="tel" id="contact_phone" name="contact_phone" defaultValue={formatPhone(club.contact_phone)} />
              </div>
              <div className="two">
                <div className="field">
                  <label htmlFor="color_primary">Couleur principale</label>
                  <input type="color" id="color_primary" name="color_primary" defaultValue={club.color_primary} />
                </div>
                <div className="field">
                  <label htmlFor="color_secondary">Couleur secondaire</label>
                  <input type="color" id="color_secondary" name="color_secondary" defaultValue={club.color_secondary} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="description">Présentation</label>
                <textarea id="description" name="description" defaultValue={club.description} />
              </div>
              <SubmitButton className="btn btn-ghost btn-sm">Enregistrer</SubmitButton>
            </ActionForm>
          </div>
          <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
            <div className="panel">
              <h3>Logo</h3>
              <LogoUpload club={club} />
            </div>
            <div className="panel">
              <h3>Compte de versement</h3>
              <div className="recap small">
                <div>
                  <span className="muted">Numéro</span>
                  <span>{maskPhone(club.payout_phone)}</span>
                </div>
                <div>
                  <span className="muted">Opérateur</span>
                  <span>{club.payout_provider ? providerLabel(club.payout_provider) : "—"}</span>
                </div>
                <div>
                  <span className="muted">Statut du club</span>
                  <Pill tone={club.status === "verified" ? "ok" : club.status === "pending" ? "info" : "bad"}>
                    {CLUB_STATUS_LABELS[club.status]}
                  </Pill>
                </div>
              </div>
              <p className="small muted" style={{ marginTop: 10 }}>
                Pour changer de compte de versement, écrivez à l&apos;équipe Tribune : le changement est vérifié pour
                éviter les détournements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

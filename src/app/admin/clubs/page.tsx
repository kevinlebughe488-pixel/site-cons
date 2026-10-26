import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { createClient } from "@/lib/supabase/server";
import { addClubMember, reviewClub, setClubPayout } from "@/lib/actions/admin";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoUpload } from "@/components/LogoUpload";
import { Crest, Pill } from "@/components/visuals";
import { CLUB_STATUS_LABELS } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { DRC_PROVIDERS, providerLabel } from "@/lib/payments/providers";
import type { Club } from "@/lib/types";

export const metadata: Metadata = { title: "Clubs · Back-office" };

type ClubRow = Club & { members: { member_role: string; profile: { first_name: string; last_name: string; email: string | null } | null }[] };

export default async function AdminClubsPage() {
  const { profile } = await requirePermission("backoffice:access", "/admin/clubs");
  const role = profile.role;
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("*, members:club_members(member_role, profile:profiles(first_name, last_name, email))")
    .order("status")
    .order("created_at", { ascending: false });
  const clubs = (data ?? []) as ClubRow[];
  const order: Club["status"][] = ["pending", "verified", "suspended", "rejected"];
  clubs.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));

  return (
    <>
      <h2>Clubs</h2>
      <p className="muted" style={{ marginBottom: 18 }}>
        Vérifiez l&apos;identité du club, de son président et du compte de versement avant d&apos;autoriser les campagnes.
      </p>
      <div style={{ display: "grid", gap: 14 }}>
        {clubs.map((c) => (
          <details key={c.id} className="box" open={c.status === "pending"}>
            <summary>
              <span style={{ display: "inline-flex", gap: 10, alignItems: "center", verticalAlign: "middle" }}>
                <Crest club={c} size={28} /> {c.name}{" "}
                <Pill tone={c.status === "verified" ? "ok" : c.status === "pending" ? "info" : "bad"}>{CLUB_STATUS_LABELS[c.status]}</Pill>
              </span>
            </summary>
            <div className="split half" style={{ marginTop: 14 }}>
              <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                <div className="recap small">
                  <div>
                    <span className="muted">Sigle · ville</span>
                    <span>
                      {c.short_name} · {[c.commune, c.city].filter(Boolean).join(", ")}
                    </span>
                  </div>
                  <div>
                    <span className="muted">Fondé en</span>
                    <span>{c.founded_year ?? "—"}</span>
                  </div>
                  <div>
                    <span className="muted">Président</span>
                    <span>{c.president_name}</span>
                  </div>
                  <div>
                    <span className="muted">Contact</span>
                    <span>{formatPhone(c.contact_phone)}</span>
                  </div>
                  <div>
                    <span className="muted">Versements</span>
                    <span>
                      {formatPhone(c.payout_phone)} · {c.payout_provider ? providerLabel(c.payout_provider) : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="muted">Demande reçue</span>
                    <span>{formatDate(c.created_at)}</span>
                  </div>
                  <div>
                    <span className="muted">Gestionnaires</span>
                    <span>
                      {c.members.map((m) => (m.profile ? `${m.profile.first_name} ${m.profile.last_name} (${m.profile.email})` : "?")).join(", ") || "—"}
                    </span>
                  </div>
                </div>
                {c.description ? <p className="small" style={{ whiteSpace: "pre-line" }}>{c.description}</p> : null}
                {c.review_note ? <p className="small muted">Note : {c.review_note}</p> : null}
              </div>
              <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
                {c.status === "pending" && can(role, "club:review") ? (
                  <ActionForm action={reviewClub}>
                    <input type="hidden" name="club_id" value={c.id} />
                    <div className="field">
                      <label htmlFor={`note-${c.id}`}>Note (obligatoire pour un refus)</label>
                      <input type="text" id={`note-${c.id}`} name="note" />
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <SubmitButton className="btn btn-primary btn-sm" name="decision" value="verify">
                        Vérifier le club
                      </SubmitButton>
                      <SubmitButton className="btn btn-ghost btn-sm" name="decision" value="reject">
                        Refuser
                      </SubmitButton>
                    </div>
                  </ActionForm>
                ) : null}
                {(c.status === "verified" || c.status === "suspended") && can(role, "club:suspend") ? (
                  <ActionForm action={reviewClub}>
                    <input type="hidden" name="club_id" value={c.id} />
                    {c.status === "verified" ? (
                      <div className="field">
                        <label htmlFor={`snote-${c.id}`}>Motif de suspension</label>
                        <input type="text" id={`snote-${c.id}`} name="note" />
                      </div>
                    ) : null}
                    <SubmitButton
                      className="btn btn-ghost btn-sm"
                      name="decision"
                      value={c.status === "verified" ? "suspend" : "reactivate"}
                      confirm={c.status === "verified" ? "Suspendre le club et ses campagnes en cours ?" : undefined}
                    >
                      {c.status === "verified" ? "Suspendre le club" : "Réactiver le club"}
                    </SubmitButton>
                  </ActionForm>
                ) : null}
                {c.status === "verified" && can(role, "club:assign_member") ? (
                  <>
                    <ActionForm action={addClubMember} className="inline-form">
                      <input type="hidden" name="club_id" value={c.id} />
                      <input type="text" name="email" placeholder="E-mail d'un gestionnaire à ajouter" aria-label="E-mail du gestionnaire" />
                      <SubmitButton className="btn btn-ghost btn-sm">Ajouter</SubmitButton>
                    </ActionForm>
                    <ActionForm action={setClubPayout} className="inline-form">
                      <input type="hidden" name="club_id" value={c.id} />
                      <input type="text" name="payout_phone" placeholder="Nouveau numéro de versement" aria-label="Numéro de versement" />
                      <select name="payout_provider" aria-label="Opérateur" defaultValue={c.payout_provider ?? DRC_PROVIDERS[0].code}>
                        {DRC_PROVIDERS.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="btn btn-ghost btn-sm">Changer</SubmitButton>
                    </ActionForm>
                  </>
                ) : null}
                <LogoUpload club={c} />
              </div>
            </div>
          </details>
        ))}
        {clubs.length === 0 ? <p className="muted">Aucun club inscrit pour l&apos;instant.</p> : null}
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { requireClubSpace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateClubInfo } from "@/lib/actions/club";
import { ActionForm, SubmitButton } from "@/components/forms";
import { LogoUpload } from "@/components/LogoUpload";
import { formatPhone } from "@/lib/phone";
import type { ClubDocument, ClubPrivate } from "@/lib/types";
import { DocumentList, PayoutSummary } from "../parts";

export const metadata: Metadata = { title: "Profil du club" };

export default async function ClubProfilePage() {
  const { club } = await requireClubSpace("/club/profil");
  const supabase = await createClient();
  const [{ data: privData }, { data: docData }] = await Promise.all([
    supabase.from("club_private").select("*").eq("club_id", club.id).maybeSingle<ClubPrivate>(),
    supabase.from("club_documents").select("id, club_id, kind, file_name, mime_type, size_bytes, created_at").eq("club_id", club.id).order("created_at"),
  ]);
  const docs = (docData ?? []) as ClubDocument[];

  return (
    <div className="wrap page">
      <div className="split half">
        <div className="panel">
          <h2 style={{ fontSize: "1.5rem", marginBottom: 6 }}>Présentation du club</h2>
          <p className="small muted" style={{ marginBottom: 12 }}>
            Affichée sur la page publique du club. Le nom officiel, le sigle et le représentant légal ne se changent qu&apos;auprès de
            l&apos;équipe Tribune.
          </p>
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
            <SubmitButton className="btn btn-primary btn-sm">Enregistrer</SubmitButton>
          </ActionForm>
        </div>
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className="panel">
            <LogoUpload club={club} />
          </div>
          <div className="panel">
            <h3>Compte de versement</h3>
            <PayoutSummary priv={privData ?? null} />
            <p className="small muted" style={{ marginTop: 10 }}>
              Pour changer de compte de versement, écrivez à l&apos;équipe Tribune : le changement est vérifié pour éviter les
              détournements.
            </p>
          </div>
          <div className="panel">
            <h3>Documents du dossier</h3>
            <p className="small muted" style={{ marginBottom: 10 }}>
              Les pièces envoyées à l&apos;inscription, visibles seulement par les gestionnaires du club et l&apos;équipe Tribune.
            </p>
            <DocumentList docs={docs} editable={false} />
          </div>
        </div>
      </div>
    </div>
  );
}

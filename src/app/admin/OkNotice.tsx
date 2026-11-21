"use client";

import { useSearchParams } from "next/navigation";

// Messages de confirmation après une décision qui fait disparaître son formulaire.
// Seules des clés connues sont acceptées dans l'adresse, jamais du texte libre.
export const OK_MESSAGES = {
  club_verify: "Club vérifié. Ses gestionnaires peuvent maintenant créer des campagnes.",
  club_request_changes: "Compléments demandés au club : il est prévenu et peut compléter son dossier.",
  club_reject: "Demande d'inscription refusée.",
  club_suspend: "Club suspendu, ainsi que ses campagnes en cours.",
  club_reactivate: "Club réactivé.",
  campaign_approve: "Campagne publiée.",
  campaign_request_changes: "Corrections demandées au club.",
  campaign_reject: "Dossier refusé.",
  campaign_suspend: "Campagne suspendue.",
  campaign_reactivate: "Campagne réactivée.",
  campaign_close: "Campagne clôturée.",
  update_publish: "Nouvelle publiée.",
  update_reject: "Nouvelle refusée : le club est prévenu du motif.",
  update_withdraw: "Publication retirée : elle n'est plus visible et le club est prévenu du motif.",
  comment_hide: "Commentaire masqué.",
  comment_keep: "Commentaire conservé, signalements effacés.",
  kyc_approve: "Identité vérifiée.",
  kyc_reject: "Pièce d'identité refusée.",
  refund: "Remboursement demandé. Il sera confirmé par l'opérateur.",
  refresh: "État revérifié auprès de l'opérateur.",
  fee_paid: "Règlement des frais de publication enregistré.",
  settings: "Réglages enregistrés.",
} as const;

export type OkKey = keyof typeof OK_MESSAGES;

export function OkNotice() {
  const key = useSearchParams().get("ok");
  if (!key || !(key in OK_MESSAGES)) return null;
  return (
    <p className="flash success" role="status">
      {OK_MESSAGES[key as OkKey]}
    </p>
  );
}

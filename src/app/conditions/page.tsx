import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/LegalPage";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = { title: "Conditions d'utilisation et mentions légales" };

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Conditions d'utilisation"
      title="Les règles de Tribune"
      intro="Ces conditions s'appliquent à toute personne qui utilise Tribune : supporters, clubs et visiteurs. En créant un compte, vous les acceptez."
      sections={[
        {
          title: "1. Ce qu'est Tribune",
          body: (
            <p>
              Tribune est une plateforme de {LEGAL.company} qui met en relation des clubs et leurs supporters pour financer
              des projets sous forme de <b>dons</b>. Une contribution ne donne droit à aucun rendement ni remboursement
              d&apos;un capital. {LEGAL.company} ne reçoit pas de dépôts du public, ne prête pas et n&apos;investit pas pour
              son propre compte.
            </p>
          ),
        },
        {
          title: "2. Votre compte",
          body: (
            <ul>
              <li>Tribune est réservée aux personnes de <b>18 ans ou plus</b>.</li>
              <li>Vos informations doivent être exactes. Un numéro de téléphone ne sert qu&apos;à un seul compte.</li>
              <li>Votre numéro est confirmé par un code SMS à l&apos;inscription ; après un mot de passe incorrect, un code ou un lien de connexion vous est envoyé. Ne communiquez jamais ces codes ni votre mot de passe.</li>
              <li>Nous pouvons suspendre un compte en cas de fraude, d&apos;usurpation d&apos;identité ou de non-respect de ces règles.</li>
            </ul>
          ),
        },
        {
          title: "3. Les contributions",
          body: (
            <ul>
              <li>Le paiement se fait par Mobile Money (M-Pesa, Airtel Money, Orange Money) via notre prestataire de paiement.</li>
              <li>Le montant minimum, et parfois un maximum par supporter, sont fixés par le club et affichés avant de payer.</li>
              <li>Vous payez exactement le montant choisi : la commission de 5 % de Tribune est incluse et affichée avant le paiement.</li>
              <li>Chaque contribution reçoit un reçu et est inscrite au registre de la campagne (prénom et initiale, ou « anonyme »).</li>
            </ul>
          ),
        },
        {
          id: "remboursements",
          title: "4. Remboursements",
          body: (
            <ul>
              <li>
                <b>Tout ou rien :</b> si l&apos;objectif n&apos;est pas atteint à la date de fin, chaque contribution est
                remboursée en totalité sur le compte Mobile Money qui a payé, sans commission.
              </li>
              <li>Si une campagne est arrêtée par l&apos;équipe Tribune (doute sérieux, fraude), les contributions sont remboursées.</li>
              <li>Un paiement qui échoue n&apos;est pas débité. En cas de débit en double ou par erreur, écrivez-nous : nous vérifions auprès de l&apos;opérateur et remboursons ce qui a été pris à tort.</li>
              <li>Une contribution à une campagne qui a atteint son objectif est un don au club : elle n&apos;est pas remboursable, sauf dans les cas ci-dessus.</li>
            </ul>
          ),
        },
        {
          title: "5. Les clubs",
          body: (
            <ul>
              <li>L&apos;inscription d&apos;un club est gratuite mais ne donne aucun droit avant sa vérification (existence du club, représentant légal, compte de versement au nom du club).</li>
              <li>Chaque campagne est instruite avant publication. Des frais d&apos;instruction et de publication et une commission de 5 % sur les fonds collectés s&apos;appliquent ; ils sont affichés avant le dépôt.</li>
              <li>Les fonds sont versés au club par tranches, après la preuve de chaque jalon. Le club s&apos;engage à utiliser l&apos;argent comme annoncé et à rendre compte aux supporters.</li>
            </ul>
          ),
        },
        {
          title: "6. Commentaires et contenus publiés",
          body: (
            <p>
              Sont interdits : insultes, propos haineux, menaces, publicité, fausses informations, données personnelles
              d&apos;autrui (numéros, adresses). Les commentaires peuvent être signalés ; l&apos;équipe Tribune masque ceux
              qui ne respectent pas ces règles. Les nouvelles des clubs sont relues avant publication.
            </p>
          ),
        },
        {
          title: "7. Responsabilité",
          body: (
            <p>
              Chaque projet reste sous la responsabilité du club qui le porte. Tribune vérifie les clubs et les dossiers et
              suit les jalons, mais ne garantit pas la réalisation d&apos;un projet. Nous faisons notre possible pour que le
              site soit disponible et sûr, sans pouvoir exclure une interruption.
            </p>
          ),
        },
        {
          id: "reclamations",
          title: "8. Réclamations et droit applicable",
          body: (
            <p>
              Pour toute réclamation, écrivez à {LEGAL.email} en indiquant la campagne et la référence de votre reçu : nous
              répondons dans les meilleurs délais en précisant la suite donnée. Ces conditions sont soumises au droit de la
              République démocratique du Congo. Les données personnelles sont traitées comme décrit dans la{" "}
              <Link href="/confidentialite">politique de confidentialité</Link>.
            </p>
          ),
        },
        {
          id: "mentions-legales",
          title: "Mentions légales",
          body: (
            <ul>
              <li>
                Éditeur : {LEGAL.company}, {LEGAL.form}. RCCM : {LEGAL.rccm}. Id. Nat. : {LEGAL.idNat}.
              </li>
              <li>Siège : {LEGAL.address}.</li>
              <li>Directeur de la publication : {LEGAL.publisher}. Contact : {LEGAL.email}.</li>
              <li>Hébergement du site : Vercel Inc. (États-Unis). Base de données et fichiers : Supabase, serveurs situés dans l&apos;Union européenne.</li>
              <li>Les noms et logos des clubs sont la propriété de leurs titulaires.</li>
            </ul>
          ),
        },
      ]}
    />
  );
}

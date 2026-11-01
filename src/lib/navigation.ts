// Navigation propre à chaque rôle : chacun ne voit que les liens de son espace.
// (Les pages vérifient elles-mêmes les droits : ceci ne règle que l'affichage.)
import { can, canUseClubSpace } from "@/lib/rbac";
import type { Viewer } from "@/lib/auth";
import type { ClubStatus } from "@/lib/types";

export type NavLink = { href: string; label: string };
export type FooterColumn = { title: string; links: NavLink[] };

export type Navigation = {
  /** Page d'accueil du rôle (logo, « Retour à l'accueil »). */
  home: string;
  /** Sous-titre du logo. */
  tagline: string;
  items: NavLink[];
  /** Lien du nom de l'utilisateur dans l'en-tête. */
  accountLabel: string;
  footer: FooterColumn[];
  footerBlurb: string;
};

const PUBLIC_BLURB =
  "Plateforme de financement participatif des clubs de football par leurs supporters, opérée par Plumes Capital. Chaque campagne est vérifiée avant publication et suivie jusqu'à sa clôture.";

const TRUST: FooterColumn = {
  title: "Confiance",
  links: [
    { href: "/comment-ca-marche#plumes-capital", label: "Qui sommes-nous" },
    { href: "/comment-ca-marche#securite", label: "Sécurité des paiements" },
    { href: "/comment-ca-marche#securite", label: "Données personnelles" },
    { href: "/comment-ca-marche#faq", label: "Réclamations" },
  ],
};

/** Lien vers l'espace club d'un compte supporter, selon l'avancement de son dossier. */
// Libellé court : l'état du dossier est affiché en tête de l'espace club (et notifié).
const CLUB_SPACE_LABEL: Partial<Record<ClubStatus, string>> = {
  rejected: "Inscrire mon club",
};

export function navigationFor(viewer: Viewer | null): Navigation {
  const role = viewer?.profile.role;

  // Équipe Tribune : uniquement le back-office.
  if (can(role, "backoffice:access")) {
    return {
      home: "/admin",
      tagline: "Back-office",
      // Les rubriques du back-office sont dans son menu latéral.
      items: [{ href: "/admin", label: "Back-office" }],
      accountLabel: "Mon profil",
      footer: [],
      footerBlurb: "Back-office de l'équipe Tribune. Chaque décision est inscrite au journal d'audit.",
    };
  }

  // Gestionnaire de club : son club et ses campagnes.
  if (can(role, "club:manage")) {
    const verified = viewer?.club?.status === "verified";
    const items: NavLink[] = [{ href: "/club", label: "Mon club" }];
    if (verified) items.push({ href: "/club/campagnes/nouvelle", label: "Nouvelle campagne" });
    items.push({ href: "/comment-ca-marche", label: "Règles pour les clubs" });
    return {
      home: "/club",
      tagline: viewer?.club ? `Espace club · ${viewer.club.short_name}` : "Espace club",
      items,
      accountLabel: "Mon profil",
      footer: [
        {
          title: "Mon club",
          links: [
            { href: "/club", label: "Mes campagnes" },
            ...(verified ? [{ href: "/club/campagnes/nouvelle", label: "Déposer une campagne" }] : []),
            { href: "/campagnes", label: "Campagnes publiées sur Tribune" },
            ...(verified && viewer?.club ? [{ href: `/clubs/${viewer.club.slug}`, label: "Page publique du club" }] : []),
          ],
        },
        {
          title: "Règles",
          links: [
            { href: "/comment-ca-marche", label: "Le parcours d'un club" },
            { href: "/comment-ca-marche#frais", label: "Frais et versements" },
            { href: "/comment-ca-marche#faq", label: "Questions fréquentes" },
          ],
        },
      ],
      footerBlurb: "Espace des gestionnaires de club : déposez vos campagnes, publiez vos nouvelles et les preuves de chaque jalon.",
    };
  }

  // Supporter connecté.
  if (viewer) {
    const items: NavLink[] = [
      { href: "/", label: "Accueil" },
      { href: "/campagnes", label: "Campagnes" },
      { href: "/clubs", label: "Clubs" },
      { href: "/actualites", label: "Actualités" },
      { href: "/classement", label: "Classement" },
      { href: "/compte", label: "Mes contributions" },
    ];
    // Compte ouvert pour un club : le dossier du club reste à portée de main.
    if (canUseClubSpace(role) && (viewer.club || viewer.profile.signup_intent === "club")) {
      items.splice(1, 0, { href: "/club", label: viewer.club ? (CLUB_SPACE_LABEL[viewer.club.status] ?? "Mon club") : "Inscrire mon club" });
    }
    // « Comment ça marche » reste dans le pied de page : l'en-tête doit tenir sur une ligne.
    return {
      home: "/",
      tagline: "Les supporters financent leur club",
      items,
      accountLabel: "Mon compte",
      footer: [
        {
          title: "Supporter",
          links: [
            { href: "/campagnes", label: "Toutes les campagnes" },
            { href: "/compte", label: "Mes contributions et reçus" },
            { href: "/compte#ambassadeur", label: "Mon lien d'ambassadeur" },
            { href: "/comment-ca-marche", label: "Comment ça marche" },
          ],
        },
        {
          title: "Votre club",
          links: [
            { href: "/club", label: viewer.club ? "Suivre ma demande" : "Inscrire mon club" },
            { href: "/clubs", label: "Tous les clubs" },
            { href: "/comment-ca-marche#frais", label: "Frais et règles" },
          ],
        },
        TRUST,
      ],
      footerBlurb: PUBLIC_BLURB,
    };
  }

  // Visiteur.
  return {
    home: "/",
    tagline: "Les supporters financent leur club",
    items: [
      { href: "/", label: "Accueil" },
      { href: "/campagnes", label: "Campagnes" },
      { href: "/clubs", label: "Clubs" },
      { href: "/actualites", label: "Actualités" },
      { href: "/classement", label: "Classement" },
      { href: "/comment-ca-marche", label: "Comment ça marche" },
    ],
    accountLabel: "Mon compte",
    footer: [
      {
        title: "Supporters",
        links: [
          { href: "/campagnes", label: "Toutes les campagnes" },
          { href: "/classement", label: "Campagnes les plus soutenues" },
          { href: "/inscription?profil=supporter", label: "Créer un compte supporter" },
        ],
      },
      {
        title: "Clubs",
        links: [
          { href: "/inscription?profil=club", label: "Inscrire mon club" },
          { href: "/clubs", label: "Tous les clubs" },
          { href: "/comment-ca-marche#club", label: "La vérification des clubs" },
          { href: "/comment-ca-marche#frais", label: "Frais et règles" },
        ],
      },
      TRUST,
    ],
    footerBlurb: PUBLIC_BLURB,
  };
}

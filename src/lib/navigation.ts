// Navigation propre à chaque rôle : chacun ne voit que les liens de son espace.
// (Les pages vérifient elles-mêmes les droits : ceci ne règle que l'affichage.)
import { can, canUseClubSpace } from "@/lib/rbac";
import type { Viewer } from "@/lib/auth";
import type { ClubStatus } from "@/lib/types";

export type NavLink = { href: string; label: string; description?: string };
export type FooterColumn = { title: string; links: NavLink[] };

/** Entrée du menu du haut : un lien, ou une catégorie qui s'ouvre sur ses liens. */
export type NavItem = { label: string; href?: string; children?: NavLink[] };

export type Navigation = {
  /** Page d'accueil du rôle (logo, « Retour à l'accueil »). */
  home: string;
  /** Sous-titre du logo. */
  tagline: string;
  /** Menu du haut, regroupé en catégories pour tenir sur une ligne. */
  items: NavItem[];
  /** Lien du nom de l'utilisateur dans l'en-tête. */
  accountLabel: string;
  /** Liens du menu du compte (sous le nom de l'utilisateur). */
  accountLinks: NavLink[];
  footer: FooterColumn[];
  footerBlurb: string;
};

// Catégories communes au site public.
const CAMPAIGNS_MENU: NavItem = {
  label: "Campagnes",
  children: [
    { href: "/campagnes", label: "Toutes les campagnes", description: "Les projets en cours de financement" },
    { href: "/actualites", label: "Actualités des clubs", description: "Nouvelles des projets et vie des clubs" },
    { href: "/classement", label: "Classement", description: "Clubs et ambassadeurs les plus soutenus" },
  ],
};
const HOW_MENU: NavItem = {
  label: "Comment ça marche",
  children: [
    { href: "/comment-ca-marche", label: "Le fonctionnement", description: "Tout ou rien, Mobile Money, remboursement" },
    { href: "/comment-ca-marche#frais", label: "Frais", description: "Ce que paient les supporters et les clubs" },
    { href: "/comment-ca-marche#securite", label: "Sécurité des paiements", description: "Où va l'argent, qui le vérifie" },
    { href: "/comment-ca-marche#faq", label: "Questions fréquentes" },
  ],
};

const PUBLIC_BLURB =
  "Plateforme de financement participatif des clubs de football par leurs supporters, opérée par Plumes Capital. Chaque campagne est vérifiée avant publication et suivie jusqu'à sa clôture.";

const TRUST: FooterColumn = {
  title: "Confiance",
  links: [
    { href: "/comment-ca-marche#plumes-capital", label: "Qui sommes-nous" },
    { href: "/comment-ca-marche#securite", label: "Sécurité des paiements" },
    { href: "/conditions", label: "Conditions d'utilisation" },
    { href: "/confidentialite", label: "Confidentialité et cookies" },
    { href: "/conditions#mentions-legales", label: "Mentions légales" },
    { href: "/conditions#reclamations", label: "Réclamations" },
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
      items: [
        { href: "/admin", label: "Back-office" },
        {
          label: "Site public",
          children: [
            { href: "/campagnes", label: "Campagnes publiées" },
            { href: "/clubs", label: "Clubs vérifiés" },
            { href: "/actualites", label: "Actualités des clubs" },
          ],
        },
      ],
      accountLabel: "Mon profil",
      accountLinks: [
        { href: "/compte", label: "Mon profil" },
        { href: "/compte/mot-de-passe", label: "Modifier mon mot de passe" },
      ],
      footer: [],
      footerBlurb: "Back-office de l'équipe Tribune. Chaque décision est inscrite au journal d'audit.",
    };
  }

  // Gestionnaire de club : son club et ses campagnes.
  if (can(role, "club:manage")) {
    const verified = viewer?.club?.status === "verified";
    const space = verified || viewer?.club?.status === "suspended";
    const items: NavItem[] = [
      space
        ? {
            label: "Mon club",
            children: [
              { href: "/club", label: "Tableau de bord", description: "À faire, chiffres, dernières nouvelles" },
              { href: "/club/campagnes", label: "Campagnes", description: "Vos campagnes et leur avancement" },
              ...(verified ? [{ href: "/club/campagnes/nouvelle", label: "Nouvelle campagne", description: "Un parcours en six étapes" }] : []),
              { href: "/club/actualites", label: "Actualités", description: "Publier une nouvelle du club" },
              { href: "/club/profil", label: "Profil du club", description: "Présentation, logo, compte de versement" },
            ],
          }
        : { href: "/club", label: "Mon club" },
      {
        label: "Règles et aide",
        children: [
          { href: "/comment-ca-marche", label: "Le parcours d'un club" },
          { href: "/comment-ca-marche#frais", label: "Frais et versements" },
          { href: "/comment-ca-marche#faq", label: "Questions fréquentes" },
        ],
      },
      {
        label: "Site public",
        children: [
          { href: "/campagnes", label: "Campagnes publiées" },
          ...(verified && viewer?.club ? [{ href: `/clubs/${viewer.club.slug}`, label: "Page publique du club" }] : []),
          { href: "/actualites", label: "Actualités des clubs" },
        ],
      },
    ];
    return {
      home: "/club",
      tagline: viewer?.club ? `Espace club · ${viewer.club.short_name}` : "Espace club",
      items,
      accountLabel: "Mon profil",
      accountLinks: [
        { href: "/compte", label: "Mon profil" },
        { href: "/compte/mot-de-passe", label: "Modifier mon mot de passe" },
      ],
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
    // Compte ouvert pour un club : le dossier du club reste à portée de main.
    const clubLink: NavLink | null =
      canUseClubSpace(role) && (viewer.club || viewer.profile.signup_intent === "club")
        ? {
            href: "/club",
            label: viewer.club ? (CLUB_SPACE_LABEL[viewer.club.status] ?? "Mon dossier de club") : "Inscrire mon club",
            description: viewer.club ? "Suivre l'inscription de votre club" : "Ouvrir le dossier de votre club",
          }
        : null;
    const items: NavItem[] = [
      CAMPAIGNS_MENU,
      {
        label: "Clubs",
        children: [
          { href: "/clubs", label: "Tous les clubs", description: "L'annuaire des clubs vérifiés" },
          clubLink ?? { href: "/inscription?profil=club", label: "Inscrire un club", description: "Pour les représentants de club" },
          { href: "/comment-ca-marche#club", label: "La vérification des clubs" },
        ],
      },
      HOW_MENU,
    ];
    return {
      home: "/",
      tagline: "Les supporters financent leur club",
      items,
      accountLabel: "Mon compte",
      accountLinks: [
        { href: "/compte", label: "Mes contributions et reçus" },
        ...(clubLink ? [clubLink] : []),
        { href: "/compte#ambassadeur", label: "Mon lien d'ambassadeur" },
        { href: "/compte/mot-de-passe", label: "Modifier mon mot de passe" },
      ],
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
      CAMPAIGNS_MENU,
      {
        label: "Clubs",
        children: [
          { href: "/clubs", label: "Tous les clubs", description: "L'annuaire des clubs vérifiés" },
          { href: "/inscription?profil=club", label: "Inscrire mon club", description: "Gratuit, vérifié par l'équipe Tribune" },
          { href: "/comment-ca-marche#club", label: "La vérification des clubs" },
        ],
      },
      HOW_MENU,
    ],
    accountLabel: "Mon compte",
    accountLinks: [],
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

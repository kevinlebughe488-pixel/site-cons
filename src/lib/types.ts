import type { Role } from "@/lib/rbac";

export type ClubStatus = "draft" | "pending" | "changes_requested" | "verified" | "rejected" | "suspended";
export type CampaignStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "rejected"
  | "published"
  | "suspended"
  | "funded"
  | "failed";
export type ContributionStatus = "initiated" | "pending" | "completed" | "failed" | "refund_pending" | "refunded";
export type KycStatus = "none" | "pending" | "verified" | "rejected";
export type UpdateStatus = "pending" | "published" | "rejected";
export type PaymentProviderName = "pawapay" | "simulation";

export type Profile = {
  id: string;
  email: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  role: Role;
  residence: "rdc" | "diaspora";
  country: string | null;
  city: string | null;
  followed_club_id: string | null;
  newsletter: boolean;
  consent_at: string;
  kyc_status: KycStatus;
  kyc_doc_type: string | null;
  kyc_doc_last4: string | null;
  kyc_declared_at: string | null;
  kyc_reviewed_at: string | null;
  /** Choix fait à l'inscription : « Je suis supporter » ou « Je représente un club ». */
  signup_intent: "supporter" | "club";
  /** Code du lien d'ambassadeur (?ref=…). */
  referral_code: string | null;
  /** Accepte d'apparaître sous son prénom dans le classement des ambassadeurs. */
  ambassador_public: boolean;
  created_at: string;
};

export type Club = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  color_primary: string;
  color_secondary: string;
  /** Discipline sportive (football par défaut). */
  sport: string;
  city: string;
  commune: string | null;
  /** Date de création (AAAA-MM-JJ) ; founded_year en est l'année. */
  founded_on: string | null;
  founded_year: number | null;
  description: string;
  /** Nom du représentant légal du club. */
  president_name: string;
  contact_phone: string;
  logo_path: string | null;
  status: ClubStatus;
  review_note: string | null;
  submitted_at: string | null;
  created_at: string;
};

/** Partie privée du dossier d'un club : membres du club et équipe Tribune seulement. */
export type ClubPrivate = {
  club_id: string;
  address: string;
  legal_id: string | null;
  rep_title: string;
  rep_phone: string | null;
  rep_email: string | null;
  payout_method: "mobile_money" | "bank";
  payout_holder: string;
  payout_phone: string | null;
  payout_provider: string | null;
  bank_name: string | null;
  bank_account: string | null;
  updated_at: string;
};

export type ClubDocumentKind =
  | "statuts"
  | "enregistrement"
  | "affiliation"
  | "pv_dirigeants"
  | "identite_representant"
  | "mandat"
  | "compte_versement"
  | "autre";

export type ClubDocument = {
  id: string;
  club_id: string;
  kind: ClubDocumentKind;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};

export type Campaign = {
  id: string;
  club_id: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  description: string;
  goal_amount: number;
  currency: "USD" | "CDF";
  /** Date de fin : provisoire au brouillon, fixée à la publication (publication + durée). */
  end_date: string;
  /** Durée de la collecte, en jours, à partir de la publication. */
  duration_days: number;
  /** Contribution minimum par supporter. */
  min_contribution: number;
  /** Plafond du cumul des contributions d'un même supporter (null : pas de plafond). */
  max_contribution: number | null;
  /** Photo de couverture (bucket public « campaign-images »). */
  cover_path: string | null;
  /** Niveau du dernier contrôle automatique de conformité. */
  compliance_level: ComplianceLevel | null;
  goal_reached_at: string | null;
  status: CampaignStatus;
  raised_amount: number;
  backers_count: number;
  review_note: string | null;
  submitted_at: string | null;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
};

export type CampaignWithClub = Campaign & {
  club: Pick<
    Club,
    "id" | "name" | "short_name" | "color_primary" | "color_secondary" | "city" | "commune" | "founded_year" | "slug" | "logo_path" | "sport"
  >;
};

export type BudgetLine = {
  id: string;
  position: number;
  label: string;
  /** Montant total du poste (quantité × prix unitaire). */
  amount: number;
  quantity: number;
  /** Article du référentiel des prix choisi par le club (null : « autre »). */
  reference_id: string | null;
};

export type ComplianceLevel = "ok" | "warn" | "block";

/** Prix normal d'un article ou d'un service, tenu par l'équipe conformité. */
export type PriceReference = {
  id: string;
  label: string;
  category: string;
  unit: string;
  unit_price: number;
  keywords: string[];
  source: string;
  active: boolean;
  confirmed_at: string | null;
  updated_at: string;
};

export type CampaignDocumentKind = "devis" | "facture" | "autre";

export const CAMPAIGN_DOCUMENT_KINDS: { id: CampaignDocumentKind; label: string }[] = [
  { id: "devis", label: "Devis ou facture pro forma du fournisseur" },
  { id: "facture", label: "Facture d'achat" },
  { id: "autre", label: "Autre justificatif" },
];

/** Devis et justificatifs de prix joints à une campagne (bucket privé). */
export type CampaignDocument = {
  id: string;
  campaign_id: string;
  kind: CampaignDocumentKind;
  supplier: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
};
export type Milestone = {
  id: string;
  position: number;
  label: string;
  target_label: string;
  done_at: string | null;
  proof_note: string | null;
};
export type NewsAudience = "public" | "contributors";

/** Nouvelle d'une campagne, actualité du club (sans campagne) ou message réservé aux contributeurs. */
export type CampaignUpdate = {
  id: string;
  campaign_id: string | null;
  club_id: string;
  audience: NewsAudience;
  title: string;
  body: string;
  status: UpdateStatus;
  review_note: string | null;
  created_at: string;
  published_at: string | null;
};

export type Notification = {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  campaign_id: string | null;
  club_id: string | null;
  created_at: string;
  read_at: string | null;
};

/** Commentaire tel que le renvoie le fil public (aucun identifiant de compte). */
export type CommentRow = {
  id: string;
  parent_id: string | null;
  author_label: string;
  author_kind: "supporter" | "club";
  body: string;
  created_at: string;
  is_backer: boolean;
  is_mine: boolean;
};

export type Contribution = {
  id: string;
  campaign_id: string;
  user_id: string;
  amount: number;
  currency: "USD" | "CDF";
  commission: number;
  net_amount: number;
  status: ContributionStatus;
  payment_provider: PaymentProviderName;
  mmo_provider: string;
  payer_phone: string;
  anonymous: boolean;
  provider_transaction_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  completed_at: string | null;
  refunded_at: string | null;
  /** Ambassadeur dont le lien a amené cette contribution. */
  referred_by: string | null;
};

export type Refund = {
  id: string;
  contribution_id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  reason: string;
  failure_code: string | null;
  failure_message: string | null;
  created_at: string;
  completed_at: string | null;
};

export type PlatformSettings = {
  /** Frais d'instruction et de publication facturés au club par campagne publiée (USD). */
  publication_fee: number;
  /** Début de l'année 1 du plan d'affaires (AAAA-MM-JJ). */
  launch_date: string | null;
};

/** Frais d'instruction et de publication d'une campagne, facturés à sa publication. */
export type PublicationFee = {
  campaign_id: string;
  amount: number;
  currency: "USD";
  invoiced_at: string;
  paid_at: string | null;
  payment_ref: string | null;
};

export type AuditEntry = {
  id: number;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export const CAMPAIGN_CATEGORIES = [
  "Infrastructure",
  "Formation des jeunes",
  "Déplacement",
  "Transport",
  "Santé",
  "Équipement",
] as const;

/** Critères d'instruction à confirmer avant de publier une campagne (plan d'affaires, § 7.1.1). */
export const REVIEW_CRITERIA = [
  { id: "clarte", label: "Clarté", hint: "Le projet, le budget et l'usage des fonds sont compréhensibles par un supporter." },
  { id: "faisabilite", label: "Faisabilité", hint: "L'objectif, le calendrier et les jalons sont réalistes pour ce club." },
  { id: "coherence", label: "Cohérence", hint: "Le projet sert le club et ses supporters, et les preuves des jalons pourront être publiées." },
  {
    id: "authenticite",
    label: "Authenticité",
    hint: "Les devis et les photos sont vérifiés : le fournisseur a été contacté et la situation montrée est bien celle du club.",
  },
] as const;

/** Points de contrôle à confirmer avant de vérifier un club. */
export const CLUB_REVIEW_CRITERIA = [
  {
    id: "existence",
    label: "Existence du club",
    hint: "Les documents (statuts, enregistrement, affiliation) correspondent au nom, au sigle, à la discipline et à la ville déclarés.",
  },
  {
    id: "representant",
    label: "Représentant légal",
    hint: "Le représentant est identifié et joignable ; la personne qui inscrit le club en est un dirigeant ou est mandatée.",
  },
  {
    id: "compte",
    label: "Compte de versement",
    hint: "Le compte qui recevra les fonds est au nom du club (ou de son trésorier mandaté) : pas au nom d'un particulier sans mandat.",
  },
] as const;

/** Pièces du dossier d'un club. Les trois premières attestent l'existence du club (au moins une est exigée). */
export const CLUB_DOCUMENT_KINDS: { id: ClubDocumentKind; label: string; proof: boolean }[] = [
  { id: "statuts", label: "Statuts du club", proof: true },
  { id: "enregistrement", label: "Enregistrement officiel (personnalité juridique, arrêté, RCCM…)", proof: true },
  { id: "affiliation", label: "Attestation d'affiliation (fédération, ligue ou entente)", proof: true },
  { id: "pv_dirigeants", label: "Procès-verbal désignant les dirigeants", proof: false },
  { id: "identite_representant", label: "Pièce d'identité du représentant légal", proof: false },
  { id: "mandat", label: "Mandat du représentant (si vous n'êtes pas le représentant légal)", proof: false },
  { id: "compte_versement", label: "Justificatif du compte de versement", proof: false },
  { id: "autre", label: "Autre document", proof: false },
];

/** Disciplines proposées (le club peut en saisir une autre). */
export const SPORTS = ["Football", "Football féminin", "Futsal", "Basketball", "Volleyball", "Handball", "Athlétisme", "Boxe", "Judo", "Karaté", "Rugby", "Tennis de table"];

/** Durée de collecte et montants par supporter : bornes communes à l'éditeur, aux actions et à la base. */
export const CAMPAIGN_LIMITS = {
  minDuration: 14,
  maxDuration: 70,
  defaultDuration: 42,
  maxMinContribution: 1000,
} as const;

/** Statuts visibles par le public. */
export const PUBLIC_CAMPAIGN_STATUSES: CampaignStatus[] = ["published", "funded", "failed"];

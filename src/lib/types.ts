import type { Role } from "@/lib/rbac";

export type ClubStatus = "pending" | "verified" | "rejected" | "suspended";
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
  created_at: string;
};

export type Club = {
  id: string;
  slug: string;
  name: string;
  short_name: string;
  color_primary: string;
  color_secondary: string;
  city: string;
  commune: string | null;
  founded_year: number | null;
  description: string;
  president_name: string;
  contact_phone: string;
  payout_phone: string | null;
  payout_provider: string | null;
  logo_path: string | null;
  status: ClubStatus;
  review_note: string | null;
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
  end_date: string;
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
    "id" | "name" | "short_name" | "color_primary" | "color_secondary" | "city" | "commune" | "founded_year" | "slug" | "logo_path"
  >;
};

export type BudgetLine = { id: string; position: number; label: string; amount: number };
export type Milestone = {
  id: string;
  position: number;
  label: string;
  target_label: string;
  done_at: string | null;
  proof_note: string | null;
};
export type CampaignUpdate = {
  id: string;
  campaign_id: string;
  title: string;
  body: string;
  status: UpdateStatus;
  created_at: string;
  published_at: string | null;
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
] as const;

/** Statuts visibles par le public. */
export const PUBLIC_CAMPAIGN_STATUSES: CampaignStatus[] = ["published", "funded", "failed"];

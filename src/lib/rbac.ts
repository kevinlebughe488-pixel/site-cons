// Rôles et permissions de l'application.
//
// Ce tableau décide de ce que chaque rôle voit et peut faire dans l'interface.
// La base de données applique les mêmes règles de son côté (RLS et fonctions
// qui vérifient le rôle) : masquer un bouton ne suffit jamais à protéger une action.

export const ROLES = ["supporter", "club_manager", "compliance", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  supporter: "Supporter",
  club_manager: "Gestionnaire de club",
  compliance: "Chargé·e de conformité",
  admin: "Administrateur",
};

export type Permission =
  | "contribution:create"
  | "account:read"
  | "club:register"
  | "club:manage"
  | "backoffice:access"
  | "campaign:review"
  | "campaign:approve_large"
  | "campaign:suspend"
  | "campaign:close"
  | "update:review"
  | "club:review"
  | "club:suspend"
  | "club:assign_member"
  | "user:read"
  | "user:set_role"
  | "kyc:review"
  | "transaction:read"
  | "transaction:export"
  | "transaction:refund"
  | "audit:read";

const SUPPORTER: Permission[] = ["contribution:create", "account:read", "club:register"];

const COMPLIANCE: Permission[] = [
  ...SUPPORTER,
  "backoffice:access",
  "campaign:review",
  "update:review",
  "club:review",
  "user:read",
  "kyc:review",
  "transaction:read",
  "transaction:export",
  "audit:read",
];

const MATRIX: Record<Role, readonly Permission[]> = {
  supporter: SUPPORTER,
  club_manager: [...SUPPORTER, "club:manage"],
  compliance: COMPLIANCE,
  admin: [
    ...COMPLIANCE,
    "campaign:approve_large",
    "campaign:suspend",
    "campaign:close",
    "club:suspend",
    "club:assign_member",
    "user:set_role",
    "transaction:refund",
  ],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  return role ? MATRIX[role].includes(permission) : false;
}

export function isStaff(role: Role | null | undefined): boolean {
  return role === "compliance" || role === "admin";
}

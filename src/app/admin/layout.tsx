import { requirePermission } from "@/lib/auth";
import { can, ROLE_LABELS } from "@/lib/rbac";
import { paymentMode } from "@/lib/payments";
import { Suspense } from "react";
import { AdminNav } from "./AdminNav";
import { OkNotice } from "./OkNotice";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePermission("backoffice:access", "/admin");
  const role = profile.role;
  const links = [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/campagnes", label: "Campagnes" },
    { href: "/admin/clubs", label: "Clubs" },
    can(role, "update:review") && { href: "/admin/nouvelles", label: "Nouvelles à relire" },
    can(role, "user:read") && { href: "/admin/utilisateurs", label: "Comptes et rôles" },
    can(role, "transaction:read") && { href: "/admin/transactions", label: "Transactions" },
    can(role, "audit:read") && { href: "/admin/journal", label: "Journal d'audit" },
  ].filter(Boolean) as { href: string; label: string }[];

  let mode = "simulation";
  try {
    mode = paymentMode();
  } catch {
    mode = "non configuré";
  }

  return (
    <div className="bo">
      <aside aria-label="Menu back-office">
        <div className="eyebrow">Back-office · {ROLE_LABELS[role]}</div>
        <AdminNav links={links} />
        <div className="small muted" style={{ padding: "14px 10px 0" }}>
          Paiements : <span className="mode-badge">{mode}</span>
        </div>
      </aside>
      <div className="bo-main">
        <Suspense fallback={null}>
          <OkNotice />
        </Suspense>
        {children}
      </div>
    </div>
  );
}

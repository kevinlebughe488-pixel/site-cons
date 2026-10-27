// Vérifie que les règles d'accès tiennent quand on contourne l'interface :
// chaque test se connecte avec la clé publique, comme n'importe quel visiteur
// pourrait le faire, et tente une action interdite.
//   node scripts/check-rls.mjs   (après npm run seed:demo, sur une base de test)
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // variables déjà présentes
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PASSWORD = process.env.DEMO_PASSWORD || "Tribune-demo-2026";

async function as(email) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  if (email) {
    const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD });
    if (error) throw new Error(`connexion ${email} : ${error.message}`);
  }
  return client;
}

let failures = 0;
function expect(label, ok, detail = "") {
  console.log(`${ok ? "OK   " : "ÉCHEC"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}
const denied = (res) => Boolean(res.error) || (Array.isArray(res.data) && res.data.length === 0) || res.count === 0;

const anon = await as(null);
const supporter = await as("supporter@tribune.test");
const manager = await as("gestion.mazembe@tribune.test");
const compliance = await as("conformite@tribune.test");
const { data: me } = await supporter.auth.getUser();
const { data: anyCampaign } = await anon.from("campaigns").select("id, club_id, slug").eq("status", "published").limit(1).single();
const { data: vita } = await anon.from("campaigns").select("id, club_id").ilike("title", "%vestiaires%").single();

expect("visiteur : ne lit aucun profil", denied(await anon.from("profiles").select("id")));
expect("visiteur : ne lit aucune contribution", denied(await anon.from("contributions").select("id")));
expect("visiteur : voit les campagnes publiques", !!anyCampaign);
expect("visiteur : ne voit pas les brouillons", denied(await anon.from("campaigns").select("id").eq("status", "draft")));

const profiles = await supporter.from("profiles").select("id");
expect("supporter : ne lit que son propre profil", profiles.data?.length === 1 && profiles.data[0].id === me.user.id);
const contribs = await supporter.from("contributions").select("user_id");
expect("supporter : ne lit que ses contributions", (contribs.data ?? []).every((c) => c.user_id === me.user.id), `${contribs.data?.length} ligne(s)`);
expect("supporter : ne peut pas se donner le rôle admin", !!(await supporter.from("profiles").update({ role: "admin" }).eq("id", me.user.id)).error);
expect("supporter : ne peut pas se déclarer vérifié", !!(await supporter.from("profiles").update({ kyc_status: "verified" }).eq("id", me.user.id)).error);
expect(
  "supporter : ne peut pas créer une contribution « confirmée »",
  !!(await supporter.from("contributions").insert({ id: crypto.randomUUID(), campaign_id: anyCampaign.id, user_id: me.user.id, amount: 1000, currency: "USD", commission: 0, net_amount: 1000, status: "completed", payment_provider: "simulation", mmo_provider: "AIRTEL_COD", payer_phone: "243990000001" })).error,
);
expect("supporter : ne peut pas gonfler le montant collecté", !!(await supporter.from("campaigns").update({ raised_amount: 999999 }).eq("id", anyCampaign.id)).error);
expect("supporter : ne lit pas le journal d'audit", denied(await supporter.from("audit_log").select("id")));
expect("supporter : ne peut pas publier une campagne", !!(await supporter.rpc("review_campaign", { p_campaign_id: anyCampaign.id, p_decision: "approve" })).error);
expect("supporter : ne peut pas changer un rôle", !!(await supporter.rpc("admin_set_role", { p_user_id: me.user.id, p_role: "admin" })).error);
expect("supporter : ne peut pas appeler une fonction interne", !!(await supporter.rpc("write_audit", { p_action: "x", p_entity_type: "x", p_entity_id: "x" })).error);

expect(
  "gestionnaire TP Mazembe : ne peut pas modifier une campagne d'AS Vita Club",
  !!(await manager.rpc("save_campaign_draft", { p_campaign_id: vita.id, p_club_id: vita.club_id, p_slug: "x", p_title: "Piratage", p_category: "Santé", p_summary: "", p_description: "", p_goal: 100, p_end_date: "2027-01-01", p_budget: [], p_milestones: [] })).error,
);
expect("gestionnaire : ne peut pas changer le compte de versement du club", !!(await manager.from("clubs").update({ payout_phone: "243990000099" }).eq("id", anyCampaign.club_id)).error);
expect("gestionnaire : ne peut pas vérifier son propre club", !!(await manager.rpc("review_club", { p_club_id: anyCampaign.club_id, p_decision: "verify" })).error);

expect("conformité : lit toutes les contributions", ((await compliance.from("contributions").select("id", { count: "exact", head: true })).count ?? 0) > 10);
expect("conformité : ne peut pas suspendre une campagne (réservé admin)", !!(await compliance.rpc("set_campaign_suspension", { p_campaign_id: anyCampaign.id, p_suspend: true, p_note: "test" })).error);
expect("conformité : ne peut pas changer un rôle", !!(await compliance.rpc("admin_set_role", { p_user_id: me.user.id, p_role: "admin" })).error);
expect("conformité : ne peut pas déclarer une pièce d'identité (réservé supporter)", !!(await compliance.rpc("declare_identity", { p_doc_type: "passeport", p_doc_last4: "1234" })).error);
expect(
  "conformité : ne peut pas inscrire un club (réservé supporter)",
  !!(await compliance.rpc("register_club", { p_name: "Club test", p_short_name: "TST", p_slug: `club-test-${Date.now()}`, p_city: "Kinshasa", p_commune: null, p_founded_year: null, p_description: "", p_president_name: "Test", p_contact_phone: "243990000001", p_payout_phone: "243990000002", p_payout_provider: "AIRTEL_COD", p_color_primary: null, p_color_secondary: null })).error,
);
expect("gestionnaire : ne peut pas déclarer une pièce d'identité (réservé supporter)", !!(await manager.rpc("declare_identity", { p_doc_type: "passeport", p_doc_last4: "1234" })).error);
expect("conformité : ne peut pas écrire dans le journal", !!(await compliance.from("audit_log").insert({ action: "faux", entity_type: "x" })).error);

console.log(failures ? `\n${failures} test(s) en échec` : "\nToutes les règles d'accès tiennent.");
process.exit(failures ? 1 : 0);

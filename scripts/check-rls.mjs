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
const { data: managerClub } = await manager.from("club_members").select("club_id").limit(1).single();
const managerClubId = managerClub?.club_id;

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
expect("gestionnaire : ne peut pas changer le compte de versement du club", !!(await manager.from("club_private").update({ payout_phone: "243990000099" }).eq("club_id", anyCampaign.club_id)).error);
expect("gestionnaire : ne peut pas changer le compte de versement par la fonction réservée à l'administrateur", !!(await manager.rpc("admin_set_club_payout", { p_club_id: anyCampaign.club_id, p_data: { payout_method: "mobile_money", payout_holder: "Pirate", payout_phone: "0990000099", payout_provider: "AIRTEL_COD" } })).error);
expect("gestionnaire : ne peut pas vérifier son propre club", !!(await manager.rpc("review_club", { p_club_id: anyCampaign.club_id, p_decision: "verify" })).error);

expect("conformité : lit toutes les contributions", ((await compliance.from("contributions").select("id", { count: "exact", head: true })).count ?? 0) > 10);
expect("conformité : ne peut pas suspendre une campagne (réservé admin)", !!(await compliance.rpc("set_campaign_suspension", { p_campaign_id: anyCampaign.id, p_suspend: true, p_note: "test" })).error);
expect("conformité : ne peut pas changer un rôle", !!(await compliance.rpc("admin_set_role", { p_user_id: me.user.id, p_role: "admin" })).error);
expect("conformité : ne peut pas déclarer une pièce d'identité (réservé supporter)", !!(await compliance.rpc("declare_identity", { p_doc_type: "passeport", p_doc_last4: "1234" })).error);
const validDossier = {
  name: "Club test", short_name: "TST", slug: `club-test-${Date.now()}`, sport: "Football", city: "Kinshasa", address: "1, avenue du Stade",
  founded_on: "2010-05-01", rep_name: "Test Test", rep_title: "Président", rep_phone: "0990000001", payout_method: "mobile_money",
  payout_holder: "Club test", payout_phone: "0990000002", payout_provider: "AIRTEL_COD",
};
const complianceRegister = await compliance.rpc("register_club", { p_data: validDossier });
expect("conformité : ne peut pas inscrire un club (réservé supporter)", /compte personnel/.test(complianceRegister.error?.message ?? ""), complianceRegister.error?.message);
expect("gestionnaire : ne peut pas déclarer une pièce d'identité (réservé supporter)", !!(await manager.rpc("declare_identity", { p_doc_type: "passeport", p_doc_last4: "1234" })).error);
expect("supporter : ne lit aucune facture de frais", denied(await supporter.from("publication_fees").select("campaign_id")));
expect("visiteur : lit les tarifs publics", ((await anon.from("platform_settings").select("publication_fee")).data ?? []).length === 1);
expect("supporter : ne peut pas modifier les tarifs", !!(await supporter.rpc("admin_update_settings", { p_publication_fee: 0, p_launch_date: null })).error);
expect("supporter : ne lit pas les indicateurs du plan", !!(await supporter.rpc("plan_indicators", { p_from: "2000-01-01", p_to: "2100-01-01" })).error);
const fees = await manager.from("publication_fees").select("campaign_id, campaign:campaigns(club_id)");
expect("gestionnaire : ne lit que les frais de son club", (fees.data ?? []).length > 0 && (fees.data ?? []).every((f) => f.campaign?.club_id === fees.data[0].campaign?.club_id));
expect("gestionnaire : ne peut pas déclarer ses frais réglés", !!(await manager.rpc("record_publication_fee_payment", { p_campaign_id: anyCampaign.id, p_reference: "FAUX-123" })).error);
expect("conformité : ne peut pas enregistrer un règlement (réservé admin)", !!(await compliance.rpc("record_publication_fee_payment", { p_campaign_id: anyCampaign.id, p_reference: "FAUX-123" })).error);
const { data: inReview } = await compliance.from("campaigns").select("id").eq("status", "in_review").limit(1).single();
const noCriteria = await compliance.rpc("review_campaign", { p_campaign_id: inReview.id, p_decision: "approve", p_criteria: [] });
expect("conformité : ne peut pas publier sans les critères d'instruction", /critères/.test(noCriteria.error?.message ?? ""), noCriteria.error?.message);
expect("conformité : lit les indicateurs du plan", !(await compliance.rpc("plan_indicators", { p_from: "2000-01-01", p_to: "2100-01-01" })).error);
expect("conformité : ne peut pas écrire dans le journal", !!(await compliance.from("audit_log").insert({ action: "faux", entity_type: "x" })).error);

// ---------------------------------------------------------------------
// Dossier des clubs et procédure de vérification
// ---------------------------------------------------------------------
const pendingManager = await as("gestion.aigles@tribune.test");
const { data: aigles } = await anon.from("clubs").select("id").eq("slug", "les-aigles-du-congo").maybeSingle();
expect("visiteur : ne voit pas un club en cours de vérification", !aigles);
const { data: aiglesOwn } = await pendingManager.from("clubs").select("id, status").eq("slug", "les-aigles-du-congo").single();
expect("visiteur : ne lit aucun dossier privé de club", !!(await anon.from("club_private").select("club_id")).error);
expect("visiteur : le numéro de versement n'est plus dans la table publique des clubs", !!(await anon.from("clubs").select("payout_phone").limit(1)).error);
expect("supporter : ne lit aucun dossier privé de club", denied(await supporter.from("club_private").select("club_id")));
expect("supporter : ne lit aucun document de club", denied(await supporter.from("club_documents").select("id")));
const ownPrivate = await manager.from("club_private").select("club_id");
expect("gestionnaire : ne lit que le dossier privé de son club", (ownPrivate.data ?? []).length === 1 && ownPrivate.data[0].club_id === managerClubId);
expect("club en vérification : lit ses propres documents", ((await pendingManager.from("club_documents").select("id")).data ?? []).length >= 1);
expect(
  "club en vérification : ne peut pas créer de campagne",
  !!(await pendingManager.rpc("save_campaign_draft", { p_campaign_id: null, p_club_id: aiglesOwn.id, p_slug: "x", p_title: "Projet test", p_category: "Santé", p_summary: "", p_description: "", p_goal: 1000, p_duration_days: 30, p_min_contribution: 5, p_max_contribution: null, p_budget: [], p_milestones: [] })).error,
);
expect("club en vérification : ne peut pas modifier son dossier envoyé", !!(await pendingManager.rpc("update_club_registration", { p_club_id: aiglesOwn.id, p_data: validDossier })).error);
expect("club en vérification : ne peut pas se vérifier lui-même", !!(await pendingManager.rpc("review_club", { p_club_id: aiglesOwn.id, p_decision: "verify", p_criteria: ["existence", "representant", "compte"] })).error);
const noChecks = await compliance.rpc("review_club", { p_club_id: aiglesOwn.id, p_decision: "verify", p_criteria: [] });
expect("conformité : ne peut pas vérifier un club sans les trois points de contrôle", /points de contrôle/.test(noChecks.error?.message ?? ""), noChecks.error?.message);
const noNote = await compliance.rpc("review_club", { p_club_id: aiglesOwn.id, p_decision: "request_changes" });
expect("conformité : ne peut pas demander des compléments sans motif", /motif/.test(noNote.error?.message ?? ""), noNote.error?.message);
expect("conformité : ne peut pas changer un compte de versement (réservé admin)", !!(await compliance.rpc("admin_set_club_payout", { p_club_id: aiglesOwn.id, p_data: { payout_method: "bank", payout_holder: "X", bank_name: "Banque", bank_account: "123456" } })).error);

// ---------------------------------------------------------------------
// Communication : notifications, commentaires, messages, ambassadeurs
// ---------------------------------------------------------------------
const ownNotifs = await supporter.from("notifications").select("user_id");
expect("supporter : ne lit que ses notifications", (ownNotifs.data ?? []).length > 0 && ownNotifs.data.every((n) => n.user_id === me.user.id));
expect("supporter : ne peut pas créer de notification", !!(await supporter.from("notifications").insert({ user_id: me.user.id, kind: "faux", title: "Faux" })).error);
expect("visiteur : ne lit aucune notification", !!(await anon.from("notifications").select("id")).error || denied(await anon.from("notifications").select("id")));
expect("supporter : ne peut pas écrire un commentaire sans passer par la fonction", !!(await supporter.from("campaign_comments").insert({ campaign_id: anyCampaign.id, author_kind: "club", author_label: "Faux club", body: "Faux" })).error);
expect("visiteur : ne peut pas commenter", !!(await anon.rpc("post_comment", { p_campaign_id: anyCampaign.id, p_body: "Bonjour" })).error);
expect("visiteur : lit le fil public des commentaires", !(await anon.rpc("campaign_comments_feed", { p_campaign_id: anyCampaign.id })).error);
const feed = (await anon.rpc("campaign_comments_feed", { p_campaign_id: anyCampaign.id })).data ?? [];
expect("visiteur : le fil des commentaires ne contient aucun identifiant de compte", feed.every((c) => !("author_id" in c)));
expect("supporter : ne lit pas la table des commentaires (modération)", denied(await supporter.from("campaign_comments").select("id")));
const anyComment = feed[0];
if (anyComment) {
  expect("supporter : ne peut pas masquer un commentaire", !!(await supporter.rpc("moderate_comment", { p_comment_id: anyComment.id, p_hide: true, p_note: "test" })).error);
  expect("gestionnaire : ne peut pas masquer un commentaire", !!(await manager.rpc("moderate_comment", { p_comment_id: anyComment.id, p_hide: true, p_note: "test" })).error);
}
const otherClubCampaign = await manager.rpc("post_comment", { p_campaign_id: vita.id, p_body: "Je réponds au nom d'un autre club" });
expect("gestionnaire : ne peut pas commenter la campagne d'un autre club", !!otherClubCampaign.error, otherClubCampaign.error?.message);
expect("visiteur : ne lit pas les messages réservés aux contributeurs", denied(await anon.from("campaign_updates").select("id").eq("audience", "contributors")));
const outsider = await as("representant@tribune.test");
expect("supporter non contributeur : ne lit pas les messages réservés", denied(await outsider.from("campaign_updates").select("id").eq("audience", "contributors")));
expect("contributeur : lit le message qui lui est réservé", ((await supporter.from("campaign_updates").select("id").eq("audience", "contributors")).data ?? []).length >= 1);
expect("visiteur : ne lit pas une nouvelle en attente de relecture", denied(await anon.from("campaign_updates").select("id").eq("status", "pending")));
expect("supporter : ne peut pas changer son code d'ambassadeur", !!(await supporter.from("profiles").update({ referral_code: "pirate1" }).eq("id", me.user.id)).error);
expect("supporter : ne peut pas s'attribuer une contribution", !!(await supporter.from("contributions").update({ referred_by: me.user.id }).eq("campaign_id", anyCampaign.id)).error);
const ranking = (await anon.rpc("ambassador_ranking", { p_limit: 5 })).data ?? [];
expect("visiteur : le classement des ambassadeurs ne contient aucun identifiant", ranking.length > 0 && ranking.every((r) => Object.keys(r).sort().join() === "amount,is_me,label,rank,supporters"));
expect("gestionnaire : ne peut pas changer la photo d'une campagne publiée", !!(await manager.from("campaigns").update({ cover_path: "x.jpg" }).eq("club_id", anyCampaign.club_id)).error);

// ---------------------------------------------------------------------
// Contrôle de conformité : référentiel des prix, devis, contrôle automatique
// ---------------------------------------------------------------------
expect("visiteur : lit le référentiel des prix", ((await anon.from("price_references").select("id")).data ?? []).length > 0);
expect(
  "gestionnaire : ne peut pas modifier le référentiel des prix",
  !!(await manager.rpc("save_price_reference", { p_id: null, p_label: "Maillot pirate", p_category: "Équipement", p_unit: "pièce", p_unit_price: 999, p_keywords: [], p_source: "x", p_active: true })).error,
);
expect("gestionnaire : ne peut pas écrire directement dans le référentiel", !!(await manager.from("price_references").update({ unit_price: 9999 }).gt("unit_price", 0)).error);
expect("visiteur : ne lit aucun devis", !!(await anon.from("campaign_documents").select("id")).error || denied(await anon.from("campaign_documents").select("id")));
expect("supporter : ne lit aucun devis", denied(await supporter.from("campaign_documents").select("id")));
const ownDocs = await manager.from("campaign_documents").select("campaign:campaigns(club_id)");
expect("gestionnaire : ne lit que les devis de son club", (ownDocs.data ?? []).length > 0 && ownDocs.data.every((d) => d.campaign?.club_id === managerClubId));
expect("gestionnaire : ne peut pas ajouter un devis sans passer par le serveur", !!(await manager.from("campaign_documents").insert({ campaign_id: anyCampaign.id, kind: "devis", file_path: "x/y.pdf", file_name: "y.pdf", mime_type: "application/pdf", size_bytes: 10 })).error);
expect("supporter : ne lit pas le contrôle automatique d'une campagne", !!(await supporter.rpc("campaign_compliance", { p_campaign_id: anyCampaign.id })).error);
expect("gestionnaire : ne lit pas le contrôle d'une campagne d'un autre club", !!(await manager.rpc("campaign_compliance", { p_campaign_id: vita.id })).error);
expect("gestionnaire : ne peut pas appeler le calcul interne du contrôle", !!(await manager.rpc("compute_campaign_compliance", { p_campaign_id: vita.id })).error);
const control = await compliance.rpc("campaign_compliance", { p_campaign_id: inReview.id });
expect("conformité : lit le contrôle automatique", !control.error);
const priceCheck = (control.data?.checks ?? []).find((c) => c.id === "prix");
expect("contrôle : la location de bus à 3 fois le prix de référence est bloquante", priceCheck?.level === "block", priceCheck?.detail);
const inflated = await compliance.rpc("review_campaign", {
  p_campaign_id: inReview.id, p_decision: "approve", p_criteria: ["clarte", "faisabilite", "coherence", "authenticite"],
});
expect("conformité : ne peut pas publier un budget à 3 fois le prix de référence", /contrôle automatique/.test(inflated.error?.message ?? ""), inflated.error?.message);

expect("visiteur : ne voit pas les photos d'une campagne en préparation", denied(await anon.from("campaign_photos").select("id, campaign:campaigns!inner(status)").eq("campaign.status", "draft")));
expect("gestionnaire : ne peut pas ajouter une photo sans passer par le serveur", !!(await manager.from("campaign_photos").insert({ campaign_id: anyCampaign.id, file_path: "x/p.jpg", caption: "Fausse photo" })).error);
expect("gestionnaire : ne peut pas modifier la légende d'une photo", !!(await manager.from("campaign_photos").update({ caption: "Modifiée" }).eq("campaign_id", anyCampaign.id)).error);

// Plafonds fixés par le club : vérifiés par la base, même pour une écriture du serveur.
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  const server = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: capped } = await server.from("campaigns").select("id, min_contribution").gt("min_contribution", 1).eq("status", "published").limit(1).single();
  const below = await server.from("contributions").insert({ id: crypto.randomUUID(), campaign_id: capped.id, user_id: me.user.id, amount: 1, currency: "USD", commission: 0.05, net_amount: 0.95, status: "initiated", payment_provider: "simulation", mmo_provider: "AIRTEL_COD", payer_phone: "243990000001" });
  expect("base : refuse une contribution sous le minimum de la campagne", /minimum/.test(below.error?.message ?? ""), below.error?.message);
}

console.log(failures ? `\n${failures} test(s) en échec` : "\nToutes les règles d'accès tiennent.");
process.exit(failures ? 1 : 0);

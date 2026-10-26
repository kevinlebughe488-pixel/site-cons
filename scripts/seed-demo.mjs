// Données de démonstration avec de vrais clubs de la Linafoot (RDC).
//
//   npm run seed:demo -- --confirmer
//
// Crée des comptes de test (@tribune.test), des clubs, des campagnes FICTIVES
// et des contributions simulées (aucun argent réel). À utiliser sur une base
// locale ou un projet Supabase de test, jamais sur le site public : les projets
// présentés pour ces clubs sont inventés.
//
// Logos : déposez les fichiers dans scripts/demo-logos/ en les nommant d'après
// le slug du club (ex. tp-mazembe.png, as-vita-club.webp). Ils seront envoyés
// dans Supabase Storage. Sans fichier, le blason est dessiné avec les couleurs du club.
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile(".env.local");
} catch {
  // variables déjà présentes dans l'environnement
}

if (!process.argv.includes("--confirmer")) {
  console.error("Ce script crée des comptes et des campagnes fictives. Relancez avec --confirmer :");
  console.error("  npm run seed:demo -- --confirmer");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (.env.local).");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const PASSWORD = process.env.DEMO_PASSWORD || "Tribune-demo-2026";

// Générateur pseudo-aléatoire reproductible.
let seed = 20261026;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (list) => list[Math.floor(rand() * list.length)];
const daysAgo = (n, hour = 12) => new Date(Date.now() - n * 86_400_000 - (hour % 24) * 3_600_000).toISOString();
const dateIn = (days) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function must(promise, what) {
  const { data, error } = await promise;
  if (error) throw new Error(`${what} : ${error.message}`);
  return data;
}

// ---------------------------------------------------------------------
// Clubs (vrais clubs de RDC ; couleurs et présentations modifiables)
// ---------------------------------------------------------------------
const CLUBS = [
  { slug: "tp-mazembe", name: "TP Mazembe", short: "TPM", city: "Lubumbashi", year: 1939, c1: "#111111", c2: "#ffffff",
    description: "Club de Lubumbashi, cinq fois vainqueur de la Ligue des champions de la CAF." },
  { slug: "as-vita-club", name: "AS Vita Club", short: "ASV", city: "Kinshasa", year: 1935, c1: "#0b7a3b", c2: "#111111",
    description: "Club de Kinshasa, vainqueur de la Coupe des clubs champions africains en 1973." },
  { slug: "dc-motema-pembe", name: "DC Motema Pembe", short: "DCMP", city: "Kinshasa", year: 1936, c1: "#0a6b34", c2: "#ffffff",
    description: "Club de Kinshasa, vainqueur de la Coupe d'Afrique des vainqueurs de coupe en 1994." },
  { slug: "fc-saint-eloi-lupopo", name: "FC Saint-Éloi Lupopo", short: "LUP", city: "Lubumbashi", year: 1939, c1: "#1f4e9c", c2: "#ffffff",
    description: "Club historique de Lubumbashi, surnommé « les Cheminots »." },
  { slug: "as-maniema-union", name: "AS Maniema Union", short: "AMU", city: "Kindu", year: null, c1: "#b3261e", c2: "#ffffff",
    description: "Club de Kindu, dans la province du Maniema." },
  { slug: "cs-don-bosco", name: "CS Don Bosco", short: "CSDB", city: "Lubumbashi", year: null, c1: "#2c6e49", c2: "#f2c14e",
    description: "Club de Lubumbashi issu de l'œuvre salésienne." },
  { slug: "sm-sanga-balende", name: "SM Sanga Balende", short: "SMSB", city: "Mbuji-Mayi", year: null, c1: "#7a1f2b", c2: "#f2efe6",
    description: "Club de Mbuji-Mayi, dans le Kasaï-Oriental." },
  { slug: "fc-renaissance-du-congo", name: "FC Renaissance du Congo", short: "FCR", city: "Kinshasa", year: null, c1: "#d4a017", c2: "#1a1a1a",
    description: "Club de Kinshasa." },
  { slug: "oc-bukavu-dawa", name: "OC Bukavu Dawa", short: "OCBD", city: "Bukavu", year: null, c1: "#243f73", c2: "#ffffff",
    description: "Club de Bukavu, dans le Sud-Kivu." },
  // Demande d'inscription en attente, pour tester la vérification des clubs.
  { slug: "les-aigles-du-congo", name: "Les Aigles du Congo", short: "ADC", city: "Kinshasa", year: null, c1: "#4a2a6b", c2: "#e7e3ee",
    description: "Club de Kinshasa.", status: "pending" },
];

const FIRST = ["Patrick", "Christelle", "Jean-Marc", "Grâce", "Héritier", "Ruth", "Junior", "Prisca", "Cédric", "Divine", "Trésor", "Sarah",
  "Fiston", "Nadège", "Glody", "Merveille", "Dieudonné", "Esther", "Rodrigue", "Rachel", "Christian", "Blandine", "Serge", "Joëlle"];
const LAST = ["Mbuyi", "Kabongo", "Ilunga", "Mukendi", "Kalala", "Tshibangu", "Lukusa", "Ngalula", "Mulumba", "Kanku", "Mwamba", "Lubala",
  "Kasongo", "Mbombo", "Ntumba", "Kapinga", "Banza", "Kayembe", "Makiese", "Nzuzi", "Lokonda", "Mavungu", "Kiala", "Matondo"];
const PROVIDERS = [
  { code: "VODACOM_MPESA_COD", prefix: "81" },
  { code: "AIRTEL_COD", prefix: "99" },
  { code: "ORANGE_COD", prefix: "84" },
];

async function createUser(email, firstName, lastName, phone, extra = {}) {
  const { data, error } = await db.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName, phone, residence: extra.residence ?? "rdc", city: extra.city ?? "Kinshasa", country: "RDC" },
  });
  if (error) throw new Error(`Création du compte ${email} : ${error.message}`);
  return data.user.id;
}

async function main() {
  const existing = await must(db.from("clubs").select("id").eq("slug", "tp-mazembe").maybeSingle(), "lecture des clubs");
  if (existing) {
    console.error("Les données de démonstration sont déjà présentes (club tp-mazembe). Rien n'a été modifié.");
    process.exit(1);
  }

  console.log("Comptes de test…");
  const adminId = await createUser("admin@tribune.test", "Aline", "Mbala", "243810000001");
  const complianceId = await createUser("conformite@tribune.test", "Benjamin", "Kitenge", "243810000002");
  const managerIds = {
    "tp-mazembe": await createUser("gestion.mazembe@tribune.test", "Joseph", "Kalenga", "243990000011", { city: "Lubumbashi" }),
    "as-vita-club": await createUser("gestion.vita@tribune.test", "Mireille", "Nsimba", "243810000012"),
    "dc-motema-pembe": await createUser("gestion.dcmp@tribune.test", "Pascal", "Mpiana", "243840000013"),
    "les-aigles-du-congo": await createUser("gestion.aigles@tribune.test", "Arsène", "Bokele", "243820000014"),
  };
  await must(db.from("profiles").update({ role: "admin" }).eq("id", adminId), "rôle admin");
  await must(db.from("profiles").update({ role: "compliance" }).eq("id", complianceId), "rôle conformité");

  const supporters = [await createUser("supporter@tribune.test", "Gloire", "Mutombo", "243810000020")];
  for (let i = 0; i < FIRST.length; i++) {
    const p = PROVIDERS[i % PROVIDERS.length];
    const diaspora = i % 7 === 3;
    supporters.push(
      await createUser(
        `supporter${String(i + 1).padStart(2, "0")}@tribune.test`,
        FIRST[i],
        LAST[i],
        `243${p.prefix}${String(1000000 + i * 7919).slice(-7)}`,
        diaspora ? { residence: "diaspora", city: pick(["Bruxelles", "Paris", "Johannesburg", "Montréal"]) } : { city: pick(["Kinshasa", "Lubumbashi", "Goma", "Kisangani"]) },
      ),
    );
  }

  console.log("Clubs…");
  const clubIds = {};
  for (const c of CLUBS) {
    const managerId = managerIds[c.slug] ?? null;
    const row = await must(
      db
        .from("clubs")
        .insert({
          slug: c.slug, name: c.name, short_name: c.short, city: c.city, founded_year: c.year, description: c.description,
          color_primary: c.c1, color_secondary: c.c2, president_name: "Président du club (à compléter)",
          contact_phone: "243810009999", payout_phone: "243810009998", payout_provider: "VODACOM_MPESA_COD",
          status: c.status ?? "verified", created_by: managerId ?? adminId, reviewed_by: c.status ? null : complianceId,
          reviewed_at: c.status ? null : daysAgo(60),
        })
        .select("id")
        .single(),
      `club ${c.name}`,
    );
    clubIds[c.slug] = row.id;
    if (managerId) {
      await must(db.from("club_members").insert({ club_id: row.id, user_id: managerId, member_role: "owner" }), "gestionnaire");
      if (!c.status) await must(db.from("profiles").update({ role: "club_manager" }).eq("id", managerId), "rôle gestionnaire");
    }

    for (const ext of ["png", "jpg", "jpeg", "webp"]) {
      const file = path.join("scripts", "demo-logos", `${c.slug}.${ext}`);
      if (!existsSync(file)) continue;
      const logoPath = `${row.id}/logo-${Date.now()}.${ext === "jpg" ? "jpg" : ext}`;
      const { error } = await db.storage.from("club-logos").upload(logoPath, readFileSync(file), {
        contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg",
      });
      if (error) console.warn(`  logo ${c.slug} non envoyé : ${error.message}`);
      else await db.from("clubs").update({ logo_path: logoPath }).eq("id", row.id);
      break;
    }
  }

  console.log("Campagnes…");
  const CAMPAIGNS = [
    { club: "tp-mazembe", title: "Équipements pour l'école de football U13–U15", category: "Formation des jeunes", goal: 8000, target: 0.72, status: "published", ends: 12,
      summary: "Chaussures, ballons et chasubles pour 64 jeunes de l'école de football.",
      budget: [["Chaussures (64 paires)", 3800], ["Ballons et chasubles", 2100], ["Trousse de soins", 600], ["Transport des équipements", 1500]],
      miles: [["Liste des enfants et des tailles", "sept. 2026", true], ["Objectif de collecte atteint", "nov. 2026"], ["Achat et distribution", "déc. 2026"]] },
    { club: "as-vita-club", title: "Rénovation des vestiaires du terrain d'entraînement", category: "Infrastructure", goal: 18000, target: 0.41, status: "published", ends: 30,
      summary: "Douches, sanitaires et bancs neufs pour les équipes jeunes et seniors.",
      budget: [["Plomberie et douches", 7200], ["Carrelage et sanitaires", 5400], ["Bancs et casiers", 3100], ["Main-d'œuvre", 2300]],
      miles: [["Trois devis comparés", "oct. 2026", true], ["Objectif de collecte atteint", "nov. 2026"], ["Travaux", "déc. 2026"], ["Réception des vestiaires", "janv. 2027"]] },
    { club: "dc-motema-pembe", title: "Un minibus pour l'équipe féminine", category: "Transport", goal: 15000, target: 0.29, status: "published", ends: 40,
      summary: "Un minibus d'occasion de 30 places pour les déplacements du championnat féminin.",
      budget: [["Minibus d'occasion 30 places", 12500], ["Révision et pneus", 1200], ["Assurance première année", 1300]],
      miles: [["Véhicule choisi et contrôlé", "oct. 2026", true], ["Objectif de collecte atteint", "déc. 2026"], ["Achat et immatriculation", "déc. 2026"]] },
    { club: "sm-sanga-balende", title: "Éclairage du terrain d'entraînement", category: "Infrastructure", goal: 12000, target: 0.12, status: "published", ends: 50,
      summary: "Des projecteurs pour s'entraîner après 18 h, quand il fait moins chaud.",
      budget: [["Projecteurs LED (8)", 6400], ["Mâts et câblage", 3900], ["Installation", 1700]],
      miles: [["Étude électrique", "nov. 2026"], ["Objectif de collecte atteint", "déc. 2026"], ["Installation", "janv. 2027"]] },
    { club: "fc-saint-eloi-lupopo", title: "Kit médical et formation aux premiers secours", category: "Santé", goal: 5000, target: 1.04, status: "funded", ends: -20,
      summary: "Un défibrillateur, une trousse complète et deux jours de formation pour les éducateurs.",
      budget: [["Défibrillateur", 2400], ["Trousse et consommables", 900], ["Formation (8 éducateurs)", 1700]],
      miles: [["Objectif atteint", "sept. 2026", true], ["Matériel livré", "oct. 2026", true], ["Formation réalisée", "oct. 2026", true]] },
    { club: "as-maniema-union", title: "Déplacement en phase finale de la Coupe du Congo", category: "Déplacement", goal: 9000, target: 0, status: "in_review", ends: 35,
      summary: "Transport, hébergement et repas pour 25 joueurs et 6 encadrants.",
      budget: [["Transport aller-retour", 4800], ["Hébergement", 2600], ["Repas", 1600]],
      miles: [["Billets réservés", "nov. 2026"], ["Compétition disputée", "déc. 2026"], ["Rapport et justificatifs", "janv. 2027"]] },
    { club: "cs-don-bosco", title: "Tenues domicile et extérieur 2027", category: "Équipement", goal: 6500, target: 0, status: "draft", ends: 45,
      summary: "Deux jeux de maillots pour l'équipe première et les U19.",
      budget: [["Maillots et shorts (80)", 4800], ["Chaussettes", 700], ["Flocage", 1000]],
      miles: [["Commande passée", "déc. 2026"]] },
  ];

  const campaignIds = [];
  for (const c of CAMPAIGNS) {
    const description = `${c.summary}\n\nCampagne de démonstration : ce projet est fictif et sert uniquement à tester la plateforme Tribune.`;
    const live = ["published", "funded"].includes(c.status);
    const row = await must(
      db
        .from("campaigns")
        .insert({
          club_id: clubIds[c.club], slug: `${c.club}-${c.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`,
          title: c.title, category: c.category, summary: c.summary, description, goal_amount: c.goal, end_date: dateIn(c.ends),
          status: c.status, created_by: managerIds[c.club] ?? adminId,
          submitted_at: c.status === "draft" ? null : daysAgo(live ? 45 : 2),
          published_at: live ? daysAgo(40) : null,
          reviewed_by: live ? complianceId : null, reviewed_at: live ? daysAgo(41) : null,
          closed_at: c.status === "funded" ? daysAgo(20) : null,
        })
        .select("id")
        .single(),
      `campagne ${c.title}`,
    );
    campaignIds.push({ ...c, id: row.id });
    await must(db.from("campaign_budget_lines").insert(c.budget.map(([label, amount], i) => ({ campaign_id: row.id, position: i, label, amount }))), "budget");
    await must(
      db.from("campaign_milestones").insert(
        c.miles.map(([label, target, done], i) => ({
          campaign_id: row.id, position: i, label, target_label: target,
          done_at: done ? daysAgo(30 - i * 5) : null, proof_note: done ? "Justificatif publié (démonstration)." : null,
        })),
      ),
      "jalons",
    );
    if (live) {
      await must(
        db.from("campaign_updates").insert({
          campaign_id: row.id, author_id: managerIds[c.club] ?? adminId, title: "La campagne est lancée",
          body: `Merci à tous les supporters ! Objectif : ${c.goal.toLocaleString("fr-FR")} $. Nous publierons chaque étape ici.`,
          status: "published", reviewed_by: complianceId, published_at: daysAgo(39),
        }),
        "nouvelle",
      );
    }
  }

  console.log("Contributions simulées…");
  const AMOUNTS = [5, 10, 10, 20, 20, 25, 50, 50, 100, 150, 200];
  let count = 0;
  for (const c of campaignIds) {
    const goalToReach = Math.round(c.goal * c.target);
    let raised = 0;
    const rows = [];
    while (raised < goalToReach) {
      const amount = Math.min(pick(AMOUNTS), Math.max(5, goalToReach - raised));
      const userId = pick(supporters);
      const p = pick(PROVIDERS);
      const created = daysAgo(Math.floor(rand() * 38) + (c.status === "funded" ? 21 : 1), Math.floor(rand() * 14));
      const commission = Math.round(amount * 5) / 100;
      rows.push({
        id: randomUUID(), campaign_id: c.id, user_id: userId, amount, currency: "USD", commission, net_amount: amount - commission,
        status: "completed", payment_provider: "simulation", mmo_provider: p.code, payer_phone: `243${p.prefix}${String(Math.floor(rand() * 1e7)).padStart(7, "0")}`,
        anonymous: rand() < 0.15, provider_transaction_id: `SIM-${Math.floor(rand() * 1e9)}`, created_at: created, completed_at: created,
      });
      raised += amount;
    }
    for (let i = 0; i < rows.length; i += 200) await must(db.from("contributions").insert(rows.slice(i, i + 200)), "contributions");
    count += rows.length;
  }

  await db.from("audit_log").insert({ actor_id: adminId, action: "demo.donnees_creees", entity_type: "platform", entity_id: null, details: { clubs: CLUBS.length, contributions: count } });

  console.log(`\nTerminé : ${CLUBS.length} clubs, ${campaignIds.length} campagnes, ${count} contributions simulées.`);
  console.log(`\nComptes (mot de passe : ${PASSWORD})`);
  console.log("  admin@tribune.test            Administrateur");
  console.log("  conformite@tribune.test       Chargé de conformité");
  console.log("  gestion.mazembe@tribune.test  Gestionnaire TP Mazembe (aussi : gestion.vita@, gestion.dcmp@)");
  console.log("  gestion.aigles@tribune.test   Club en attente de vérification");
  console.log("  supporter@tribune.test        Supporter (aussi supporter01@ … supporter24@)");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

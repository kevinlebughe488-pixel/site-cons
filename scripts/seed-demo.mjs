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
// Photos de campagne : de même dans scripts/demo-covers/ (ex. tp-mazembe.jpg),
// une photo par club ; sans photo, la fiche affiche les couleurs du club.
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";
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
    user_metadata: {
      first_name: firstName, last_name: lastName, phone, residence: extra.residence ?? "rdc", city: extra.city ?? "Kinshasa", country: "RDC",
      signup_intent: extra.intent ?? "supporter",
    },
  });
  if (error) throw new Error(`Création du compte ${email} : ${error.message}`);
  return data.user.id;
}

/** Petit PDF d'une page (document de démonstration du dossier d'un club). */
function demoPdf(text) {
  const safe = text.replace(/[()\\]/g, "");
  const content = `BT /F1 20 Tf 60 760 Td (${safe}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
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
    "tp-mazembe": await createUser("gestion.mazembe@tribune.test", "Joseph", "Kalenga", "243990000011", { city: "Lubumbashi", intent: "club" }),
    "as-vita-club": await createUser("gestion.vita@tribune.test", "Mireille", "Nsimba", "243810000012", { intent: "club" }),
    "dc-motema-pembe": await createUser("gestion.dcmp@tribune.test", "Pascal", "Mpiana", "243840000013", { intent: "club" }),
    "les-aigles-du-congo": await createUser("gestion.aigles@tribune.test", "Arsène", "Bokele", "243820000014", { intent: "club" }),
  };
  // Représentant d'un club qui n'a pas encore ouvert son dossier (pour tester l'inscription d'un club).
  await createUser("representant@tribune.test", "Dorcas", "Mayala", "243820000015", { intent: "club" });
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
          slug: c.slug, name: c.name, short_name: c.short, sport: "Football", city: c.city, founded_year: c.year,
          founded_on: c.year ? `${c.year}-01-01` : null, description: c.description,
          color_primary: c.c1, color_secondary: c.c2, president_name: "Président du club (à compléter)",
          contact_phone: "243810009999",
          status: c.status ?? "verified", created_by: managerId ?? adminId, reviewed_by: c.status ? null : complianceId,
          reviewed_at: c.status ? null : daysAgo(60), submitted_at: daysAgo(c.status ? 2 : 62),
        })
        .select("id")
        .single(),
      `club ${c.name}`,
    );
    clubIds[c.slug] = row.id;
    // Partie privée du dossier : adresse, représentant légal, compte de versement (fictifs).
    await must(
      db.from("club_private").insert({
        club_id: row.id, address: `Siège du club (adresse fictive), ${c.city}`, rep_title: "Président",
        rep_phone: "243810009997", payout_method: "mobile_money", payout_holder: c.name,
        payout_phone: "243810009998", payout_provider: "VODACOM_MPESA_COD",
      }),
      `dossier privé ${c.name}`,
    );
    if (c.status === "pending") {
      // Un document de démonstration, pour tester la vérification d'un club.
      const docPath = `${row.id}/${randomUUID()}.pdf`;
      const pdf = demoPdf(`Statuts de ${c.name} - document de demonstration`);
      const { error: docError } = await db.storage.from("club-documents").upload(docPath, pdf, { contentType: "application/pdf" });
      if (docError) console.warn(`  document ${c.slug} non envoyé : ${docError.message}`);
      else {
        await must(
          db.from("club_documents").insert({
            club_id: row.id, kind: "statuts", file_path: docPath, file_name: "statuts-demonstration.pdf",
            mime_type: "application/pdf", size_bytes: pdf.length, uploaded_by: managerId,
          }),
          "document du club",
        );
      }
    }
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

  // Référentiel des prix : en démonstration, les prix de départ sont confirmés par l'équipe conformité.
  await must(db.from("price_references").update({ confirmed_at: new Date().toISOString(), confirmed_by: complianceId }).is("confirmed_at", null), "référentiel des prix");
  const refs = await must(db.from("price_references").select("id, label"), "référentiel des prix");
  const refId = (label) => {
    const found = refs.find((r) => r.label === label);
    if (!found) throw new Error(`Article absent du référentiel : ${label}`);
    return found.id;
  };

  console.log("Campagnes…");
  const CAMPAIGNS = [
    { club: "tp-mazembe", title: "Équipements pour l'école de football U13–U15", category: "Formation des jeunes", goal: 8000, target: 0.72, status: "published", ends: 12, min: 5,
      summary: "Chaussures, ballons et chasubles pour 64 jeunes de l'école de football.",
      budget: [
        ["Chaussures de football (64 paires)", 3200, 64, "Chaussures de football"], ["Ballons taille 5 (40)", 1200, 40, "Ballon de football taille 5"],
        ["Chasubles et plots d'entraînement", 900], ["Trousses de soins (2)", 300, 2, "Trousse médicale de terrain"],
        ["Transport des équipements", 1500], ["Encadrement des stages", 900],
      ],
      miles: [["Liste des enfants et des tailles", "sept. 2026", true], ["Objectif de collecte atteint", "nov. 2026"], ["Achat et distribution", "déc. 2026"]] },
    { club: "as-vita-club", title: "Rénovation des vestiaires du terrain d'entraînement", category: "Infrastructure", goal: 18000, target: 0.41, status: "published", ends: 30, min: 10, max: 1000,
      summary: "Douches, sanitaires et bancs neufs pour les équipes jeunes et seniors.",
      budget: [["Plomberie et douches", 7200], ["Carrelage et sanitaires", 5400], ["Bancs et casiers", 3100], ["Main-d'œuvre", 2300]],
      miles: [["Trois devis comparés", "oct. 2026", true], ["Objectif de collecte atteint", "nov. 2026"], ["Travaux", "déc. 2026"], ["Réception des vestiaires", "janv. 2027"]] },
    { club: "dc-motema-pembe", title: "Un minibus pour l'équipe féminine", category: "Transport", goal: 15000, target: 0.29, status: "published", ends: 40, min: 5,
      summary: "Un minibus d'occasion de 30 places pour les déplacements du championnat féminin.",
      budget: [["Minibus d'occasion 30 places", 12500, 1, "Bus de 30 places d'occasion"], ["Révision et pneus", 1200], ["Assurance première année", 1300]],
      miles: [["Véhicule choisi et contrôlé", "oct. 2026", true], ["Objectif de collecte atteint", "déc. 2026"], ["Achat et immatriculation", "déc. 2026"]] },
    { club: "sm-sanga-balende", title: "Éclairage du terrain d'entraînement", category: "Infrastructure", goal: 12000, target: 0.12, status: "published", ends: 50, min: 1,
      summary: "Des projecteurs pour s'entraîner après 18 h, quand il fait moins chaud.",
      budget: [["Projecteurs LED (8)", 6400, 8, "Projecteur LED d'éclairage de terrain"], ["Mâts et câblage", 3900], ["Installation", 1700]],
      miles: [["Étude électrique", "nov. 2026"], ["Objectif de collecte atteint", "déc. 2026"], ["Installation", "janv. 2027"]] },
    { club: "fc-saint-eloi-lupopo", title: "Kit médical et formation aux premiers secours", category: "Santé", goal: 5000, target: 1.04, status: "funded", ends: -20, min: 5,
      summary: "Un défibrillateur, une trousse complète et deux jours de formation pour les éducateurs.",
      budget: [["Défibrillateur", 2400], ["Trousses et consommables (6)", 900, 6, "Trousse médicale de terrain"], ["Formation (8 éducateurs)", 1700]],
      miles: [["Objectif atteint", "sept. 2026", true], ["Matériel livré", "oct. 2026", true], ["Formation réalisée", "oct. 2026", true]] },
    { club: "as-maniema-union", title: "Déplacement en phase finale de la Coupe du Congo", category: "Déplacement", goal: 9000, target: 0, status: "in_review", ends: 35, min: 10,
      summary: "Transport, hébergement et repas pour 25 joueurs et 6 encadrants.",
      // Le bus est loué 3 fois le prix de référence : le contrôle automatique bloque la publication (démonstration).
      budget: [
        ["Location de bus 30 places (6 jours)", 6300, 6, "Location de bus de 30 places"], ["Hébergement (50 nuitées)", 1750, 50, "Hébergement en déplacement"],
        ["Repas (60 repas-jour)", 900, 60, "Repas en déplacement"], ["Péages", 50],
      ],
      miles: [["Billets réservés", "nov. 2026"], ["Compétition disputée", "déc. 2026"], ["Rapport et justificatifs", "janv. 2027"]] },
    { club: "cs-don-bosco", title: "Tenues domicile et extérieur 2027", category: "Équipement", goal: 6500, target: 0, status: "draft", ends: 45, min: 5,
      summary: "Deux jeux de maillots pour l'équipe première et les U19.",
      budget: [["Maillots de match (80)", 2400, 80, "Maillot de match"], ["Shorts et chaussettes (80)", 1600, 80, "Tenue d'entraînement (maillot, short, chaussettes)"], ["Flocage", 2500]],
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
          duration_days: live ? 42 : Math.min(70, Math.max(14, c.ends)), min_contribution: c.min, max_contribution: c.max ?? null,
          status: c.status, created_by: managerIds[c.club] ?? adminId,
          submitted_at: c.status === "draft" ? null : daysAgo(live ? 45 : 2),
          published_at: live ? daysAgo(40) : null,
          reviewed_by: live ? complianceId : null, reviewed_at: live ? daysAgo(41) : null,
          closed_at: c.status === "funded" ? daysAgo(20) : null,
        })
        .select("id, slug")
        .single(),
      `campagne ${c.title}`,
    );
    campaignIds.push({ ...c, id: row.id, slug: row.slug });
    for (const ext of ["jpg", "jpeg", "png", "webp"]) {
      const file = path.join("scripts", "demo-covers", `${c.club}.${ext}`);
      if (!existsSync(file)) continue;
      const coverPath = `${row.id}/photo-${randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;
      const bytes = readFileSync(file);
      const { error } = await db.storage.from("campaign-images").upload(coverPath, bytes, {
        contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg",
      });
      if (error) console.warn(`  photo ${c.club} non envoyée : ${error.message}`);
      else {
        await db.from("campaigns").update({ cover_path: coverPath }).eq("id", row.id);
        await must(
          db.from("campaign_photos").insert({
            campaign_id: row.id, file_path: coverPath, caption: "La situation avant le projet (photo de démonstration)",
            taken_on: dateIn(-50), sha256: createHash("sha256").update(bytes).digest("hex"), uploaded_by: managerIds[c.club] ?? adminId,
          }),
          "photo de la campagne",
        );
      }
      break;
    }
    await must(
      db.from("campaign_budget_lines").insert(
        c.budget.map(([label, amount, quantity = 1, ref = null], i) => ({
          campaign_id: row.id, position: i, label, amount, quantity, reference_id: ref ? refId(ref) : null,
        })),
      ),
      "budget",
    );
    // Devis de démonstration (sauf le brouillon, qui montre au club ce qu'il lui manque).
    if (c.status !== "draft") {
      const docPath = `${row.id}/${randomUUID()}.pdf`;
      const pdf = demoPdf(`Devis fournisseur - ${c.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")} - demonstration`);
      const { error: docError } = await db.storage.from("campaign-documents").upload(docPath, pdf, { contentType: "application/pdf" });
      if (docError) console.warn(`  devis ${c.club} non envoyé : ${docError.message}`);
      else {
        await must(
          db.from("campaign_documents").insert({
            campaign_id: row.id, kind: "devis", supplier: "Fournisseur de démonstration, Kinshasa", file_path: docPath,
            file_name: "devis-demonstration.pdf", mime_type: "application/pdf", size_bytes: pdf.length, uploaded_by: managerIds[c.club] ?? adminId,
          }),
          "devis",
        );
      }
    }
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
      // Frais d'instruction et de publication (400 $ en année 1) : réglés pour la campagne financée et TP Mazembe.
      const paid = c.status === "funded" || c.club === "tp-mazembe";
      await must(
        db.from("publication_fees").insert({
          campaign_id: row.id, amount: 400, invoiced_at: daysAgo(40),
          paid_at: paid ? daysAgo(37) : null, payment_ref: paid ? `DEMO-FRAIS-${c.club.toUpperCase()}` : null,
          recorded_by: paid ? adminId : null,
        }),
        "frais de publication",
      );
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
  // supporter@tribune.test est l'ambassadeur de démonstration : une partie des contributions lui est attribuée.
  const ambassadorId = supporters[0];
  let count = 0;
  for (const c of campaignIds) {
    const goalToReach = Math.round(c.goal * c.target);
    let raised = 0;
    const rows = [];
    const given = new Map();
    // Le supporter de démonstration contribue à la campagne financée (il reçoit ainsi ses messages).
    if (c.status === "funded") given.set(ambassadorId, 0);
    while (raised < goalToReach) {
      const amount = Math.max(c.min, Math.min(pick(AMOUNTS), Math.max(5, goalToReach - raised)));
      let userId = c.status === "funded" && !rows.some((r) => r.user_id === ambassadorId) ? ambassadorId : pick(supporters);
      // Plafond par supporter : on choisit un autre supporter plutôt que de le dépasser.
      for (let tries = 0; c.max && (given.get(userId) ?? 0) + amount > c.max && tries < 50; tries++) userId = pick(supporters);
      if (c.max && (given.get(userId) ?? 0) + amount > c.max) break;
      given.set(userId, (given.get(userId) ?? 0) + amount);
      const p = pick(PROVIDERS);
      const created = daysAgo(Math.floor(rand() * 38) + (c.status === "funded" ? 21 : 1), Math.floor(rand() * 14));
      const commission = Math.round(amount * 5) / 100;
      rows.push({
        id: randomUUID(), campaign_id: c.id, user_id: userId, amount, currency: "USD", commission, net_amount: amount - commission,
        status: "completed", payment_provider: "simulation", mmo_provider: p.code, payer_phone: `243${p.prefix}${String(Math.floor(rand() * 1e7)).padStart(7, "0")}`,
        anonymous: rand() < 0.15, provider_transaction_id: `SIM-${Math.floor(rand() * 1e9)}`, created_at: created, completed_at: created,
        referred_by: userId !== ambassadorId && rand() < 0.12 ? ambassadorId : userId !== supporters[1] && rand() < 0.05 ? supporters[1] : null,
      });
      raised += amount;
    }
    for (let i = 0; i < rows.length; i += 200) await must(db.from("contributions").insert(rows.slice(i, i + 200)), "contributions");
    count += rows.length;
  }

  console.log("Commentaires, actualités, messages et notifications…");
  const byClub = Object.fromEntries(campaignIds.map((c) => [c.club, c]));
  const mazembe = byClub["tp-mazembe"];
  const lupopo = byClub["fc-saint-eloi-lupopo"];
  const vita = byClub["as-vita-club"];
  const label = (first, last) => `${first} ${last.slice(0, 1)}.`;
  const q1 = randomUUID();
  await must(
    db.from("campaign_comments").insert([
      { id: q1, campaign_id: mazembe.id, author_id: supporters[3], author_kind: "supporter", author_label: label(FIRST[2], LAST[2]),
        body: "Les chaussures seront-elles distribuées aussi aux filles de l'école de football ?", created_at: daysAgo(6) },
      { campaign_id: mazembe.id, parent_id: q1, author_id: managerIds["tp-mazembe"], author_kind: "club", author_label: "TP Mazembe",
        body: "Oui : 64 paires pour les U13–U15, garçons et filles. La liste des tailles est publiée dans les jalons.", created_at: daysAgo(5) },
      { campaign_id: mazembe.id, author_id: supporters[7], author_kind: "supporter", author_label: label(FIRST[6], LAST[6]),
        body: "Bravo pour ce projet, les jeunes en ont besoin. J'ai partagé la campagne dans le groupe des supporters de Bel-Air.", created_at: daysAgo(3) },
      { campaign_id: vita.id, author_id: supporters[5], author_kind: "supporter", author_label: label(FIRST[4], LAST[4]),
        body: "Quand les travaux des vestiaires commenceront-ils ?", created_at: daysAgo(2) },
    ], { defaultToNull: false }),
    "commentaires",
  );
  await must(
    db.from("campaign_updates").insert([
      { club_id: clubIds["tp-mazembe"], campaign_id: null, author_id: managerIds["tp-mazembe"], title: "Nos U15 en finale du tournoi de Lubumbashi",
        body: "Belle performance de nos U15 ce week-end. Merci aux supporters qui suivent l'école de football : la campagne pour leurs équipements continue !",
        status: "published", reviewed_by: complianceId, published_at: daysAgo(4) },
      { club_id: clubIds["fc-saint-eloi-lupopo"], campaign_id: lupopo.id, audience: "contributors", author_id: adminId,
        title: "Merci aux contributeurs : la formation a eu lieu",
        body: "Les huit éducateurs ont suivi les deux jours de formation aux premiers secours. Le défibrillateur est installé au stade. Merci à chacun de vous !",
        status: "published", reviewed_by: complianceId, published_at: daysAgo(8) },
      { club_id: clubIds["as-vita-club"], campaign_id: vita.id, author_id: managerIds["as-vita-club"], title: "Les devis sont en ligne",
        body: "Nous avons reçu trois devis pour la plomberie. Celui retenu sera publié avec la preuve du premier jalon.", status: "pending" },
    ], { defaultToNull: false }),
    "actualités",
  );
  const supporterId = supporters[0];
  await db.from("profiles").update({ followed_club_id: clubIds["tp-mazembe"], ambassador_public: true }).eq("id", supporterId);
  await db.from("profiles").update({ ambassador_public: true }).eq("id", supporters[1]);
  await must(
    db.from("notifications").insert([
      { user_id: supporterId, kind: "campagne_lancee", title: `TP Mazembe lance un projet : ${mazembe.title}`, body: mazembe.summary,
        link: `/campagnes/${mazembe.slug}`, campaign_id: mazembe.id, club_id: clubIds["tp-mazembe"], created_at: daysAgo(40), read_at: daysAgo(39) },
      { user_id: supporterId, kind: "objectif_atteint", title: `Objectif atteint : ${lupopo.title}`, body: "Merci ! La collecte reste ouverte jusqu'à sa date de fin.",
        link: `/campagnes/${lupopo.slug}`, campaign_id: lupopo.id, club_id: clubIds["fc-saint-eloi-lupopo"], created_at: daysAgo(22) },
      { user_id: supporterId, kind: "message_club", title: "Message de FC Saint-Éloi Lupopo aux contributeurs", body: "Merci aux contributeurs : la formation a eu lieu",
        link: `/campagnes/${lupopo.slug}#nouvelles`, campaign_id: lupopo.id, club_id: clubIds["fc-saint-eloi-lupopo"], created_at: daysAgo(8) },
      { user_id: supporterId, kind: "actualite", title: "TP Mazembe : Nos U15 en finale du tournoi de Lubumbashi", body: "Belle performance de nos U15 ce week-end.",
        link: "/clubs/tp-mazembe#actualites", club_id: clubIds["tp-mazembe"], created_at: daysAgo(4) },
    ], { defaultToNull: false }),
    "notifications",
  );

  // Niveau du contrôle automatique de chaque campagne (liste du back-office, badge de la page publique).
  for (const c of campaignIds) {
    const { data: report, error } = await db.rpc("compute_campaign_compliance", { p_campaign_id: c.id });
    if (error) console.warn(`  contrôle ${c.club} : ${error.message}`);
    else await db.from("campaigns").update({ compliance_level: report.level, compliance_checked_at: new Date().toISOString() }).eq("id", c.id);
  }

  await db.from("audit_log").insert({ actor_id: adminId, action: "demo.donnees_creees", entity_type: "platform", entity_id: null, details: { clubs: CLUBS.length, contributions: count } });
  // Comptes de démo : numéros considérés comme vérifiés (codes SMS à la connexion seulement).
  await db.from("profiles").update({ phone_verified_at: new Date().toISOString() }).like("email", "%@tribune.test").is("phone_verified_at", null);

  console.log(`\nTerminé : ${CLUBS.length} clubs, ${campaignIds.length} campagnes, ${count} contributions simulées.`);
  console.log(`\nComptes (mot de passe : ${PASSWORD})`);
  console.log("  admin@tribune.test            Administrateur");
  console.log("  conformite@tribune.test       Chargé de conformité");
  console.log("  gestion.mazembe@tribune.test  Gestionnaire TP Mazembe (aussi : gestion.vita@, gestion.dcmp@)");
  console.log("  gestion.aigles@tribune.test   Club en attente de vérification (dossier envoyé, un document)");
  console.log("  representant@tribune.test     Représentant d'un club pas encore inscrit");
  console.log("  supporter@tribune.test        Supporter (aussi supporter01@ … supporter24@)");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

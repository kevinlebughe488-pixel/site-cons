// Donne un rôle à un compte existant (utile pour créer le premier administrateur).
//   npm run promote -- prenom.nom@exemple.com admin
// Rôles : supporter, club_manager, compliance, admin
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  // variables déjà présentes dans l'environnement
}

const [email, role = "admin"] = process.argv.slice(2);
const ROLES = ["supporter", "club_manager", "compliance", "admin"];
if (!email || !ROLES.includes(role)) {
  console.error("Usage : npm run promote -- <email> <supporter|club_manager|compliance|admin>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis (.env.local).");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data: profile, error } = await supabase.from("profiles").select("id, role").eq("email", email.toLowerCase()).maybeSingle();
if (error || !profile) {
  console.error(`Aucun compte trouvé pour ${email}. La personne doit d'abord s'inscrire sur le site.`);
  process.exit(1);
}
await supabase.from("profiles").update({ role }).eq("id", profile.id);
await supabase.from("audit_log").insert({
  actor_id: null,
  action: "role.modifie",
  entity_type: "profile",
  entity_id: profile.id,
  details: { ancien: profile.role, nouveau: role, via: "script promote" },
});
console.log(`${email} : ${profile.role} → ${role}`);

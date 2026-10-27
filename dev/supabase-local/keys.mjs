// Génère les clés « anon » et « service_role » (JWT HS256) à partir de JWT_SECRET,
// exactement comme Supabase le fait pour un projet auto-hébergé.
import { createHmac } from "node:crypto";

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error("JWT_SECRET doit faire au moins 32 caractères.");
  process.exit(1);
}
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
const sign = (role) => {
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ role, iss: "supabase", iat: now, exp: now + 10 * 365 * 24 * 3600 })}`;
  return `${body}.${createHmac("sha256", secret).update(body).digest("base64url")}`;
};
const anon = sign("anon");
const service = sign("service_role");
console.log("# Pour dev/supabase-local/.env");
console.log(`ANON_KEY=${anon}`);
console.log(`SERVICE_ROLE_KEY=${service}`);
console.log("\n# Pour .env.local (à la racine du projet)");
console.log("NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321");
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anon}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${service}`);

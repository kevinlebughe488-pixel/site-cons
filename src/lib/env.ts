import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variable d'environnement manquante : ${name}. Voir .env.example.`);
  }
  return value;
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  /** Clé publique du projet (« anon » ou « publishable »). */
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  /** Clé secrète (« service_role » ou « secret »). Ne doit jamais arriver dans le navigateur. */
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  /**
   * Adresse publique du site, utilisée dans les liens envoyés par e-mail.
   * Sur Vercel, l'adresse du projet est utilisée si SITE_URL n'est pas défini.
   */
  get siteUrl() {
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
    return (process.env.SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000")).replace(/\/$/, "");
  },
};

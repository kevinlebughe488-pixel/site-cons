# Tribune Supporters

Plateforme de financement participatif des clubs de football congolais par leurs supporters :
campagnes vérifiées, paiement **Mobile Money** (M-Pesa, Airtel Money, Orange Money) via
**pawaPay**, registre de chaque contribution, et back-office avec des rôles séparés.

- **Application** : Next.js 16 (App Router, actions serveur), TypeScript
- **Base de données, comptes, fichiers** : Supabase (PostgreSQL + Auth + Storage)
- **Paiements** : pawaPay API v2, avec un mode simulation pour tester sans argent
- La maquette d'origine est conservée dans [`maquette/index.html`](maquette/index.html).

## Rôles et droits (RBAC)

| Rôle | Ce qu'il voit et fait |
| --- | --- |
| **Supporter** | Campagnes publiques, contribuer, son compte et ses reçus, inscrire un club |
| **Gestionnaire de club** | + son espace club : présentation et logo, campagnes (brouillon → revue), nouvelles, preuves des jalons |
| **Conformité** | + back-office : instruire les campagnes (≤ 20 000 $), vérifier les clubs et les identités, relire les nouvelles, voir et exporter les transactions, journal d'audit |
| **Administrateur** | + publier au-delà de 20 000 $, suspendre ou clôturer une campagne, suspendre un club, rembourser, changer les rôles, gérer les gestionnaires et les comptes de versement des clubs |

Les droits sont appliqués **deux fois** :

1. dans l'application ([`src/lib/rbac.ts`](src/lib/rbac.ts)) pour afficher les bonnes pages et les bons boutons ;
2. dans la base elle-même ([`supabase/migrations`](supabase/migrations)) : règles RLS pour les lectures,
   et fonctions SQL qui vérifient le rôle pour chaque action sensible. Un supporter qui contournerait
   l'interface avec la clé publique ne peut ni lire les données des autres, ni changer son rôle, ni
   créer un paiement. Le script [`scripts/check-rls.mjs`](scripts/check-rls.mjs) le vérifie (21 contrôles).

Les contributions et remboursements ne sont écrits que par le serveur (clé `service_role`), jamais
depuis le navigateur.

## Mise en route avec Supabase

### 1. Créer le projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (région la plus proche : Europe).
2. Dans **SQL Editor**, exécutez dans l'ordre le contenu des fichiers :
   - `supabase/migrations/20261026000100_schema.sql` (tables, rôles, règles d'accès, fonctions)
   - `supabase/migrations/20261026000200_club_logos.sql` (logos des clubs dans Storage)

   Ou, avec la [CLI Supabase](https://supabase.com/docs/guides/cli) : `supabase link --project-ref <ref>` puis `supabase db push`.
3. Dans **Authentication → URL Configuration** :
   - *Site URL* : l'adresse du site (ex. `https://tribune.example.com`, ou `http://localhost:3000` en local) ;
   - *Redirect URLs* : ajoutez `https://<votre-site>/auth/callback` (et `http://localhost:3000/auth/callback`).
4. Dans **Authentication → Sign In / Providers → Email** : laissez la confirmation d'e-mail activée en
   production. Pour envoyer de vrais e-mails, configurez un SMTP (Authentication → Emails → SMTP).

### 2. Configurer l'application

```bash
cp .env.example .env.local
```

Renseignez `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publique « anon » ou
« publishable ») et `SUPABASE_SERVICE_ROLE_KEY` (clé secrète « service_role » ou « secret »), dans
**Project Settings → API Keys**. La clé secrète ne doit jamais être publiée ni mise dans une variable `NEXT_PUBLIC_`.

```bash
npm install
npm run dev          # http://localhost:3000
```

### 3. Créer le premier administrateur

Inscrivez-vous sur le site, puis :

```bash
npm run promote -- votre.email@exemple.com admin
```

Ensuite, les rôles se gèrent depuis **Back-office → Supporters et rôles**.

### 4. Données de démonstration (facultatif, projet de test uniquement)

```bash
npm run seed:demo -- --confirmer
```

Crée 10 vrais clubs de la Linafoot (TP Mazembe, AS Vita Club, DC Motema Pembe, FC Saint-Éloi Lupopo,
AS Maniema Union, CS Don Bosco, SM Sanga Balende, FC Renaissance du Congo, OC Bukavu Dawa, Les Aigles
du Congo), 7 campagnes **fictives**, ~470 contributions simulées et des comptes de test
(mot de passe `Tribune-demo-2026`) :

| Compte | Rôle |
| --- | --- |
| `admin@tribune.test` | Administrateur |
| `conformite@tribune.test` | Conformité |
| `gestion.mazembe@tribune.test`, `gestion.vita@…`, `gestion.dcmp@…` | Gestionnaires de club |
| `gestion.aigles@tribune.test` | Club en attente de vérification |
| `supporter@tribune.test`, `supporter01@…` à `supporter24@…` | Supporters |

**Logos** : déposez les fichiers dans `scripts/demo-logos/`, nommés d'après le club
(`tp-mazembe.png`, `as-vita-club.webp`…, PNG/JPEG/WebP, 1 Mo maximum) avant de lancer le script.
Les clubs peuvent aussi envoyer leur logo depuis leur espace. Les logos sont des marques des clubs :
pour un site public, utilisez-les avec leur accord. Ne lancez pas ce script sur le site public, car
les projets présentés sont inventés.

## Paiements Mobile Money avec pawaPay

Sans configuration, l'application tourne en **mode simulation** : aucun argent ne circule, le
paiement est confirmé au bout de 5 secondes, et un numéro qui se termine par `0000` simule un échec.

Pour encaisser réellement :

1. Ouvrez un compte marchand sur [pawapay.io](https://pawapay.io) et demandez l'accès à la RDC
   (M-Pesa, Airtel Money, Orange Money). pawaPay vérifie l'entreprise (KYB) avant la production.
2. Dans le tableau de bord **sandbox**, créez un jeton d'API, puis renseignez :
   ```
   PAYMENT_PROVIDER=pawapay
   PAWAPAY_API_TOKEN=<jeton>
   PAWAPAY_ENVIRONMENT=sandbox
   ```
3. Déclarez les URL de notification (*callbacks*) dans le tableau de bord pawaPay :
   - Dépôts : `https://<votre-site>/api/pawapay/deposits`
   - Remboursements : `https://<votre-site>/api/pawapay/refunds`
4. Dans **Back-office → Transactions**, cliquez sur **Vérifier la configuration pawaPay** : la liste
   des opérateurs ouverts sur votre compte s'affiche. Les codes utilisés par l'application
   (`VODACOM_MPESA_COD`, `AIRTEL_COD`, `ORANGE_COD`, dans [`src/lib/payments/providers.ts`](src/lib/payments/providers.ts))
   doivent correspondre.
5. Testez avec les numéros de test du sandbox pawaPay (voir leur documentation), puis passez en
   production avec le jeton de production et `PAWAPAY_ENVIRONMENT=production`.

Fonctionnement :

- le supporter choisit montant, numéro et opérateur (deviné d'après le préfixe : 081/082/083 → M-Pesa,
  097/098/099 → Airtel, 080/084/085/089 → Orange) ;
- le serveur enregistre la contribution, puis demande le paiement à pawaPay (`POST /v2/deposits`) ;
  l'identifiant de la contribution sert de `depositId` ;
- le supporter valide sur son téléphone ; la page de suivi se met à jour toute seule ;
- à chaque notification, **l'application redemande l'état à pawaPay** (`GET /v2/deposits/{id}`) au
  lieu de croire le contenu reçu : une fausse notification ne peut pas valider un paiement ;
- si une notification se perd, l'état est revérifié depuis la page de suivi et depuis le back-office ;
- les remboursements (« tout ou rien » si l'objectif n'est pas atteint) passent par `POST /v2/refunds`.

En production, la simulation est refusée, sauf si `ALLOW_SIMULATED_PAYMENTS=true` (démo publique).

## Déploiement sur Vercel

1. Sur [vercel.com/new](https://vercel.com/new), importez le dépôt GitHub `site-cons` (framework détecté : Next.js).
2. Dans **Environment Variables**, collez :
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<clé publishable ou anon>
   SUPABASE_SERVICE_ROLE_KEY=<clé secret ou service_role>
   PAYMENT_PROVIDER=simulation
   ALLOW_SIMULATED_PAYMENTS=true
   ```
   `ALLOW_SIMULATED_PAYMENTS=true` sert à une démonstration publique : un bandeau prévient les
   visiteurs que les paiements sont simulés. Pour encaisser réellement, remplacez ces deux lignes par
   la configuration pawaPay ci-dessus. `SITE_URL` est facultatif : l'adresse Vercel est utilisée par défaut.
3. Cliquez sur **Deploy**.
4. Dans Supabase (Authentication → URL Configuration), mettez l'adresse Vercel en *Site URL* et
   ajoutez `https://<votre-projet>.vercel.app/auth/callback` aux *Redirect URLs*. Pour une démo sans
   SMTP configuré, vous pouvez désactiver « Confirm email » (Authentication → Sign In / Providers → Email),
   car l'envoi d'e-mails par défaut de Supabase est très limité.

## Développement local sans projet Supabase

[`dev/supabase-local`](dev/supabase-local) contient une copie minimale de Supabase pour Docker
(base, authentification, API, stockage), utilisée pour les tests :

```bash
cd dev/supabase-local
cp .env.example .env
JWT_SECRET=$(grep JWT_SECRET .env | cut -d= -f2) node keys.mjs   # copiez les clés affichées dans .env et ../../.env.local
docker compose up -d
# appliquez les migrations (mot de passe : POSTGRES_PASSWORD)
for f in ../../supabase/migrations/*.sql; do psql -h localhost -p 54322 -U postgres -d postgres -f "$f"; done
```

L'API est alors sur `http://localhost:54321` (à mettre dans `NEXT_PUBLIC_SUPABASE_URL`).

## Vérifications

```bash
npm run typecheck
npm run lint
npm run build
node scripts/check-rls.mjs     # règles d'accès, sur une base de test avec les données de démo
```

## Prochaines étapes

- **Versements aux clubs** : le compte Mobile Money de chaque club est enregistré, mais les
  versements par tranche (API *payouts* de pawaPay) ne sont pas encore automatisés.
- Notifications SMS et e-mail aux supporters (reçus, nouvelles, remboursements).
- Connexion par code SMS (Supabase Auth « phone »), utile pour les supporters sans e-mail.
- Vérification de la signature des notifications pawaPay (en plus de la revérification actuelle).
- Clôture automatique des campagnes à leur date de fin (tâche planifiée).

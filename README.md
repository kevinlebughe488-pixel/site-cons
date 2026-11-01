# Tribune Supporters

Plateforme de financement participatif des clubs de football congolais par leurs supporters :
clubs et campagnes vérifiés, paiement **Mobile Money** (M-Pesa, Airtel Money, Orange Money) via
**pawaPay**, registre de chaque contribution, communication entre le club et ses supporters
(commentaires, actualités, messages aux contributeurs, notifications, classement, ambassadeurs)
et back-office avec des rôles séparés.

Tribune est opérée par **Plumes Capital** (SAS de droit OHADA, RDC) : c'est la première plateforme de
son plan d'affaires (financement participatif), avant le crédit interentreprises et la tokenisation.

- **Application** : Next.js 16 (App Router, actions serveur), TypeScript
- **Base de données, comptes, fichiers** : Supabase (PostgreSQL + Auth + Storage)
- **Paiements** : pawaPay API v2, avec un mode simulation pour tester sans argent
- La maquette d'origine est conservée dans [`maquette/index.html`](maquette/index.html).

## Rôles et droits (RBAC)

| Rôle | Ce qu'il voit et fait |
| --- | --- |
| **Supporter** | Campagnes publiques, contribuer, son compte et ses reçus, commenter, suivre un club, son lien d'ambassadeur, ses notifications, inscrire un club (dossier) |
| **Gestionnaire de club** | Son profil et son espace club : présentation et logo, campagnes (brouillon → revue) avec photo, nouvelles, actualités du club, messages aux contributeurs, réponses aux commentaires, preuves des jalons |
| **Conformité** | Son profil et le back-office : instruire les campagnes (≤ 20 000 $) sur trois critères, vérifier les dossiers des clubs sur trois points de contrôle (ou demander des compléments), vérifier les identités, relire les nouvelles et les messages, modérer les commentaires, voir et exporter les transactions, indicateurs du plan d'affaires, journal d'audit |
| **Administrateur** | Tout ce que fait la conformité, plus : publier au-delà de 20 000 $, suspendre ou clôturer une campagne, suspendre un club, rembourser, enregistrer le règlement des frais de publication, régler les tarifs, changer les rôles, gérer les gestionnaires et les comptes de versement des clubs (Mobile Money ou banque) |

Les rôles sont **séparés** : ils ne s'additionnent pas. Un gestionnaire, un chargé de conformité ou un
administrateur ne contribue pas, ne déclare pas de pièce d'identité et n'inscrit pas de club ; un
compte de l'équipe Tribune ne peut pas être membre d'un club, et un gestionnaire est forcément
rattaché à un club. Pour contribuer, il faut un compte supporter distinct.

Les droits sont appliqués **deux fois** :

1. dans l'application ([`src/lib/rbac.ts`](src/lib/rbac.ts)) pour afficher les bonnes pages et les bons boutons ;
2. dans la base elle-même ([`supabase/migrations`](supabase/migrations)) : règles RLS pour les lectures,
   et fonctions SQL qui vérifient le rôle pour chaque action sensible. Un supporter qui contournerait
   l'interface avec la clé publique ne peut ni lire les données des autres, ni changer son rôle, ni
   créer un paiement. Le script [`scripts/check-rls.mjs`](scripts/check-rls.mjs) le vérifie (67 contrôles).

Les contributions et remboursements ne sont écrits que par le serveur (clé `service_role`), jamais
depuis le navigateur.

## Modèle économique (plan d'affaires de Plumes Capital)

Les revenus suivent le plan d'affaires (§ 11.2) :

- **Commission de 5 %** sur chaque contribution, conservée seulement si la campagne atteint son objectif
  (sinon les supporters sont remboursés en totalité).
- **Frais d'instruction et de publication** facturés au club pour chaque campagne publiée : 400 $ la
  première année, 500 $ ensuite. Le tarif en vigueur se règle dans **Back-office → Tableau de bord** (administrateur)
  et il est figé sur la campagne au moment de sa publication. Aucun frais si le dossier est refusé.
- Pour publier, l'équipe confirme trois critères (clarté, faisabilité, cohérence), inscrits au journal d'audit.
- Le règlement des frais est enregistré par un administrateur, jamais par la personne qui a instruit le dossier.
- Le tableau de bord compare l'activité aux objectifs du plan (campagnes publiées, taux de succès, montant moyen,
  montants collectés, chiffre d'affaires) pour l'année en cours, à partir de la date de lancement renseignée.

## Mise en route avec Supabase

### 1. Créer le projet Supabase

1. Créez un projet sur [supabase.com](https://supabase.com) (région la plus proche : Europe).
2. Dans **SQL Editor**, exécutez dans l'ordre le contenu des fichiers :
   - `supabase/migrations/20261026000100_schema.sql` (tables, rôles, règles d'accès, fonctions)
   - `supabase/migrations/20261026000200_club_logos.sql` (logos des clubs dans Storage)
   - `supabase/migrations/20261027000100_roles_separes.sql` (rôles séparés : qui contribue, qui gère un club)
   - `supabase/migrations/20261027000200_telephone_unique.sql` (un numéro de téléphone = un seul compte)
   - `supabase/migrations/20261027000300_verification_sms.sql` (codes de vérification par SMS)
   - `supabase/migrations/20261030000100_plan_affaires.sql` (frais de publication, critères d'instruction, indicateurs du plan d'affaires)
   - `supabase/migrations/20261101000100_statuts_clubs.sql` (statuts « dossier en préparation » et « compléments demandés » ; à exécuter seul, avant le suivant)
   - `supabase/migrations/20261101000200_inscription_clubs.sql` (type de compte, dossier du club, documents, procédure de vérification)
   - `supabase/migrations/20261101000300_parametres_campagnes.sql` (durée de collecte, montants minimum et maximum par supporter, photo)
   - `supabase/migrations/20261101000400_communication.sql` (notifications, commentaires, actualités et messages, ambassadeurs, classements)

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
du Congo), 7 campagnes **fictives**, ~400 contributions simulées (dont une partie attribuée à des
ambassadeurs), des commentaires, des actualités, un message aux contributeurs, des notifications et des
comptes de test (mot de passe `Tribune-demo-2026`) :

| Compte | Rôle |
| --- | --- |
| `admin@tribune.test` | Administrateur |
| `conformite@tribune.test` | Conformité |
| `gestion.mazembe@tribune.test`, `gestion.vita@…`, `gestion.dcmp@…` | Gestionnaires de club |
| `gestion.aigles@tribune.test` | Club en cours de vérification (dossier envoyé avec un document) |
| `representant@tribune.test` | Représentant d'un club pas encore inscrit (pour tester le dossier) |
| `supporter@tribune.test`, `supporter01@…` à `supporter24@…` | Supporters (`supporter@` suit TP Mazembe et est ambassadeur) |

**Logos** : déposez les fichiers dans `scripts/demo-logos/`, nommés d'après le club
(`tp-mazembe.png`, `as-vita-club.webp`…, PNG/JPEG/WebP, 1 Mo maximum) avant de lancer le script.
**Photos de campagne** : de même dans `scripts/demo-covers/` (`tp-mazembe.jpg`…, 2 Mo maximum).
Les clubs peuvent aussi envoyer leur logo depuis leur espace. Les logos sont des marques des clubs :
pour un site public, utilisez-les avec leur accord. Ne lancez pas ce script sur le site public, car
les projets présentés sont inventés.

## Inscription et vérification des clubs

À l'inscription, la personne choisit **« Je représente un club »** ou **« Je suis supporter »**. Le
représentant crée son compte personnel (confirmé par SMS), puis ouvre le **dossier du club** :

- nom officiel, sigle, discipline sportive, ville et adresse du siège, date de création ;
- identifiant juridique ou administratif (enregistrement, arrêté, affiliation, RCCM…), s'il existe ;
- représentant légal : nom, fonction, téléphone, e-mail ;
- compte de versement **au nom du club** : Mobile Money (numéro et opérateur) ou banque ;
- documents (PDF ou photos, 4 Mo au plus, photos allégées dans le navigateur avant l'envoi) : au moins
  un document qui atteste l'existence du club (statuts, enregistrement ou affiliation), plus la pièce
  d'identité du représentant et le justificatif du compte, conseillés.

L'inscription **ne donne aucun droit** : le dossier passe de « en préparation » à « en cours de
vérification » quand le club l'envoie. L'équipe Tribune confirme trois points de contrôle (existence du
club, représentant légal, compte de versement) pour le vérifier, ou demande des compléments (le club
corrige et renvoie), ou refuse. Seul un club vérifié dépose une campagne. Chaque étape est notifiée au
club et inscrite au journal d'audit.

Les données sensibles (adresse, coordonnées du représentant, compte de versement) sont dans la table
`club_private`, lisible seulement par les membres du club et l'équipe ; les documents sont dans un
bucket privé (`club-documents`) et servis par le site (`/club/documents/<id>`) après vérification des
droits, jamais par un lien public.

## Paramètres d'une campagne

Le club fixe, et l'équipe vérifie à l'instruction :

- la **durée de la collecte** (14 à 70 jours), qui démarre le jour de la publication : la date de fin
  est calculée à ce moment-là (le temps d'instruction ne raccourcit plus la collecte) ;
- la **contribution minimum** par supporter, et si besoin un **maximum par supporter** (plafond du
  cumul de ses contributions à la campagne, pour une collecte partagée par le plus grand nombre) ;
- une **photo de couverture**, modifiable par le club tant que le dossier n'est pas envoyé, puis par l'équipe.

La fiche d'une campagne affiche le club et l'état de la collecte, la photo, le montant collecté,
l'objectif, le pourcentage atteint, le nombre de supporters, la contribution minimum et la durée
restante. Les montants minimum et maximum sont vérifiés par l'application et par la base (déclencheur
sur `contributions`). Les campagnes sont des **dons** : le site parle de « contribution », jamais
d'investissement.

## Communication

- **Notifications** dans le site (cloche dans l'en-tête, page `/notifications`), créées par la base :
  lancement d'un projet par un club suivi (ou soutenu auparavant), objectif atteint, nouvelles et
  messages du club, suspension, clôture (financée ou remboursée), réponses aux commentaires, décisions
  de l'équipe pour les clubs. Pas encore d'envoi par SMS ou e-mail.
- **Commentaires** sur les campagnes publiques : supporters et réponses du club (un niveau de
  réponses), mention « contributeur », signalements, modération par l'équipe (`/admin/commentaires`).
- **Actualités** : nouvelles d'une campagne ou actualités du club sans campagne (page `/clubs/<club>`
  et fil `/actualites`), et **messages réservés aux contributeurs** d'une campagne. Tout est relu par
  l'équipe avant publication ; un refus est motivé.
- **Partage** : WhatsApp, Facebook, X, Telegram, copie du lien, partage du téléphone. L'aperçu
  (image du lien) est la photo du projet, allégée à l'envoi pour rester léger sur WhatsApp, ou à
  défaut une image aux couleurs du club générée par `/campagnes/<slug>/image-partage`.
- **Ambassadeurs** : chaque compte a un code (`?ref=…`), gardé 30 jours dans un cookie ; la
  contribution suivante lui est attribuée. Le compte affiche ses résultats ; le classement montre son
  prénom seulement s'il l'accepte.
- **Classement** (`/classement`) : campagnes les plus soutenues (nombre de supporters, puis montant),
  clubs les plus soutenus, ambassadeurs.

## Connexion en deux étapes (codes SMS)

Aucun e-mail n'est envoyé : le compte est vérifié par un **code à 6 chiffres envoyé par SMS** au
numéro du compte.

- **Inscription** : le compte est créé, puis le code confirme que le numéro appartient bien à la personne.
- **Connexion** : e-mail ou numéro, mot de passe, puis code SMS. Sans le code, aucune session n'est
  ouverte ; une session obtenue avec le seul mot de passe (en appelant Supabase directement) est refusée par le site.
- **Mot de passe oublié** : un code SMS permet de choisir un nouveau mot de passe.
- Un code vaut 10 minutes, 5 essais au plus, 3 codes par quart d'heure et par compte.
- Un numéro ne sert qu'à un seul compte. Une inscription jamais confirmée libère le numéro au bout de 30 minutes.
- Le numéro ne se change pas depuis le profil (il reçoit les codes) : l'équipe Tribune s'en charge.

Sans configuration, les SMS sont **simulés** : le code s'affiche à l'écran (démonstration). En
production, la simulation n'est acceptée qu'avec `ALLOW_SIMULATED_SMS=true` ou `ALLOW_SIMULATED_PAYMENTS=true`.

Pour envoyer de vrais SMS avec [Twilio](https://www.twilio.com) (qui couvre la RDC) :

```
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=AC…
TWILIO_AUTH_TOKEN=…
TWILIO_FROM=TRIBUNE          # ou un numéro Twilio, ou TWILIO_MESSAGING_SERVICE_SID=MG…
```

Activez la RDC dans Twilio (Messaging → Settings → Geo permissions). Le fournisseur est isolé dans
[`src/lib/sms.ts`](src/lib/sms.ts) : un autre fournisseur (Africa's Talking, Orange SMS API…) s'y ajoute facilement.

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

   Le fichier [`vercel.json`](vercel.json) fait tourner le serveur à Paris (`cdg1`), à côté de la base
   Supabase (`eu-west-3`) : chaque page fait plusieurs lectures en base, et un serveur aux États-Unis
   (réglage par défaut de Vercel) les ralentirait toutes. Si votre projet Supabase est dans une autre
   région, choisissez la région Vercel la plus proche.
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
JWT_SECRET=$(grep ^JWT_SECRET= .env | cut -d= -f2) node keys.mjs   # copiez les clés affichées dans .env et ../../.env.local
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
- Notifications SMS et e-mail aux supporters (reçus, nouvelles, remboursements) : les notifications
  existent dans le site (table `notifications`), il reste à les envoyer aussi par SMS ou e-mail.
- Connexion par code SMS (Supabase Auth « phone »), utile pour les supporters sans e-mail.
- Vérification de la signature des notifications pawaPay (en plus de la revérification actuelle).
- Clôture automatique des campagnes à leur date de fin (tâche planifiée).

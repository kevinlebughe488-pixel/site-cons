# Graph Report - site-cons  (2026-11-19)

## Corpus Check
- 142 files · ~97,058 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1008 nodes · 3218 edges · 43 communities (35 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `92c5cf73`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- transactions/page.tsx
- formatMoney
- next
- pawapay.ts
- actions/auth.ts
- actions/admin.ts
- club/page.tsx
- dependencies
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- README.md
- public.campaigns
- environment
- Tribune Supporters
- server.ts
- scripts
- storage
- services
- db
- environment
- environment
- 20261026000100_schema.sql
- public.clubs
- 20261120000100_controle_conformite.sql
- 20261101000400_communication.sql
- createClient
- club.ts
- Mise en route avec Supabase
- next
- actualites/page.tsx
- eslint-config-next
- ouvrir/[id]/route.ts
- promote.mjs
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 94 edges
2. `next` - 74 edges
3. `SubmitButton()` - 60 edges
4. `formatMoney()` - 56 edges
5. `getViewer` - 56 edges
6. `public.campaigns` - 49 edges
7. `formatDate()` - 47 edges
8. `text()` - 46 edges
9. `can()` - 43 edges
10. `public.clubs` - 43 edges

## Surprising Connections (you probably didn't know these)
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `CampaignEditor()` --indirect_call--> `saveCampaign()`  [INFERRED]
  src/app/club/campagnes/CampaignEditor.tsx → src/lib/actions/club.ts
- `ClubDossierForm()` --indirect_call--> `saveClubDossier()`  [INFERRED]
  src/app/club/ClubDossierForm.tsx → src/lib/actions/club.ts
- `DocumentUpload()` --indirect_call--> `uploadClubDocument()`  [INFERRED]
  src/app/club/DocumentUpload.tsx → src/lib/actions/club.ts
- `CoverUpload()` --indirect_call--> `uploadCampaignCover()`  [INFERRED]
  src/app/club/campagnes/CoverUpload.tsx → src/lib/actions/club.ts

## Import Cycles
- None detected.

## Communities (43 total, 8 thin omitted)

### Community 0 - "transactions/page.tsx"
Cohesion: 0.07
Nodes (47): metadata, Row, STATUSES, TONE, POST(), POST(), ContributeForm(), onPhoneChange() (+39 more)

### Community 1 - "formatMoney"
Cohesion: 0.05
Nodes (108): metadata, TABS, metadata, ReferenceFields(), CampaignsPage(), metadata, STATUS_FILTERS, Comments() (+100 more)

### Community 2 - "next"
Cohesion: 0.13
Nodes (20): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), RootLayout(), CookieBanner(), decide() (+12 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.07
Nodes (29): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), DemoBanner(), PaymentMode, paymentMode() (+21 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.09
Nodes (44): server-only, metadata, ResetPasswordPage(), INTROS, metadata, TITLES, VerificationPage(), cancelVerification() (+36 more)

### Community 5 - "actions/admin.ts"
Cohesion: 0.11
Nodes (28): Detail, metadata, closeCampaign(), moderateComment(), recordPublicationFee(), reviewCampaign(), reviewClub(), reviewIdentity() (+20 more)

### Community 6 - "club/page.tsx"
Cohesion: 0.05
Nodes (93): react, AdminCampaignPage(), AdminCampaignsPage(), AdminClubsPage(), ClubRow, KIND_LABEL, metadata, PROOF (+85 more)

### Community 7 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, zod@4.6.7, react-dom (+2 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.18
Nodes (14): devDependencies, eslint@9.39.5, @types/node@22.20.5, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@5.9.3, name, private (+6 more)

### Community 10 - "public.profiles"
Cohesion: 0.09
Nodes (26): club_members_user_idx, public.admin_set_role(), public.campaign_public_contributions(), public.club_members, public.current_app_role(), public.declare_identity(), public.is_club_member(), public.profiles (+18 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "README.md"
Cohesion: 0.22
Nodes (3): validDossier, regions, $schema

### Community 14 - "public.campaigns"
Cohesion: 0.11
Nodes (23): campaigns_club_idx, campaigns_status_idx, public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), platform_settings_touch (+15 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "Tribune Supporters"
Cohesion: 0.14
Nodes (14): Communication, Connexion en deux étapes (codes SMS), Contrôle de conformité des campagnes, Déploiement sur Vercel, Développement local sans projet Supabase, Inscription et vérification des clubs, Modèle économique (plan d'affaires de Plumes Capital), Paiements Mobile Money avec pawaPay (+6 more)

### Community 17 - "server.ts"
Cohesion: 0.23
Nodes (8): ContributePage(), metadata, GET(), GET(), metadata, STATUS_TONE, env, createAdminClient()

### Community 18 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, promote, seed:demo, start, typecheck

### Community 19 - "storage"
Cohesion: 0.18
Nodes (11): depends_on, image, condition, db, rest, condition, auth, storage (+3 more)

### Community 20 - "services"
Cohesion: 0.20
Nodes (9): depends_on, image, ports, volumes, name, services, gateway, volumes (+1 more)

### Community 21 - "db"
Cohesion: 0.20
Nodes (10): command, healthcheck, image, ports, volumes, interval, retries, test (+2 more)

### Community 22 - "environment"
Cohesion: 0.20
Nodes (10): environment, JWT_EXP, JWT_SECRET, PGDATABASE, PGPASSWORD, PGPORT, POSTGRES_DB, POSTGRES_HOST (+2 more)

### Community 23 - "environment"
Cohesion: 0.22
Nodes (9): PGRST_DB_ANON_ROLE, PGRST_DB_SCHEMAS, PGRST_DB_URI, PGRST_DB_USE_LEGACY_GUCS, PGRST_JWT_SECRET, depends_on, environment, image (+1 more)

### Community 24 - "20261026000100_schema.sql"
Cohesion: 0.08
Nodes (30): audit_log_created_idx, audit_log_entity_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_refresh_totals, contributions_status_created_idx, contributions_touch (+22 more)

### Community 25 - "public.clubs"
Cohesion: 0.13
Nodes (18): public.admin_add_club_member(), public.clubs, public.save_campaign_draft(), public.submit_campaign(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents (+10 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.08
Nodes (20): budget_lines_campaign_idx, milestones_campaign_idx, public.campaign_budget_lines, public.campaign_milestones, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents (+12 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.08
Nodes (23): public.campaign_updates, updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify (+15 more)

### Community 28 - "createClient"
Cohesion: 0.20
Nodes (26): metadata, requestAccountDeletion(), updateProfile(), addClubMember(), refundCampaign(), refundContribution(), completeMilestone(), parseJsonList() (+18 more)

### Community 31 - "club.ts"
Cohesion: 0.15
Nodes (27): CAMPAIGN_FIELDS, CampaignRef, deleteCampaignDocument(), deleteClubDocument(), DOSSIER_FIELDS, EDITABLE_CAMPAIGN, EDITABLE_DOSSIER, editableCampaign() (+19 more)

### Community 32 - "Mise en route avec Supabase"
Cohesion: 0.40
Nodes (5): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Mise en route avec Supabase

### Community 33 - "next"
Cohesion: 0.07
Nodes (30): nextConfig, next, ForbiddenPage(), metadata, metadata, GET(), GET(), GET() (+22 more)

### Community 34 - "actualites/page.tsx"
Cohesion: 0.50
Nodes (3): metadata, NewsPage(), NewsRow

### Community 35 - "eslint-config-next"
Cohesion: 0.50
Nodes (3): config, eslint-config-next@16.4.3, eslint-config-next

### Community 42 - "promote.mjs"
Cohesion: 0.33
Nodes (5): @supabase/supabase-js@2.118.0, @supabase/supabase-js, [email, role = "admin"], ROLES, supabase

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `transactions/page.tsx`, `formatMoney`, `actualites/page.tsx`, `pawapay.ts`, `next`, `actions/admin.ts`, `club/page.tsx`, `dependencies`, `actions/auth.ts`, `package.json`, `ouvrir/[id]/route.ts`, `server.ts`, `createClient`, `club.ts`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `transactions/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0677555958862674 - nodes in this community are weakly interconnected._
- **Why does `Tribune Supporters` connect `Tribune Supporters` to `Mise en route avec Supabase`, `README.md`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `formatMoney` be split into smaller, more focused modules?**
  _Cohesion score 0.05061655901350558 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `transactions/page.tsx`, `formatMoney`, `actualites/page.tsx`, `next`, `ouvrir/[id]/route.ts`, `actions/admin.ts`, `club/page.tsx`, `actions/auth.ts`, `server.ts`, `club.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07329462989840348 - nodes in this community are weakly interconnected._
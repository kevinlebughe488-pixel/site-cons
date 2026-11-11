# Graph Report - site-cons  (2026-11-11)

## Corpus Check
- 128 files · ~91,304 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 960 nodes · 2991 edges · 40 communities (35 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f0169d53`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- createClient
- formatMoney
- next
- pawapay.ts
- SubmitButton
- rbac.ts
- club/page.tsx
- can
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- formatDate
- public.campaigns
- environment
- Tribune Supporters
- createClient
- admin/page.tsx
- storage
- services
- db
- environment
- environment
- 20261026000100_schema.sql
- public.clubs
- mise-a-jour-production.sql
- 20261101000400_communication.sql
- service.ts
- verification.ts
- public.contributions
- PaymentGateway
- app/layout.tsx
- public.campaign_updates
- index.ts

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 89 edges
2. `next` - 69 edges
3. `public.campaigns` - 56 edges
4. `public.clubs` - 54 edges
5. `SubmitButton()` - 54 edges
6. `formatMoney()` - 50 edges
7. `getViewer` - 48 edges
8. `public.profiles` - 46 edges
9. `text()` - 43 edges
10. `can()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `clubs_status_notify` --triggers--> `public.clubs`  [EXTRACTED]
  supabase/migrations/20261101000400_communication.sql → supabase/migrations/20261026000100_schema.sql
- `public.campaigns_goal_notify()` --reads_from--> `public.clubs`  [EXTRACTED]
  supabase/migrations/20261101000400_communication.sql → supabase/migrations/20261026000100_schema.sql
- `campaigns_goal_notify` --triggers--> `public.campaigns`  [EXTRACTED]
  supabase/migrations/20261101000400_communication.sql → supabase/migrations/20261026000100_schema.sql
- `campaigns_status_notify` --triggers--> `public.campaigns`  [EXTRACTED]
  supabase/migrations/20261101000400_communication.sql → supabase/migrations/20261026000100_schema.sql
- `campaigns_goal_notify` --triggers--> `public.campaigns`  [EXTRACTED]
  supabase/mise-a-jour-production.sql → supabase/migrations/20261026000100_schema.sql

## Import Cycles
- None detected.

## Communities (40 total, 5 thin omitted)

### Community 0 - "createClient"
Cohesion: 0.08
Nodes (71): ContributeForm(), onPhoneChange(), PRESETS, Props, requestAccountDeletion(), updateProfile(), addClubMember(), checkPawapay() (+63 more)

### Community 1 - "formatMoney"
Cohesion: 0.07
Nodes (84): metadata, NewsPage(), NewsRow, AdminCampaignPage(), Detail, metadata, AdminCampaignsPage(), metadata (+76 more)

### Community 2 - "next"
Cohesion: 0.07
Nodes (34): ForbiddenPage(), metadata, metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), RootLayout() (+26 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.14
Nodes (16): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+8 more)

### Community 4 - "SubmitButton"
Cohesion: 0.06
Nodes (56): react, CommentForm(), CommentItem(), Comments(), Props, addDays(), CampaignEditor(), EditorValues (+48 more)

### Community 5 - "rbac.ts"
Cohesion: 0.12
Nodes (17): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), metadata, DOC_TYPES, KYC_LABELS (+9 more)

### Community 6 - "club/page.tsx"
Cohesion: 0.13
Nodes (22): ClubRow, KIND_LABEL, metadata, PROOF, TABS, Check(), ClubPage(), dossierValues() (+14 more)

### Community 7 - "can"
Cohesion: 0.14
Nodes (20): GET(), AdminTransactionsPage(), metadata, Row, STATUSES, TONE, metadata, STATUS_TONE (+12 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (44): config, dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+36 more)

### Community 10 - "public.profiles"
Cohesion: 0.08
Nodes (31): club_members_user_idx, public.admin_set_role(), public.campaign_public_contributions(), public.club_members, public.complete_milestone(), public.current_app_role(), public.declare_identity(), public.is_club_member() (+23 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "formatDate"
Cohesion: 0.25
Nodes (16): AdminClubsPage(), AdminCommentsPage(), metadata, Row, TABS, AdminUpdatesPage(), metadata, Row (+8 more)

### Community 14 - "public.campaigns"
Cohesion: 0.10
Nodes (25): campaigns_club_idx, campaigns_status_idx, public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), public.save_campaign_draft(), public.set_campaign_suspension() (+17 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "Tribune Supporters"
Cohesion: 0.07
Nodes (21): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion en deux étapes (codes SMS), Déploiement sur Vercel, Développement local sans projet Supabase (+13 more)

### Community 17 - "createClient"
Cohesion: 0.14
Nodes (18): nextConfig, next, AuditLogPage(), metadata, GET(), GET(), metadata, NewPasswordPage() (+10 more)

### Community 18 - "admin/page.tsx"
Cohesion: 0.27
Nodes (9): AdminDashboard(), loadDashboard(), metadata, PlanRow(), addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod (+1 more)

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
Cohesion: 0.09
Nodes (21): audit_log_created_idx, audit_log_entity_idx, budget_lines_campaign_idx, campaigns_touch, clubs_touch, contributions_touch, milestones_campaign_idx, on_auth_user_created (+13 more)

### Community 25 - "public.clubs"
Cohesion: 0.10
Nodes (25): public.admin_add_club_member(), public.clubs, public.submit_campaign(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents, public.club_private (+17 more)

### Community 26 - "mise-a-jour-production.sql"
Cohesion: 0.09
Nodes (20): campaigns_goal_notify, campaigns_goal_reached, club_documents_club_idx, club_private_touch, notifications_unread_idx, notifications_user_idx, profiles_1_referral, public.campaign_comments (+12 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.09
Nodes (22): campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify, contributions_referred_idx, notifications_unread_idx, notifications_user_idx, profiles_1_referral (+14 more)

### Community 28 - "service.ts"
Cohesion: 0.24
Nodes (18): GET(), POST(), POST(), round2(), activeGateway(), gatewayFor(), audit(), finishRefund() (+10 more)

### Community 31 - "verification.ts"
Cohesion: 0.28
Nodes (13): DemoBanner(), sendSms(), SmsMode, smsMode(), ChallengePurpose, ChallengeRow, confirmChallenge(), currentChallenge() (+5 more)

### Community 32 - "public.contributions"
Cohesion: 0.14
Nodes (16): contributions_campaign_status_idx, contributions_refresh_totals, contributions_status_created_idx, contributions_user_idx, public.contributions, public.platform_stats(), public.refresh_campaign_totals(), public.club_ranking() (+8 more)

### Community 33 - "PaymentGateway"
Cohesion: 0.21
Nodes (4): outcome(), SimulationGateway, KnownTransaction, PaymentGateway

### Community 34 - "app/layout.tsx"
Cohesion: 0.24
Nodes (6): server-only, body, display, metadata, viewport, env

### Community 35 - "public.campaign_updates"
Cohesion: 0.25
Nodes (8): public.campaign_updates, updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update()

### Community 36 - "index.ts"
Cohesion: 0.43
Nodes (5): ContributePage(), metadata, PaymentMode, paymentMode(), PaymentProviderName

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `createClient`, `formatMoney`, `next`, `app/layout.tsx`, `SubmitButton`, `rbac.ts`, `club/page.tsx`, `can`, `index.ts`, `package.json`, `formatDate`, `admin/page.tsx`, `service.ts`, `verification.ts`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.07623456790123456 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `createClient`, `formatMoney`, `next`, `index.ts`, `rbac.ts`, `club/page.tsx`, `can`, `SubmitButton`, `formatDate`, `admin/page.tsx`, `service.ts`, `verification.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `formatMoney` be split into smaller, more focused modules?**
  _Cohesion score 0.0706959706959707 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `package.json` to `createClient`, `formatMoney`, `app/layout.tsx`, `SubmitButton`, `seed-demo.mjs`, `Tribune Supporters`, `createClient`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.07215541165587419 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13846153846153847 - nodes in this community are weakly interconnected._
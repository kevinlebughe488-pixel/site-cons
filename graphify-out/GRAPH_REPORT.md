# Graph Report - site-cons  (2026-11-21)

## Corpus Check
- 149 files · ~103,975 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1072 nodes · 3383 edges · 50 communities (39 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f3a8b18`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- lib/types.ts
- app/layout.tsx
- pawapay.ts
- actions/auth.ts
- club/page.tsx
- app/layout.tsx
- createClient
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- inscription/page.tsx
- public.campaigns
- environment
- prix/page.tsx
- next
- lib/auth.ts
- storage
- services
- db
- environment
- environment
- 20261026000100_schema.sql
- public.clubs
- 20261120000100_controle_conformite.sql
- 20261101000400_communication.sql
- dependencies
- club.ts
- contributions/[id]/page.tsx
- scripts
- notifications/page.tsx
- public.compute_campaign_compliance
- @supabase/supabase-js
- keys.mjs
- comment-ca-marche/page.tsx
- eslint-config-next
- CLAUDE.md
- .claude/CLAUDE.md
- public.clubs

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 96 edges
2. `next` - 77 edges
3. `SubmitButton()` - 60 edges
4. `formatMoney()` - 56 edges
5. `getViewer` - 55 edges
6. `public.campaigns` - 52 edges
7. `text()` - 49 edges
8. `formatDate()` - 49 edges
9. `public.clubs` - 48 edges
10. `createAdminClient()` - 45 edges

## Surprising Connections (you probably didn't know these)
- `ClubDossierForm()` --indirect_call--> `saveClubDossier()`  [INFERRED]
  src/app/club/ClubDossierForm.tsx → src/lib/actions/club.ts
- `RegisterForm()` --indirect_call--> `register()`  [INFERRED]
  src/app/inscription/RegisterForm.tsx → src/lib/actions/auth.ts
- `LoginForm()` --indirect_call--> `signIn()`  [INFERRED]
  src/app/connexion/LoginForm.tsx → src/lib/actions/auth.ts
- `CodeForm()` --indirect_call--> `verifyCode()`  [INFERRED]
  src/app/verification/CodeForm.tsx → src/lib/actions/auth.ts
- `ChangePasswordForm()` --indirect_call--> `changePassword()`  [INFERRED]
  src/app/compte/mot-de-passe/ChangePasswordForm.tsx → src/lib/actions/auth.ts

## Import Cycles
- None detected.

## Communities (50 total, 11 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.05
Nodes (99): metadata, TABS, ClubRow, KIND_LABEL, metadata, PROOF, TABS, CampaignsPage() (+91 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.13
Nodes (21): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+13 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.07
Nodes (30): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), ContributePage(), metadata, PaymentMode (+22 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.11
Nodes (38): server-only, Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), notifyPasswordChanged(), REGISTER_FIELDS (+30 more)

### Community 5 - "club/page.tsx"
Cohesion: 0.05
Nodes (102): react, AdminCampaignPage(), AdminCampaignsPage(), AdminClubsPage(), AdminCommentsPage(), metadata, Row, TABS (+94 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.21
Nodes (11): body, display, metadata, RootLayout(), viewport, DemoBanner(), Footer(), FreshOnBack() (+3 more)

### Community 7 - "createClient"
Cohesion: 0.18
Nodes (18): metadata, NewsPage(), NewsRow, metadata, GET(), POST(), GET(), GET() (+10 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.19
Nodes (13): CLUBS, createUser(), dateIn(), daysAgo(), db, demoPdf(), FIRST, LAST (+5 more)

### Community 9 - "package.json"
Cohesion: 0.18
Nodes (14): devDependencies, eslint@9.39.5, @types/node@22.20.5, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@5.9.3, name, private (+6 more)

### Community 10 - "public.profiles"
Cohesion: 0.08
Nodes (27): club_members_user_idx, public.admin_set_role(), public.club_members, public.current_app_role(), public.declare_identity(), public.is_club_member(), public.profiles, public.register_club() (+19 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "inscription/page.tsx"
Cohesion: 0.24
Nodes (10): GET(), GET(), AccountChoice(), ClubIcon(), Kind, metadata, RegisterPage(), SupporterIcon() (+2 more)

### Community 14 - "public.campaigns"
Cohesion: 0.13
Nodes (18): public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), platform_settings_touch, public.admin_update_settings(), public.plan_indicators(), public.platform_settings (+10 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.12
Nodes (25): metadata, ReferenceFields(), addDays(), CampaignEditor(), EditorValues, Line, parse(), Step (+17 more)

### Community 17 - "next"
Cohesion: 0.20
Nodes (4): nextConfig, next, metadata, ResetPasswordPage()

### Community 18 - "lib/auth.ts"
Cohesion: 0.20
Nodes (9): ForbiddenPage(), metadata, CLUB_PRIORITY, Viewer, CLUB_SPACE_LABEL, FooterColumn, Navigation, NavLink (+1 more)

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
Cohesion: 0.07
Nodes (34): audit_log_created_idx, audit_log_entity_idx, campaigns_club_idx, campaigns_status_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_refresh_totals (+26 more)

### Community 25 - "public.clubs"
Cohesion: 0.18
Nodes (13): club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents, public.club_private, public.handle_new_user(), public.register_club(), public.review_club() (+5 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.11
Nodes (10): milestones_campaign_idx, public.campaign_milestones, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.compute_campaign_compliance(), public.price_references (+2 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.08
Nodes (22): campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify, notifications_unread_idx, notifications_user_idx, profiles_1_referral, public.campaign_comments (+14 more)

### Community 28 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, zod@4.6.7, react-dom (+2 more)

### Community 31 - "club.ts"
Cohesion: 0.05
Nodes (106): Detail, metadata, metadata, Row, STATUSES, TONE, POST(), POST() (+98 more)

### Community 32 - "contributions/[id]/page.tsx"
Cohesion: 0.36
Nodes (7): GET(), ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), providerLabel(), contributionRef()

### Community 33 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, promote, seed:demo, start, typecheck

### Community 34 - "notifications/page.tsx"
Cohesion: 0.36
Nodes (6): ChangePasswordPage(), metadata, icon(), metadata, NotificationsPage(), requireViewer()

### Community 35 - "public.compute_campaign_compliance"
Cohesion: 0.15
Nodes (6): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_photos_campaign_idx, campaign_photos_sha_idx, public.campaign_photos, public.compute_campaign_compliance()

### Community 36 - "@supabase/supabase-js"
Cohesion: 0.33
Nodes (5): @supabase/supabase-js@2.118.0, @supabase/supabase-js, [email, role = "admin"], ROLES, supabase

### Community 40 - "keys.mjs"
Cohesion: 0.50
Nodes (4): anon, b64(), service, sign()

### Community 41 - "comment-ca-marche/page.tsx"
Cohesion: 0.50
Nodes (4): clubSteps(), HowItWorksPage(), metadata, SUPPORTER_STEPS

### Community 42 - "eslint-config-next"
Cohesion: 0.50
Nodes (3): config, eslint-config-next@16.4.3, eslint-config-next

### Community 45 - "public.clubs"
Cohesion: 0.11
Nodes (23): public.admin_add_club_member(), public.campaign_updates, public.clubs, public.save_campaign_draft(), public.submit_campaign(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify (+15 more)

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `contributions/[id]/page.tsx`, `lib/types.ts`, `notifications/page.tsx`, `pawapay.ts`, `app/layout.tsx`, `club/page.tsx`, `app/layout.tsx`, `createClient`, `actions/auth.ts`, `package.json`, `comment-ca-marche/page.tsx`, `inscription/page.tsx`, `prix/page.tsx`, `lib/auth.ts`, `dependencies`, `club.ts`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `contributions/[id]/page.tsx`, `lib/types.ts`, `notifications/page.tsx`, `pawapay.ts`, `actions/auth.ts`, `club/page.tsx`, `comment-ca-marche/page.tsx`, `inscription/page.tsx`, `prix/page.tsx`, `lib/auth.ts`, `club.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05026419184392359 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0707070707070707 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1072463768115942 - nodes in this community are weakly interconnected._
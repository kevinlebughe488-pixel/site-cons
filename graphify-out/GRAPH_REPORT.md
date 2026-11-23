# Graph Report - site-cons  (2026-11-23)

## Corpus Check
- 163 files · ~120,657 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1172 nodes · 3847 edges · 52 communities (44 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `38295a06`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- formatMoney
- app/layout.tsx
- public.admin_remove_club_member
- actions/auth.ts
- formatDate
- app/layout.tsx
- 20261123000100_inscription_campagnes.sql
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- formatMoney
- lib/types.ts
- environment
- app/page.tsx
- createClient
- SubmitButton
- storage
- services
- db
- environment
- environment
- 20261026000100_schema.sql
- public.clubs
- 20261120000100_controle_conformite.sql
- 20261101000400_communication.sql
- contributions/[id]/page.tsx
- actions/admin.ts
- promote.mjs
- club/page.tsx
- public.sms_challenges
- pawapay.ts
- ClubDossier.tsx
- public.publication_fees
- CLAUDE.md
- .claude/CLAUDE.md
- public.campaign_updates
- public.admin_add_club_member
- server.ts
- plan.ts
- lib/types.ts
- getViewer
- notifications/page.tsx
- inscription/page.tsx
- next

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 104 edges
2. `next` - 83 edges
3. `public.campaigns` - 61 edges
4. `SubmitButton()` - 60 edges
5. `formatMoney()` - 59 edges
6. `public.clubs` - 58 edges
7. `public.profiles` - 57 edges
8. `getViewer` - 57 edges
9. `formatDate()` - 56 edges
10. `text()` - 52 edges

## Surprising Connections (you probably didn't know these)
- `NewsForm()` --indirect_call--> `postNews()`  [INFERRED]
  src/app/club/actualites/NewsForm.tsx → src/lib/actions/club.ts
- `CampaignPhotos()` --indirect_call--> `uploadCampaignPhoto()`  [INFERRED]
  src/app/club/campagnes/CampaignPhotos.tsx → src/lib/actions/club.ts
- `ChangePasswordForm()` --indirect_call--> `changePassword()`  [INFERRED]
  src/app/compte/mot-de-passe/ChangePasswordForm.tsx → src/lib/actions/auth.ts
- `LoginForm()` --indirect_call--> `signIn()`  [INFERRED]
  src/app/connexion/LoginForm.tsx → src/lib/actions/auth.ts
- `RegisterForm()` --indirect_call--> `register()`  [INFERRED]
  src/app/inscription/RegisterForm.tsx → src/lib/actions/auth.ts

## Import Cycles
- None detected.

## Communities (52 total, 8 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "formatMoney"
Cohesion: 0.18
Nodes (32): CampaignPage(), Detail, generateMetadata(), loadCampaign, AmbassadorRank, ClubRank, metadata, RankingPage() (+24 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.09
Nodes (28): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), body, display, metadata (+20 more)

### Community 3 - "public.admin_remove_club_member"
Cohesion: 0.17
Nodes (6): public.admin_remove_club_member(), public.review_club(), public.set_campaign_suspension(), public.admin_remove_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 4 - "actions/auth.ts"
Cohesion: 0.10
Nodes (42): server-only, Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), notifyPasswordChanged(), REGISTER_FIELDS (+34 more)

### Community 5 - "formatDate"
Cohesion: 0.18
Nodes (23): AdminCampaignPage(), AdminCampaignsPage(), AdminCommentsPage(), AdminUpdatesPage(), Audience(), metadata, Row, TABS (+15 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.14
Nodes (20): ForbiddenPage(), metadata, Footer(), Header(), Chevron(), currentHref(), isCurrent(), MainNav() (+12 more)

### Community 7 - "20261123000100_inscription_campagnes.sql"
Cohesion: 0.33
Nodes (5): campaigns_notify_staff, clubs_notify_staff, public.campaigns_notify_staff(), public.clubs_notify_staff(), public.staff_ids()

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (34): config, dependencies, next@16.4.6, react@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0, zod@4.6.7 (+26 more)

### Community 10 - "public.profiles"
Cohesion: 0.10
Nodes (25): club_members_user_idx, public.admin_add_club_member(), public.admin_set_role(), public.club_members, public.current_app_role(), public.is_club_member(), public.profiles, public.register_club() (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "formatMoney"
Cohesion: 0.17
Nodes (17): AdminDashboard(), loadDashboard(), metadata, PlanRow(), ClubsPage(), DirectoryClub, metadata, PREPARE (+9 more)

### Community 14 - "lib/types.ts"
Cohesion: 0.08
Nodes (43): metadata, PriceReferencesPage(), ReferenceFields(), addDays(), CampaignWizard(), draftNow(), leaveInfoStep(), onStepper() (+35 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "app/page.tsx"
Cohesion: 0.13
Nodes (19): @supabase/supabase-js, metadata, TABS, CampaignsPage(), metadata, STATUS_FILTERS, GET(), money() (+11 more)

### Community 17 - "createClient"
Cohesion: 0.23
Nodes (8): metadata, NewsPage(), NewsRow, AuditLogPage(), metadata, GET(), POST(), createClient()

### Community 18 - "SubmitButton"
Cohesion: 0.08
Nodes (66): react-dom@19.3.1, react, react-dom, CommentForm(), CommentItem(), Comments(), Props, CampaignChoice (+58 more)

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
Nodes (23): audit_log_created_idx, audit_log_entity_idx, campaigns_club_idx, campaigns_status_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_status_created_idx (+15 more)

### Community 25 - "public.clubs"
Cohesion: 0.14
Nodes (23): public.clubs, public.declare_identity(), public.handle_new_user(), public.review_club(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents (+15 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.09
Nodes (19): budget_lines_campaign_idx, milestones_campaign_idx, public.campaign_budget_lines, public.campaign_milestones, public.save_campaign_draft(), public.save_campaign_draft(), campaign_documents_campaign_idx, price_references_label_idx (+11 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.08
Nodes (37): contributions_refresh_totals, public.campaign_public_contributions(), public.campaigns, public.close_campaign(), public.complete_milestone(), public.contributions, public.platform_stats(), public.refresh_campaign_totals() (+29 more)

### Community 28 - "contributions/[id]/page.tsx"
Cohesion: 0.21
Nodes (8): GET(), ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), ICONS, noop(), providerLabel()

### Community 31 - "actions/admin.ts"
Cohesion: 0.06
Nodes (88): POST(), POST(), updateProfile(), addClubMember(), checkPawapay(), closeCampaign(), CLUB_TABS, moderateComment() (+80 more)

### Community 32 - "promote.mjs"
Cohesion: 0.50
Nodes (3): [email, role = "admin"], ROLES, supabase

### Community 33 - "club/page.tsx"
Cohesion: 0.15
Nodes (19): ClubNewsPage(), metadata, ClubCampaignsPage(), metadata, NEXT_STEP, ClubPage(), dossierValues(), metadata (+11 more)

### Community 35 - "pawapay.ts"
Cohesion: 0.07
Nodes (30): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), ContributePage(), metadata, PaymentMode (+22 more)

### Community 40 - "ClubDossier.tsx"
Cohesion: 0.06
Nodes (46): CheckItem(), ClubDossier(), ClubRow, DECIDED, Doc, DossierRow, Field(), fullName() (+38 more)

### Community 42 - "public.publication_fees"
Cohesion: 0.15
Nodes (16): public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), public.submit_campaign(), platform_settings_touch, public.plan_indicators(), public.platform_settings, public.publication_fees (+8 more)

### Community 45 - "public.campaign_updates"
Cohesion: 0.18
Nodes (12): public.campaign_updates, public.review_campaign_update(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_notify, campaign_updates_notify_insert (+4 more)

### Community 47 - "public.admin_add_club_member"
Cohesion: 0.29
Nodes (3): public.admin_add_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 48 - "server.ts"
Cohesion: 0.09
Nodes (24): FeeRow, metadata, Row, STATUSES, TONE, metadata, metadata, STATUS_TONE (+16 more)

### Community 49 - "plan.ts"
Cohesion: 0.40
Nodes (5): addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod, PlanYear

### Community 50 - "lib/types.ts"
Cohesion: 0.13
Nodes (20): Detail, metadata, Detail, metadata, DEFAULT_SETTINGS, AuditEntry, BudgetLine, CAMPAIGN_DOCUMENT_KINDS (+12 more)

### Community 51 - "getViewer"
Cohesion: 0.24
Nodes (8): GET(), GET(), LoginPage(), metadata, metadata, ResetPasswordPage(), getViewer, sessionOpeningPending()

### Community 54 - "notifications/page.tsx"
Cohesion: 0.27
Nodes (8): ChangePasswordPage(), metadata, icon(), metadata, NotificationsPage(), CLUB_PRIORITY, requireViewer(), Notification

### Community 55 - "inscription/page.tsx"
Cohesion: 0.21
Nodes (11): GET(), GET(), AccountChoice(), ClubIcon(), Kind, metadata, RegisterPage(), SupporterIcon() (+3 more)

### Community 57 - "next"
Cohesion: 0.18
Nodes (5): nextConfig, next, metadata, Row, TABS

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `formatMoney`, `app/layout.tsx`, `actions/auth.ts`, `formatDate`, `app/layout.tsx`, `package.json`, `formatMoney`, `lib/types.ts`, `app/page.tsx`, `createClient`, `SubmitButton`, `contributions/[id]/page.tsx`, `actions/admin.ts`, `club/page.tsx`, `pawapay.ts`, `ClubDossier.tsx`, `server.ts`, `lib/types.ts`, `getViewer`, `notifications/page.tsx`, `inscription/page.tsx`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `formatMoney`, `club/page.tsx`, `pawapay.ts`, `actions/auth.ts`, `formatDate`, `ClubDossier.tsx`, `formatMoney`, `lib/types.ts`, `app/page.tsx`, `server.ts`, `lib/types.ts`, `getViewer`, `SubmitButton`, `notifications/page.tsx`, `inscription/page.tsx`, `next`, `contributions/[id]/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09358974358974359 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0996078431372549 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13846153846153847 - nodes in this community are weakly interconnected._
- **Should `seed-demo.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.12987012987012986 - nodes in this community are weakly interconnected._
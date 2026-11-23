# Graph Report - site-cons  (2026-11-23)

## Corpus Check
- 165 files · ~121,993 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1184 nodes · 3902 edges · 54 communities (45 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `49943af9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- formatMoney
- app/layout.tsx
- public.admin_remove_club_member
- actions/auth.ts
- SubmitButton
- createClient
- 20261123000100_inscription_campagnes.sql
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- admin/page.tsx
- lib/types.ts
- environment
- ClubWizard.tsx
- createAdminClient
- forms.tsx
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
- CampaignDocuments.tsx
- club/page.tsx
- public.sms_challenges
- pawapay.ts
- forms.ts
- ClubDossier.tsx
- index.ts
- public.publication_fees
- CLAUDE.md
- .claude/CLAUDE.md
- public.campaign_updates
- Pill
- public.admin_add_club_member
- server.ts
- transactions/page.tsx
- lib/types.ts
- verification/page.tsx
- ContributeForm.tsx
- server-only

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 104 edges
2. `next` - 85 edges
3. `public.campaigns` - 61 edges
4. `SubmitButton()` - 60 edges
5. `formatMoney()` - 59 edges
6. `formatDate()` - 58 edges
7. `public.clubs` - 58 edges
8. `public.profiles` - 57 edges
9. `getViewer` - 57 edges
10. `text()` - 52 edges

## Surprising Connections (you probably didn't know these)
- `NewsForm()` --indirect_call--> `postNews()`  [INFERRED]
  src/app/club/actualites/NewsForm.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `CampaignPhotos()` --indirect_call--> `uploadCampaignPhoto()`  [INFERRED]
  src/app/club/campagnes/CampaignPhotos.tsx → src/lib/actions/club.ts
- `ChangePasswordForm()` --indirect_call--> `changePassword()`  [INFERRED]
  src/app/compte/mot-de-passe/ChangePasswordForm.tsx → src/lib/actions/auth.ts
- `ResetPasswordForm()` --indirect_call--> `resetPassword()`  [INFERRED]
  src/app/mot-de-passe-oublie/nouveau/ResetPasswordForm.tsx → src/lib/actions/auth.ts

## Import Cycles
- None detected.

## Communities (54 total, 9 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "formatMoney"
Cohesion: 0.09
Nodes (58): @supabase/supabase-js, [email, role = "admin"], ROLES, supabase, metadata, NewsPage(), NewsRow, metadata (+50 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.14
Nodes (20): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+12 more)

### Community 3 - "public.admin_remove_club_member"
Cohesion: 0.17
Nodes (6): public.admin_remove_club_member(), public.review_club(), public.set_campaign_suspension(), public.admin_remove_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 4 - "actions/auth.ts"
Cohesion: 0.15
Nodes (30): Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), notifyPasswordChanged(), REGISTER_FIELDS, registerSchema (+22 more)

### Community 5 - "SubmitButton"
Cohesion: 0.18
Nodes (27): AdminCampaignPage(), AdminCommentsPage(), metadata, Row, TABS, PriceReferencesPage(), AdminUsersPage(), CampaignDocuments() (+19 more)

### Community 6 - "createClient"
Cohesion: 0.05
Nodes (65): nextConfig, next, ForbiddenPage(), metadata, AuditLogPage(), metadata, GET(), GET() (+57 more)

### Community 7 - "20261123000100_inscription_campagnes.sql"
Cohesion: 0.33
Nodes (5): campaigns_notify_staff, clubs_notify_staff, public.campaigns_notify_staff(), public.clubs_notify_staff(), public.staff_ids()

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.6, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

### Community 10 - "public.profiles"
Cohesion: 0.10
Nodes (25): club_members_user_idx, public.admin_add_club_member(), public.admin_set_role(), public.club_members, public.current_app_role(), public.is_club_member(), public.profiles, public.register_club() (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "admin/page.tsx"
Cohesion: 0.26
Nodes (10): AdminDashboard(), loadDashboard(), metadata, PlanRow(), addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod (+2 more)

### Community 14 - "lib/types.ts"
Cohesion: 0.09
Nodes (38): metadata, ReferenceFields(), addDays(), CampaignWizard(), draftNow(), leaveInfoStep(), onStepper(), validUpTo() (+30 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "ClubWizard.tsx"
Cohesion: 0.10
Nodes (31): CheckRow(), ClubWizard(), leaveInfoStep(), onStepper(), validUpTo(), KIND_LABEL, Props, WizardClub (+23 more)

### Community 17 - "createAdminClient"
Cohesion: 0.22
Nodes (20): GET(), POST(), POST(), requestAccountDeletion(), contribute(), round2(), activeGateway(), gatewayFor() (+12 more)

### Community 18 - "forms.tsx"
Cohesion: 0.20
Nodes (18): react, CampaignChoice, NewsForm(), DocumentUpload(), ChangePasswordForm(), ChangePasswordPage(), metadata, LoginForm() (+10 more)

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
Cohesion: 0.22
Nodes (9): ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), ICONS, noop(), ShareButtons(), providerLabel() (+1 more)

### Community 31 - "actions/admin.ts"
Cohesion: 0.07
Nodes (65): OK_MESSAGES, OkKey, CommentForm(), CommentItem(), Comments(), Props, updateProfile(), addClubMember() (+57 more)

### Community 32 - "CampaignDocuments.tsx"
Cohesion: 0.19
Nodes (20): KIND_LABELS, ClubCrestMenu(), MenuClub, ClubNav(), TABS, ClubLayout(), accepted(), FileField() (+12 more)

### Community 33 - "club/page.tsx"
Cohesion: 0.17
Nodes (21): ClubPage(), dossierValues(), metadata, NEXT_STEP, OK_MESSAGES, olderThanDays(), PROOF_KINDS, Check() (+13 more)

### Community 35 - "pawapay.ts"
Cohesion: 0.10
Nodes (20): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+12 more)

### Community 36 - "forms.ts"
Cohesion: 0.16
Nodes (11): Props, RegisterForm(), findConflict(), register(), dnsWorks(), emailDomainExists(), NOT_FOUND, checked() (+3 more)

### Community 40 - "ClubDossier.tsx"
Cohesion: 0.12
Nodes (24): CheckItem(), ClubDossier(), ClubRow, DECIDED, Doc, DossierRow, Field(), fullName() (+16 more)

### Community 41 - "index.ts"
Cohesion: 0.27
Nodes (9): AdminNav(), AdminLayout(), OkNotice(), ContributePage(), metadata, DemoBanner(), PaymentMode, paymentMode() (+1 more)

### Community 42 - "public.publication_fees"
Cohesion: 0.15
Nodes (16): public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), public.submit_campaign(), platform_settings_touch, public.plan_indicators(), public.platform_settings, public.publication_fees (+8 more)

### Community 45 - "public.campaign_updates"
Cohesion: 0.18
Nodes (12): public.campaign_updates, public.review_campaign_update(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_notify, campaign_updates_notify_insert (+4 more)

### Community 46 - "Pill"
Cohesion: 0.23
Nodes (12): AdminUpdatesPage(), Audience(), metadata, Row, TABS, Where(), ClubNewsPage(), metadata (+4 more)

### Community 47 - "public.admin_add_club_member"
Cohesion: 0.29
Nodes (3): public.admin_add_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 48 - "server.ts"
Cohesion: 0.15
Nodes (16): metadata, metadata, STATUS_TONE, CONTRIBUTION_STATUS_LABELS, DOC_TYPES, KYC_LABELS, CLUB_MANAGER, COMPLIANCE (+8 more)

### Community 49 - "transactions/page.tsx"
Cohesion: 0.24
Nodes (10): AdminTransactionsPage(), FeeRow, FeesView(), metadata, Row, STATUSES, TONE, TransactionsIntro() (+2 more)

### Community 50 - "lib/types.ts"
Cohesion: 0.11
Nodes (25): Detail, metadata, AdminCampaignsPage(), Detail, metadata, ClubCampaignsPage(), metadata, NEXT_STEP (+17 more)

### Community 51 - "verification/page.tsx"
Cohesion: 0.23
Nodes (11): LoginPage(), metadata, CodeForm(), INTROS, metadata, TITLES, VerificationPage(), SessionRedirect() (+3 more)

### Community 52 - "ContributeForm.tsx"
Cohesion: 0.25
Nodes (9): ContributeForm(), onPhoneChange(), PRESETS, Props, COMMISSION_RATE, DRC_PROVIDERS, guessProvider(), MobileMoneyProvider (+1 more)

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `formatMoney`, `app/layout.tsx`, `actions/auth.ts`, `SubmitButton`, `package.json`, `admin/page.tsx`, `lib/types.ts`, `createAdminClient`, `forms.tsx`, `contributions/[id]/page.tsx`, `actions/admin.ts`, `CampaignDocuments.tsx`, `club/page.tsx`, `forms.ts`, `ClubDossier.tsx`, `index.ts`, `Pill`, `server.ts`, `transactions/page.tsx`, `lib/types.ts`, `verification/page.tsx`, `ContributeForm.tsx`?**
  _High betweenness centrality (0.079) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `formatMoney`, `club/page.tsx`, `actions/auth.ts`, `SubmitButton`, `ClubDossier.tsx`, `index.ts`, `admin/page.tsx`, `Pill`, `lib/types.ts`, `server.ts`, `transactions/page.tsx`, `lib/types.ts`, `createAdminClient`, `ClubWizard.tsx`, `contributions/[id]/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `formatMoney` be split into smaller, more focused modules?**
  _Cohesion score 0.09246575342465753 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14772727272727273 - nodes in this community are weakly interconnected._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05039193729003359 - nodes in this community are weakly interconnected._
# Graph Report - site-cons  (2026-11-23)

## Corpus Check
- 162 files · ~118,501 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1162 nodes · 3825 edges · 59 communities (51 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ea3be63a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- formatMoney
- app/layout.tsx
- service.ts
- actions/auth.ts
- formatDate
- app/layout.tsx
- payments/types.ts
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- formatMoney
- lib/types.ts
- environment
- labels.ts
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
- compte/page.tsx
- actions/admin.ts
- ContributeForm.tsx
- club/page.tsx
- visuals.tsx
- pawapay.ts
- index.ts
- ClubDossier.tsx
- app/layout.tsx
- public.publication_fees
- CLAUDE.md
- .claude/CLAUDE.md
- public.campaign_updates
- nouvelles/page.tsx
- public.admin_add_club_member
- lib/auth.ts
- plan.ts
- ClubWizard.tsx
- verification/page.tsx
- FileField
- ActionForm
- notifications/page.tsx
- inscription/page.tsx
- Comments.tsx
- commentaires/page.tsx

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 104 edges
2. `next` - 83 edges
3. `SubmitButton()` - 60 edges
4. `public.campaigns` - 60 edges
5. `formatMoney()` - 59 edges
6. `getViewer` - 57 edges
7. `formatDate()` - 56 edges
8. `public.profiles` - 56 edges
9. `public.clubs` - 56 edges
10. `text()` - 51 edges

## Surprising Connections (you probably didn't know these)
- `NewsForm()` --indirect_call--> `postNews()`  [INFERRED]
  src/app/club/actualites/NewsForm.tsx → src/lib/actions/club.ts
- `DocumentUpload()` --indirect_call--> `uploadClubDocument()`  [INFERRED]
  src/app/club/DocumentUpload.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `CampaignPhotos()` --indirect_call--> `uploadCampaignPhoto()`  [INFERRED]
  src/app/club/campagnes/CampaignPhotos.tsx → src/lib/actions/club.ts
- `ChangePasswordForm()` --indirect_call--> `changePassword()`  [INFERRED]
  src/app/compte/mot-de-passe/ChangePasswordForm.tsx → src/lib/actions/auth.ts

## Import Cycles
- None detected.

## Communities (59 total, 8 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "formatMoney"
Cohesion: 0.22
Nodes (26): CampaignPage(), Detail, generateMetadata(), loadCampaign, AmbassadorRank, ClubRank, metadata, RankingPage() (+18 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.13
Nodes (21): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+13 more)

### Community 3 - "service.ts"
Cohesion: 0.23
Nodes (17): GET(), POST(), POST(), round2(), activeGateway(), gatewayFor(), audit(), contributionRef() (+9 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.10
Nodes (40): metadata, ResetPasswordPage(), Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), findConflict() (+32 more)

### Community 5 - "formatDate"
Cohesion: 0.17
Nodes (25): AdminCampaignPage(), Detail, metadata, AdminCampaignsPage(), AdminCommentsPage(), AdminDashboard(), metadata, PlanRow() (+17 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.14
Nodes (20): ForbiddenPage(), metadata, Header(), Chevron(), currentHref(), isCurrent(), MainNav(), pathOf() (+12 more)

### Community 7 - "payments/types.ts"
Cohesion: 0.19
Nodes (8): outcome(), SimulationGateway, InitiationResult, InitiationStatus, KnownTransaction, PaymentGateway, RemoteStatus, RemoteTransaction

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (42): config, dependencies, next@16.4.6, react@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0, zod@4.6.7 (+34 more)

### Community 10 - "public.profiles"
Cohesion: 0.07
Nodes (36): club_members_user_idx, public.admin_add_club_member(), public.club_members, public.current_app_role(), public.is_club_member(), public.profiles, public.register_club(), public.review_identity() (+28 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "formatMoney"
Cohesion: 0.23
Nodes (10): metadata, NewCampaignPage(), clubSteps(), HowItWorksPage(), metadata, SUPPORTER_STEPS, listPriceReferences(), DEFAULT_SETTINGS (+2 more)

### Community 14 - "lib/types.ts"
Cohesion: 0.08
Nodes (46): metadata, PriceReferencesPage(), ReferenceFields(), addDays(), CampaignWizard(), draftNow(), leaveInfoStep(), onStepper() (+38 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "labels.ts"
Cohesion: 0.16
Nodes (15): metadata, TABS, CampaignsPage(), metadata, STATUS_FILTERS, CAMPAIGN_WITH_CLUB, listCampaigns(), LEVEL_LABELS (+7 more)

### Community 17 - "createClient"
Cohesion: 0.18
Nodes (16): nextConfig, next, AuditLogPage(), metadata, GET(), POST(), GET(), GET() (+8 more)

### Community 18 - "SubmitButton"
Cohesion: 0.25
Nodes (18): react, CampaignChoice, NewsForm(), CampaignPhotos(), ChangePasswordForm(), LoginForm(), LoginHelp(), Props (+10 more)

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
Nodes (40): audit_log_created_idx, audit_log_entity_idx, campaigns_club_idx, campaigns_status_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_refresh_totals (+32 more)

### Community 25 - "public.clubs"
Cohesion: 0.14
Nodes (24): public.clubs, public.declare_identity(), public.handle_new_user(), public.review_club(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents (+16 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.11
Nodes (14): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.compute_campaign_compliance(), public.price_references (+6 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.08
Nodes (25): campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify, contributions_referred_idx, notifications_unread_idx, notifications_user_idx, profiles_1_referral (+17 more)

### Community 28 - "compte/page.tsx"
Cohesion: 0.10
Nodes (19): server-only, FeeRow, metadata, Row, STATUSES, TONE, metadata, STATUS_TONE (+11 more)

### Community 31 - "actions/admin.ts"
Cohesion: 0.08
Nodes (69): requestAccountDeletion(), updateProfile(), addClubMember(), checkPawapay(), closeCampaign(), CLUB_TABS, moderateComment(), recordPublicationFee() (+61 more)

### Community 32 - "ContributeForm.tsx"
Cohesion: 0.38
Nodes (6): ContributeForm(), onPhoneChange(), PRESETS, Props, COMMISSION_RATE, guessProvider()

### Community 33 - "club/page.tsx"
Cohesion: 0.17
Nodes (17): ManageCampaignPage(), ClubCampaignsPage(), metadata, NEXT_STEP, ClubPage(), dossierValues(), metadata, NEXT_STEP (+9 more)

### Community 34 - "visuals.tsx"
Cohesion: 0.13
Nodes (23): metadata, NewsPage(), NewsRow, ClubNav(), TABS, ClubLayout(), ClubsPage(), DirectoryClub (+15 more)

### Community 35 - "pawapay.ts"
Cohesion: 0.14
Nodes (12): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+4 more)

### Community 36 - "index.ts"
Cohesion: 0.23
Nodes (10): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), ContributePage(), metadata, PaymentMode (+2 more)

### Community 40 - "ClubDossier.tsx"
Cohesion: 0.08
Nodes (37): CheckItem(), ClubDossier(), ClubRow, DECIDED, Doc, DossierRow, Field(), fullName() (+29 more)

### Community 41 - "app/layout.tsx"
Cohesion: 0.24
Nodes (8): body, display, metadata, RootLayout(), viewport, DemoBanner(), Footer(), FreshOnBack()

### Community 42 - "public.publication_fees"
Cohesion: 0.12
Nodes (19): public.admin_set_role(), public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), public.submit_campaign(), platform_settings_touch, public.admin_update_settings(), public.plan_indicators() (+11 more)

### Community 45 - "public.campaign_updates"
Cohesion: 0.18
Nodes (12): public.campaign_updates, public.review_campaign_update(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_notify, campaign_updates_notify_insert (+4 more)

### Community 46 - "nouvelles/page.tsx"
Cohesion: 0.38
Nodes (6): AdminUpdatesPage(), Audience(), metadata, Row, TABS, Where()

### Community 47 - "public.admin_add_club_member"
Cohesion: 0.29
Nodes (3): public.admin_add_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 48 - "lib/auth.ts"
Cohesion: 0.17
Nodes (11): metadata, DOC_TYPES, KYC_LABELS, CLUB_MANAGER, COMPLIANCE, MATRIX, Permission, Role (+3 more)

### Community 49 - "plan.ts"
Cohesion: 0.40
Nodes (5): addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod, PlanYear

### Community 50 - "ClubWizard.tsx"
Cohesion: 0.16
Nodes (18): CheckRow(), ClubWizard(), leaveInfoStep(), onStepper(), validUpTo(), DocList(), KIND_LABEL, Props (+10 more)

### Community 51 - "verification/page.tsx"
Cohesion: 0.31
Nodes (8): LoginPage(), metadata, INTROS, metadata, TITLES, VerificationPage(), SessionRedirect(), sessionOpeningPending()

### Community 52 - "FileField"
Cohesion: 0.28
Nodes (13): react-dom@19.3.1, react-dom, CampaignDocuments(), KIND_LABELS, accepted(), FileField(), onDrop(), prepare() (+5 more)

### Community 53 - "ActionForm"
Cohesion: 0.21
Nodes (15): DocumentList(), KIND_LABEL, PayoutSummary(), ClubProfilePage(), metadata, ForgotPasswordPage(), metadata, ActionForm() (+7 more)

### Community 54 - "notifications/page.tsx"
Cohesion: 0.27
Nodes (8): ChangePasswordPage(), metadata, icon(), metadata, NotificationsPage(), CLUB_PRIORITY, requireViewer(), Notification

### Community 55 - "inscription/page.tsx"
Cohesion: 0.24
Nodes (10): GET(), GET(), AccountChoice(), ClubIcon(), Kind, metadata, RegisterPage(), SupporterIcon() (+2 more)

### Community 56 - "Comments.tsx"
Cohesion: 0.70
Nodes (4): CommentForm(), CommentItem(), Comments(), Props

### Community 57 - "commentaires/page.tsx"
Cohesion: 0.50
Nodes (3): metadata, Row, TABS

## Knowledge Gaps
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `formatMoney`, `app/layout.tsx`, `service.ts`, `actions/auth.ts`, `formatDate`, `app/layout.tsx`, `package.json`, `formatMoney`, `lib/types.ts`, `labels.ts`, `SubmitButton`, `compte/page.tsx`, `actions/admin.ts`, `ContributeForm.tsx`, `club/page.tsx`, `visuals.tsx`, `index.ts`, `ClubDossier.tsx`, `app/layout.tsx`, `nouvelles/page.tsx`, `lib/auth.ts`, `verification/page.tsx`, `ActionForm`, `notifications/page.tsx`, `inscription/page.tsx`, `Comments.tsx`, `commentaires/page.tsx`, `not-found.tsx`?**
  _High betweenness centrality (0.077) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `formatMoney`, `service.ts`, `actions/auth.ts`, `formatDate`, `formatMoney`, `lib/types.ts`, `labels.ts`, `compte/page.tsx`, `actions/admin.ts`, `club/page.tsx`, `visuals.tsx`, `index.ts`, `ClubDossier.tsx`, `nouvelles/page.tsx`, `lib/auth.ts`, `ActionForm`, `notifications/page.tsx`, `inscription/page.tsx`, `commentaires/page.tsx`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `package.json` to `Tribune Supporters`, `formatMoney`, `actions/auth.ts`, `seed-demo.mjs`, `formatMoney`, `labels.ts`, `inscription/page.tsx`, `compte/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10083256244218317 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
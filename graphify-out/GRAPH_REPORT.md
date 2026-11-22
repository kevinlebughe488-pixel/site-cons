# Graph Report - site-cons  (2026-11-22)

## Corpus Check
- 161 files · ~118,055 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1159 nodes · 3812 edges · 57 communities (50 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3ccd3b7d`
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
- server-only
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- formatMoney
- CampaignWizard.tsx
- environment
- prix/page.tsx
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
- contribute.ts
- admin/campagnes/[id]/page.tsx
- getViewer
- pawapay.ts
- index.ts
- ClubDossier.tsx
- lib/types.ts
- public.publication_fees
- CLAUDE.md
- .claude/CLAUDE.md
- public.campaign_updates
- club-dossier.ts
- public.admin_add_club_member
- lib/auth.ts
- admin/page.tsx
- ClubWizard.tsx
- verification/page.tsx
- FileField
- parts.tsx
- notifications/page.tsx
- inscription/page.tsx
- Comments.tsx

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
- `CommentForm()` --indirect_call--> `postComment()`  [INFERRED]
  src/app/campagnes/[slug]/CommentForm.tsx → src/lib/actions/community.ts
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

## Communities (57 total, 7 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "formatMoney"
Cohesion: 0.07
Nodes (73): @supabase/supabase-js, [email, role = "admin"], ROLES, supabase, metadata, NewsPage(), NewsRow, AdminCampaignsPage() (+65 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.10
Nodes (26): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), body, display, metadata (+18 more)

### Community 3 - "service.ts"
Cohesion: 0.28
Nodes (17): POST(), POST(), round2(), activeGateway(), gatewayFor(), audit(), contributionRef(), finishRefund() (+9 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.14
Nodes (34): Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), notifyPasswordChanged(), REGISTER_FIELDS, registerSchema (+26 more)

### Community 5 - "formatDate"
Cohesion: 0.16
Nodes (28): AdminCampaignPage(), AdminCommentsPage(), metadata, Row, TABS, AdminUpdatesPage(), Audience(), metadata (+20 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.13
Nodes (21): ForbiddenPage(), metadata, Footer(), Header(), Chevron(), currentHref(), isCurrent(), MainNav() (+13 more)

### Community 7 - "server-only"
Cohesion: 0.27
Nodes (5): server-only, dnsWorks(), emailDomainExists(), NOT_FOUND, env

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.6, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

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
Cohesion: 0.17
Nodes (12): metadata, NewCampaignPage(), DirectoryClub, metadata, PREPARE, STEPS, clubSteps(), HowItWorksPage() (+4 more)

### Community 14 - "CampaignWizard.tsx"
Cohesion: 0.16
Nodes (22): addDays(), CampaignWizard(), draftNow(), leaveInfoStep(), onStepper(), validUpTo(), CheckRow(), EMPTY_LINE (+14 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.15
Nodes (17): metadata, ReferenceFields(), ComplianceReportView(), ICONS, SUMMARY, BLOCK_RATIO, ComplianceReport, formatRatio() (+9 more)

### Community 17 - "createClient"
Cohesion: 0.15
Nodes (14): nextConfig, next, AuditLogPage(), metadata, GET(), GET(), POST(), GET() (+6 more)

### Community 18 - "SubmitButton"
Cohesion: 0.22
Nodes (19): react, CampaignPhotos(), DocumentUpload(), ChangePasswordForm(), LoginForm(), LoginHelp(), Props, RegisterForm() (+11 more)

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
Cohesion: 0.11
Nodes (20): FeeRow, metadata, Row, STATUSES, TONE, metadata, STATUS_TONE, ContributionPage() (+12 more)

### Community 31 - "actions/admin.ts"
Cohesion: 0.08
Nodes (61): OK_MESSAGES, OkKey, updateProfile(), addClubMember(), checkPawapay(), closeCampaign(), CLUB_TABS, moderateComment() (+53 more)

### Community 32 - "contribute.ts"
Cohesion: 0.19
Nodes (18): ContributeForm(), onPhoneChange(), PRESETS, Props, findConflict(), register(), contribute(), COMMISSION_RATE (+10 more)

### Community 33 - "admin/campagnes/[id]/page.tsx"
Cohesion: 0.21
Nodes (13): Detail, metadata, CampaignDocuments(), KIND_LABELS, Detail, metadata, todayInKinshasa(), BudgetLine (+5 more)

### Community 34 - "getViewer"
Cohesion: 0.19
Nodes (16): GET(), ClubNav(), TABS, ClubLayout(), ClubsPage(), metadata, ResetPasswordPage(), deleteClubDocument() (+8 more)

### Community 35 - "pawapay.ts"
Cohesion: 0.10
Nodes (20): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+12 more)

### Community 36 - "index.ts"
Cohesion: 0.27
Nodes (9): AdminNav(), AdminLayout(), OkNotice(), ContributePage(), metadata, DemoBanner(), PaymentMode, paymentMode() (+1 more)

### Community 40 - "ClubDossier.tsx"
Cohesion: 0.13
Nodes (23): CheckItem(), ClubDossier(), ClubRow, DECIDED, Doc, DossierRow, Field(), fullName() (+15 more)

### Community 41 - "lib/types.ts"
Cohesion: 0.15
Nodes (13): AuditEntry, CampaignDocumentKind, CLUB_DOCUMENT_KINDS, CLUB_REVIEW_CRITERIA, ClubDocumentKind, CommentRow, NewsAudience, Notification (+5 more)

### Community 42 - "public.publication_fees"
Cohesion: 0.12
Nodes (19): public.admin_set_role(), public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), public.submit_campaign(), platform_settings_touch, public.admin_update_settings(), public.plan_indicators() (+11 more)

### Community 45 - "public.campaign_updates"
Cohesion: 0.18
Nodes (12): public.campaign_updates, public.review_campaign_update(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_notify, campaign_updates_notify_insert (+4 more)

### Community 46 - "club-dossier.ts"
Cohesion: 0.14
Nodes (15): AdminClubsPage(), CLUB_DOCUMENT_MAX_BYTES, CLUB_DOCUMENT_MAX_COUNT, DOCUMENT_KIND_LABEL, DOSSIER_FIELDS, DossierItem, DossierValues, EMPTY_DOSSIER (+7 more)

### Community 47 - "public.admin_add_club_member"
Cohesion: 0.29
Nodes (3): public.admin_add_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 48 - "lib/auth.ts"
Cohesion: 0.17
Nodes (12): metadata, CLUB_PRIORITY, DOC_TYPES, KYC_LABELS, CLUB_MANAGER, COMPLIANCE, MATRIX, Permission (+4 more)

### Community 49 - "admin/page.tsx"
Cohesion: 0.26
Nodes (10): AdminDashboard(), loadDashboard(), metadata, PlanRow(), unwrapPrivate(), addYears(), currentPlanPeriod(), PLAN_YEARS (+2 more)

### Community 50 - "ClubWizard.tsx"
Cohesion: 0.29
Nodes (10): CheckRow(), ClubWizard(), leaveInfoStep(), onStepper(), validUpTo(), KIND_LABEL, Props, WizardClub (+2 more)

### Community 51 - "verification/page.tsx"
Cohesion: 0.31
Nodes (8): LoginPage(), metadata, INTROS, metadata, TITLES, VerificationPage(), SessionRedirect(), sessionOpeningPending()

### Community 52 - "FileField"
Cohesion: 0.49
Nodes (8): accepted(), FileField(), onDrop(), prepare(), FolderIcon(), formatBytes(), replaceInputFile(), shrinkImage()

### Community 53 - "parts.tsx"
Cohesion: 0.39
Nodes (7): DocumentList(), KIND_LABEL, PayoutSummary(), ClubProfilePage(), metadata, ClubDocument, ClubPrivate

### Community 54 - "notifications/page.tsx"
Cohesion: 0.31
Nodes (7): ChangePasswordPage(), metadata, icon(), metadata, NotificationsPage(), markAllNotificationsRead(), requireViewer()

### Community 55 - "inscription/page.tsx"
Cohesion: 0.43
Nodes (6): AccountChoice(), ClubIcon(), Kind, metadata, RegisterPage(), SupporterIcon()

### Community 56 - "Comments.tsx"
Cohesion: 0.70
Nodes (4): CommentForm(), CommentItem(), Comments(), Props

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `formatMoney`, `app/layout.tsx`, `service.ts`, `actions/auth.ts`, `formatDate`, `app/layout.tsx`, `package.json`, `formatMoney`, `prix/page.tsx`, `SubmitButton`, `compte/page.tsx`, `actions/admin.ts`, `contribute.ts`, `admin/campagnes/[id]/page.tsx`, `getViewer`, `index.ts`, `ClubDossier.tsx`, `lib/auth.ts`, `admin/page.tsx`, `verification/page.tsx`, `parts.tsx`, `notifications/page.tsx`, `inscription/page.tsx`, `Comments.tsx`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `contribute.ts`, `formatMoney`, `admin/campagnes/[id]/page.tsx`, `getViewer`, `index.ts`, `formatDate`, `actions/auth.ts`, `ClubDossier.tsx`, `formatMoney`, `club-dossier.ts`, `prix/page.tsx`, `admin/page.tsx`, `lib/auth.ts`, `parts.tsx`, `notifications/page.tsx`, `inscription/page.tsx`, `compte/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `formatMoney` be split into smaller, more focused modules?**
  _Cohesion score 0.07252747252747253 - nodes in this community are weakly interconnected._
- **Why does `getViewer` connect `getViewer` to `formatMoney`, `actions/auth.ts`, `app/layout.tsx`, `formatMoney`, `lib/auth.ts`, `createClient`, `verification/page.tsx`, `notifications/page.tsx`, `inscription/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09957325746799431 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13813813813813813 - nodes in this community are weakly interconnected._
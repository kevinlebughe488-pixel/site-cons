# Graph Report - site-cons  (2026-11-22)

## Corpus Check
- 153 files · ~110,548 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1099 nodes · 3588 edges · 51 communities (42 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7ebfb7ce`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- lib/types.ts
- app/layout.tsx
- service.ts
- actions/auth.ts
- admin/campagnes/[id]/page.tsx
- app/layout.tsx
- createClient
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- formatMoney
- public.campaigns
- environment
- prix/page.tsx
- next
- ClubWizard.tsx
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
- app/page.tsx
- email-check.ts
- pawapay.ts
- index.ts
- ClubDossier.tsx
- lib/types.ts
- public.publication_fees
- CLAUDE.md
- .claude/CLAUDE.md
- public.campaign_updates
- PaymentGateway
- public.admin_add_club_member
- PawapayGateway
- 20261027000200_telephone_unique.sql
- public.sms_challenges

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 96 edges
2. `next` - 78 edges
3. `SubmitButton()` - 59 edges
4. `formatMoney()` - 56 edges
5. `public.campaigns` - 56 edges
6. `getViewer` - 55 edges
7. `formatDate()` - 52 edges
8. `public.profiles` - 52 edges
9. `text()` - 51 edges
10. `public.clubs` - 51 edges

## Surprising Connections (you probably didn't know these)
- `StaffDocumentUpload()` --indirect_call--> `addClubDocument()`  [INFERRED]
  src/app/admin/clubs/StaffDocumentUpload.tsx → src/lib/actions/admin.ts
- `DocumentUpload()` --indirect_call--> `uploadClubDocument()`  [INFERRED]
  src/app/club/DocumentUpload.tsx → src/lib/actions/club.ts
- `CampaignEditor()` --indirect_call--> `saveCampaign()`  [INFERRED]
  src/app/club/campagnes/CampaignEditor.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `CampaignPhotos()` --indirect_call--> `uploadCampaignPhoto()`  [INFERRED]
  src/app/club/campagnes/CampaignPhotos.tsx → src/lib/actions/club.ts

## Import Cycles
- None detected.

## Communities (51 total, 9 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.14
Nodes (38): metadata, NewsPage(), NewsRow, CampaignsPage(), CampaignPage(), Detail, generateMetadata(), loadCampaign (+30 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.14
Nodes (20): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+12 more)

### Community 3 - "service.ts"
Cohesion: 0.21
Nodes (18): GET(), POST(), POST(), refreshTransaction(), COMMISSION_RATE, round2(), activeGateway(), gatewayFor() (+10 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.14
Nodes (34): Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), notifyPasswordChanged(), REGISTER_FIELDS, registerSchema (+26 more)

### Community 5 - "admin/campagnes/[id]/page.tsx"
Cohesion: 0.16
Nodes (24): AdminCampaignPage(), Detail, metadata, AuditLogPage(), metadata, AdminUpdatesPage(), Audience(), metadata (+16 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.12
Nodes (18): ForbiddenPage(), metadata, body, display, metadata, RootLayout(), viewport, Footer() (+10 more)

### Community 7 - "createClient"
Cohesion: 0.25
Nodes (10): server-only, POST(), ContributePage(), metadata, GET(), GET(), requestAccountDeletion(), env (+2 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.05
Nodes (42): config, dependencies, next@16.4.6, react@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0, zod@4.6.7 (+34 more)

### Community 10 - "public.profiles"
Cohesion: 0.13
Nodes (15): club_members_user_idx, public.admin_add_club_member(), public.club_members, public.is_club_member(), public.register_club(), club_members_check_role, contributions_check_role, profiles_check_role_change (+7 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "formatMoney"
Cohesion: 0.17
Nodes (19): FeesNotice(), Detail, ManageCampaignPage(), metadata, metadata, NewCampaignPage(), DirectoryClub, metadata (+11 more)

### Community 14 - "public.campaigns"
Cohesion: 0.12
Nodes (20): campaigns_club_idx, campaigns_status_idx, milestones_campaign_idx, public.campaign_milestones, public.campaigns, public.close_campaign(), public.platform_stats(), public.post_campaign_update() (+12 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.12
Nodes (25): metadata, PriceReferencesPage(), ReferenceFields(), addDays(), CampaignEditor(), EditorValues, Line, parse() (+17 more)

### Community 17 - "next"
Cohesion: 0.14
Nodes (16): nextConfig, next, GET(), GET(), AccountChoice(), ClubIcon(), Kind, metadata (+8 more)

### Community 18 - "ClubWizard.tsx"
Cohesion: 0.06
Nodes (70): react-dom@19.3.1, react, react-dom, StaffDocumentUpload(), AdminCommentsPage(), metadata, Row, TABS (+62 more)

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
Cohesion: 0.10
Nodes (31): audit_log_created_idx, audit_log_entity_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_refresh_totals, contributions_status_created_idx, contributions_touch (+23 more)

### Community 25 - "public.clubs"
Cohesion: 0.15
Nodes (22): public.clubs, public.declare_identity(), public.handle_new_user(), public.review_club(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents (+14 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.11
Nodes (14): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.compute_campaign_compliance(), public.price_references (+6 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.09
Nodes (24): campaigns_goal_notify, campaigns_goal_reached, clubs_status_notify, contributions_referred_idx, notifications_unread_idx, notifications_user_idx, profiles_1_referral, public.campaign_backer_ids() (+16 more)

### Community 28 - "compte/page.tsx"
Cohesion: 0.11
Nodes (23): GET(), AdminTransactionsPage(), metadata, Row, STATUSES, TONE, PayoutSummary(), metadata (+15 more)

### Community 31 - "actions/admin.ts"
Cohesion: 0.07
Nodes (77): icon(), metadata, NotificationsPage(), updateProfile(), addClubDocument(), addClubMember(), closeCampaign(), CLUB_TABS (+69 more)

### Community 32 - "contribute.ts"
Cohesion: 0.25
Nodes (13): ContributeForm(), onPhoneChange(), PRESETS, Props, contribute(), KYC_THRESHOLD, checked(), DRC_PROVIDERS (+5 more)

### Community 33 - "app/page.tsx"
Cohesion: 0.16
Nodes (15): AdminCampaignsPage(), metadata, TABS, metadata, STATUS_FILTERS, followedClub(), HomePage(), myContributions() (+7 more)

### Community 34 - "email-check.ts"
Cohesion: 0.33
Nodes (5): findConflict(), register(), dnsWorks(), emailDomainExists(), NOT_FOUND

### Community 35 - "pawapay.ts"
Cohesion: 0.18
Nodes (12): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayInitiation, PawapaySearch, toInitiation(), DepositRequest (+4 more)

### Community 36 - "index.ts"
Cohesion: 0.23
Nodes (10): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), DemoBanner(), PaymentMode, paymentMode() (+2 more)

### Community 40 - "ClubDossier.tsx"
Cohesion: 0.07
Nodes (41): CheckItem(), ClubDossier(), ClubRow, DECIDED, Doc, DossierRow, Field(), fullName() (+33 more)

### Community 41 - "lib/types.ts"
Cohesion: 0.09
Nodes (29): metadata, Check(), ClubPage(), dossierValues(), KIND_LABEL, metadata, NEXT_STEP, OK_MESSAGES (+21 more)

### Community 42 - "public.publication_fees"
Cohesion: 0.24
Nodes (12): public.admin_set_role(), platform_settings_touch, public.admin_update_settings(), public.plan_indicators(), public.platform_settings, public.publication_fees, public.record_publication_fee_payment(), public.review_campaign() (+4 more)

### Community 45 - "public.campaign_updates"
Cohesion: 0.18
Nodes (12): public.campaign_updates, public.review_campaign_update(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_notify, campaign_updates_notify_insert (+4 more)

### Community 46 - "PaymentGateway"
Cohesion: 0.22
Nodes (5): outcome(), SimulationGateway, InitiationResult, KnownTransaction, PaymentGateway

### Community 47 - "public.admin_add_club_member"
Cohesion: 0.21
Nodes (6): public.admin_add_club_member(), public.review_club(), public.set_campaign_suspension(), public.admin_add_club_member(), public.review_club(), public.set_campaign_suspension()

### Community 48 - "PawapayGateway"
Cohesion: 0.31
Nodes (3): PawapayGateway, toRemote(), RemoteTransaction

## Knowledge Gaps
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `contribute.ts`, `lib/types.ts`, `app/page.tsx`, `service.ts`, `index.ts`, `admin/campagnes/[id]/page.tsx`, `app/layout.tsx`, `createClient`, `ClubDossier.tsx`, `package.json`, `lib/types.ts`, `app/layout.tsx`, `actions/auth.ts`, `formatMoney`, `prix/page.tsx`, `ClubWizard.tsx`, `compte/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `contribute.ts`, `lib/types.ts`, `app/page.tsx`, `service.ts`, `actions/auth.ts`, `admin/campagnes/[id]/page.tsx`, `ClubDossier.tsx`, `lib/types.ts`, `formatMoney`, `prix/page.tsx`, `next`, `ClubWizard.tsx`, `compte/page.tsx`, `actions/admin.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13813813813813813 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12307692307692308 - nodes in this community are weakly interconnected._
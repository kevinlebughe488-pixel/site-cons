# Graph Report - agent-aa8daecc7a2bdd7f2  (2026-11-22)

## Corpus Check
- 154 files · ~110,103 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .conf 1)

## Summary
- 1112 nodes · 3520 edges · 53 communities (41 shown, 12 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `78e3cfe7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- lib/types.ts
- app/layout.tsx
- pawapay.ts
- actions/auth.ts
- SubmitButton
- app/layout.tsx
- actions/admin.ts
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- admin/campagnes/[id]/page.tsx
- public.campaigns
- environment
- prix/page.tsx
- ClubDossier.tsx
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
- compte/page.tsx
- club.ts
- service.ts
- requirePermission
- club/page.tsx
- public.compute_campaign_compliance
- contribute.ts
- admin/page.tsx
- CampaignEditor.tsx
- lib/types.ts
- CLAUDE.md
- .claude/CLAUDE.md
- public.clubs
- email-check.ts
- admin/layout.tsx
- public.sms_challenges

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 96 edges
2. `next` - 78 edges
3. `SubmitButton()` - 62 edges
4. `formatMoney()` - 56 edges
5. `public.campaigns` - 56 edges
6. `getViewer` - 55 edges
7. `public.clubs` - 54 edges
8. `text()` - 50 edges
9. `formatDate()` - 49 edges
10. `public.profiles` - 49 edges

## Surprising Connections (you probably didn't know these)
- `StaffDocumentUpload()` --indirect_call--> `addClubDocument()`  [INFERRED]
  src/app/admin/clubs/StaffDocumentUpload.tsx → src/lib/actions/admin.ts
- `ContributeForm()` --indirect_call--> `contribute()`  [INFERRED]
  src/app/campagnes/[slug]/contribuer/ContributeForm.tsx → src/lib/actions/contribute.ts
- `RegisterForm()` --indirect_call--> `register()`  [INFERRED]
  src/app/inscription/RegisterForm.tsx → src/lib/actions/auth.ts
- `ClubDossierForm()` --indirect_call--> `saveClubDossier()`  [INFERRED]
  src/app/club/ClubDossierForm.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts

## Import Cycles
- None detected.

## Communities (53 total, 12 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.05
Nodes (98): nextConfig, next, metadata, NewsPage(), NewsRow, metadata, TABS, AuditLogPage() (+90 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.13
Nodes (21): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+13 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.10
Nodes (20): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+12 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.12
Nodes (36): server-only, DemoBanner(), Account, cancelVerification(), changePassword(), checkNewPassword(), findAccount(), notifyPasswordChanged() (+28 more)

### Community 5 - "SubmitButton"
Cohesion: 0.07
Nodes (56): react, StaffDocumentUpload(), CommentForm(), CommentItem(), Comments(), Props, ContributeForm(), onPhoneChange() (+48 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.23
Nodes (8): body, display, metadata, RootLayout(), viewport, FreshOnBack(), Header(), NavLinks()

### Community 7 - "actions/admin.ts"
Cohesion: 0.13
Nodes (38): OK_MESSAGES, OkKey, requestAccountDeletion(), updateProfile(), addClubDocument(), addClubMember(), checkPawapay(), closeCampaign() (+30 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

### Community 10 - "public.profiles"
Cohesion: 0.08
Nodes (28): club_members_user_idx, public.admin_set_role(), public.club_members, public.current_app_role(), public.declare_identity(), public.is_club_member(), public.profiles, public.register_club() (+20 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "admin/campagnes/[id]/page.tsx"
Cohesion: 0.13
Nodes (30): AdminCampaignPage(), Detail, metadata, AdminCampaignsPage(), PriceReferencesPage(), CampaignDocuments(), CampaignPhotos(), FeesNotice() (+22 more)

### Community 14 - "public.campaigns"
Cohesion: 0.11
Nodes (27): public.campaign_public_contributions(), public.campaigns, public.close_campaign(), public.complete_milestone(), public.contributions, public.platform_stats(), public.post_campaign_update(), public.review_campaign() (+19 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.21
Nodes (11): metadata, ReferenceFields(), BLOCK_RATIO, LEVEL_LABELS, LEVEL_TONES, LineLevel, normalizeText(), RefLike (+3 more)

### Community 17 - "ClubDossier.tsx"
Cohesion: 0.10
Nodes (32): CheckItem(), ClubDossier(), ClubRow, DECIDED, Doc, DossierRow, Field(), fullName() (+24 more)

### Community 18 - "lib/auth.ts"
Cohesion: 0.19
Nodes (11): ForbiddenPage(), metadata, Footer(), Viewer, CLUB_SPACE_LABEL, FooterColumn, Navigation, navigationFor() (+3 more)

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
Nodes (27): audit_log_created_idx, audit_log_entity_idx, budget_lines_campaign_idx, campaigns_club_idx, campaigns_status_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx (+19 more)

### Community 25 - "public.clubs"
Cohesion: 0.15
Nodes (18): public.admin_add_club_member(), public.clubs, public.save_campaign_draft(), public.submit_campaign(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents (+10 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.11
Nodes (10): milestones_campaign_idx, public.campaign_milestones, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.compute_campaign_compliance(), public.price_references (+2 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.07
Nodes (24): campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify, contributions_referred_idx, notifications_unread_idx, notifications_user_idx, profiles_1_referral (+16 more)

### Community 28 - "compte/page.tsx"
Cohesion: 0.12
Nodes (21): metadata, Row, STATUSES, TONE, metadata, metadata, STATUS_TONE, CONTRIBUTION_STATUS_LABELS (+13 more)

### Community 31 - "club.ts"
Cohesion: 0.14
Nodes (28): findConflict(), CAMPAIGN_FIELDS, CampaignRef, deleteCampaignDocument(), deleteCampaignPhoto(), deleteClubDocument(), DOSSIER_FIELDS, EDITABLE_CAMPAIGN (+20 more)

### Community 32 - "service.ts"
Cohesion: 0.20
Nodes (19): POST(), POST(), refreshTransaction(), round2(), activeGateway(), gatewayFor(), PaymentMode, paymentMode() (+11 more)

### Community 33 - "requirePermission"
Cohesion: 0.23
Nodes (12): AdminCommentsPage(), metadata, Row, TABS, AdminUpdatesPage(), Audience(), metadata, Row (+4 more)

### Community 34 - "club/page.tsx"
Cohesion: 0.17
Nodes (22): AdminTransactionsPage(), AdminUsersPage(), Check(), ClubPage(), DocumentList(), dossierValues(), KIND_LABEL, metadata (+14 more)

### Community 35 - "public.compute_campaign_compliance"
Cohesion: 0.18
Nodes (4): campaign_photos_campaign_idx, campaign_photos_sha_idx, public.campaign_photos, public.compute_campaign_compliance()

### Community 36 - "contribute.ts"
Cohesion: 0.19
Nodes (16): @supabase/supabase-js, [email, role = "admin"], ROLES, supabase, register(), checkDossier(), saveClubDossier(), contribute() (+8 more)

### Community 40 - "admin/page.tsx"
Cohesion: 0.22
Nodes (11): AdminDashboard(), loadDashboard(), metadata, PlanRow(), addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod (+3 more)

### Community 41 - "CampaignEditor.tsx"
Cohesion: 0.23
Nodes (11): addDays(), CampaignEditor(), EditorValues, Line, parse(), Step, parseJsonList(), saveCampaign() (+3 more)

### Community 42 - "lib/types.ts"
Cohesion: 0.17
Nodes (11): AuditEntry, CampaignDocumentKind, CommentRow, ComplianceLevel, NewsAudience, Notification, PlatformSettings, Profile (+3 more)

### Community 45 - "public.clubs"
Cohesion: 0.11
Nodes (19): public.campaign_updates, updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, campaign_updates_notify, campaign_updates_notify_insert, public.admin_set_role(), public.campaign_update_link() (+11 more)

### Community 50 - "email-check.ts"
Cohesion: 0.50
Nodes (3): dnsWorks(), emailDomainExists(), NOT_FOUND

### Community 51 - "admin/layout.tsx"
Cohesion: 0.70
Nodes (3): AdminNav(), AdminLayout(), OkNotice()

## Knowledge Gaps
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `lib/types.ts` to `service.ts`, `requirePermission`, `club/page.tsx`, `app/layout.tsx`, `actions/auth.ts`, `SubmitButton`, `app/layout.tsx`, `actions/admin.ts`, `admin/page.tsx`, `package.json`, `contribute.ts`, `admin/campagnes/[id]/page.tsx`, `prix/page.tsx`, `ClubDossier.tsx`, `lib/auth.ts`, `admin/layout.tsx`, `compte/page.tsx`, `club.ts`?**
  _High betweenness centrality (0.068) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `lib/types.ts` to `requirePermission`, `club/page.tsx`, `actions/auth.ts`, `contribute.ts`, `actions/admin.ts`, `admin/page.tsx`, `CampaignEditor.tsx`, `admin/campagnes/[id]/page.tsx`, `prix/page.tsx`, `ClubDossier.tsx`, `compte/page.tsx`, `club.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054090450005611045 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09716599190283401 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11960132890365449 - nodes in this community are weakly interconnected._
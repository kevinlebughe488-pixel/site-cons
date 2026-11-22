# Graph Report - site-cons  (2026-11-22)

## Corpus Check
- 150 files · ~105,988 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1086 nodes · 3437 edges · 49 communities (38 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
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
- next
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- lib/types.ts
- public.campaigns
- environment
- prix/page.tsx
- club/campagnes/[id]/page.tsx
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
- club.ts
- contributions/[id]/page.tsx
- CampaignDocuments.tsx
- rbac.ts
- public.compute_campaign_compliance
- @supabase/supabase-js
- admin/page.tsx
- club/page.tsx
- CLAUDE.md
- .claude/CLAUDE.md
- public.clubs

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 96 edges
2. `next` - 77 edges
3. `SubmitButton()` - 57 edges
4. `formatMoney()` - 56 edges
5. `getViewer` - 55 edges
6. `formatDate()` - 52 edges
7. `public.campaigns` - 52 edges
8. `text()` - 50 edges
9. `public.clubs` - 48 edges
10. `createAdminClient()` - 45 edges

## Surprising Connections (you probably didn't know these)
- `DocumentUpload()` --indirect_call--> `uploadClubDocument()`  [INFERRED]
  src/app/club/DocumentUpload.tsx → src/lib/actions/club.ts
- `CampaignEditor()` --indirect_call--> `saveCampaign()`  [INFERRED]
  src/app/club/campagnes/CampaignEditor.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `CampaignPhotos()` --indirect_call--> `uploadCampaignPhoto()`  [INFERRED]
  src/app/club/campagnes/CampaignPhotos.tsx → src/lib/actions/club.ts
- `CommentForm()` --indirect_call--> `postComment()`  [INFERRED]
  src/app/campagnes/[slug]/CommentForm.tsx → src/lib/actions/community.ts

## Import Cycles
- None detected.

## Communities (49 total, 11 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.07
Nodes (75): metadata, NewsPage(), NewsRow, metadata, TABS, CampaignsPage(), metadata, STATUS_FILTERS (+67 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.13
Nodes (21): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+13 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.06
Nodes (44): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), GET(), POST(), POST() (+36 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.06
Nodes (68): react, GET(), ChangePasswordForm(), ChangePasswordPage(), metadata, LoginForm(), LoginHelp(), LoginPage() (+60 more)

### Community 5 - "SubmitButton"
Cohesion: 0.14
Nodes (37): AdminCampaignPage(), AdminCampaignsPage(), AdminClubsPage(), AdminCommentsPage(), metadata, Row, TABS, AuditLogPage() (+29 more)

### Community 6 - "app/layout.tsx"
Cohesion: 0.12
Nodes (19): ForbiddenPage(), metadata, body, display, metadata, RootLayout(), viewport, Footer() (+11 more)

### Community 7 - "next"
Cohesion: 0.19
Nodes (8): nextConfig, next, server-only, @supabase/supabase-js, metadata, metadata, CLUB_PRIORITY, env

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

### Community 10 - "public.profiles"
Cohesion: 0.08
Nodes (27): club_members_user_idx, public.admin_set_role(), public.club_members, public.current_app_role(), public.declare_identity(), public.is_club_member(), public.profiles, public.register_club() (+19 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "lib/types.ts"
Cohesion: 0.10
Nodes (24): Detail, metadata, ClubRow, KIND_LABEL, metadata, PROOF, TABS, CLUB_STATUS_LABELS (+16 more)

### Community 14 - "public.campaigns"
Cohesion: 0.13
Nodes (18): public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), platform_settings_touch, public.admin_update_settings(), public.plan_indicators(), public.platform_settings (+10 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.16
Nodes (16): metadata, ReferenceFields(), ComplianceReportView(), ICONS, SUMMARY, BLOCK_RATIO, ComplianceReport, formatRatio() (+8 more)

### Community 17 - "club/campagnes/[id]/page.tsx"
Cohesion: 0.16
Nodes (21): addDays(), CampaignEditor(), EditorValues, Line, parse(), Step, FeesNotice(), Detail (+13 more)

### Community 18 - "ClubWizard.tsx"
Cohesion: 0.13
Nodes (23): CheckRow(), ClubWizard(), leaveInfoStep(), onStepper(), validUpTo(), KIND_LABEL, PROOF_KINDS, Props (+15 more)

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

### Community 28 - "compte/page.tsx"
Cohesion: 0.16
Nodes (14): metadata, Row, STATUSES, TONE, metadata, STATUS_TONE, requestAccountDeletion(), CLUB_STATUS_TONE (+6 more)

### Community 31 - "club.ts"
Cohesion: 0.07
Nodes (84): GET(), POST(), ContributeForm(), onPhoneChange(), PRESETS, Props, GET(), GET() (+76 more)

### Community 32 - "contributions/[id]/page.tsx"
Cohesion: 0.23
Nodes (10): GET(), ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), noop(), ShareButtons(), providerLabel() (+2 more)

### Community 33 - "CampaignDocuments.tsx"
Cohesion: 0.32
Nodes (11): CampaignDocuments(), KIND_LABELS, accepted(), FileField(), onDrop(), prepare(), FolderIcon(), LogoUpload() (+3 more)

### Community 34 - "rbac.ts"
Cohesion: 0.20
Nodes (10): metadata, CLUB_MANAGER, COMPLIANCE, MATRIX, Permission, Role, ROLE_LABELS, ROLES (+2 more)

### Community 35 - "public.compute_campaign_compliance"
Cohesion: 0.15
Nodes (6): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_photos_campaign_idx, campaign_photos_sha_idx, public.campaign_photos, public.compute_campaign_compliance()

### Community 36 - "@supabase/supabase-js"
Cohesion: 0.50
Nodes (3): [email, role = "admin"], ROLES, supabase

### Community 40 - "admin/page.tsx"
Cohesion: 0.24
Nodes (9): loadDashboard(), metadata, PlanRow(), addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod, PlanYear (+1 more)

### Community 41 - "club/page.tsx"
Cohesion: 0.24
Nodes (10): Check(), ClubPage(), dossierValues(), KIND_LABEL, metadata, NEXT_STEP, OK_MESSAGES, PayoutSummary() (+2 more)

### Community 45 - "public.clubs"
Cohesion: 0.11
Nodes (23): public.admin_add_club_member(), public.campaign_updates, public.clubs, public.save_campaign_draft(), public.submit_campaign(), updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify (+15 more)

## Knowledge Gaps
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `contributions/[id]/page.tsx`, `lib/types.ts`, `rbac.ts`, `pawapay.ts`, `actions/auth.ts`, `SubmitButton`, `app/layout.tsx`, `app/layout.tsx`, `admin/page.tsx`, `package.json`, `club/page.tsx`, `lib/types.ts`, `prix/page.tsx`, `club/campagnes/[id]/page.tsx`, `compte/page.tsx`, `club.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `club.ts` to `contributions/[id]/page.tsx`, `lib/types.ts`, `rbac.ts`, `pawapay.ts`, `actions/auth.ts`, `SubmitButton`, `next`, `admin/page.tsx`, `club/page.tsx`, `lib/types.ts`, `prix/page.tsx`, `club/campagnes/[id]/page.tsx`, `ClubWizard.tsx`, `compte/page.tsx`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07071189679885333 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.060764587525150904 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06192259675405743 - nodes in this community are weakly interconnected._
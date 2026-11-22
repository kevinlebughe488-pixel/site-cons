# Graph Report - agent-a45a0fe44cf876cb8  (2026-11-22)

## Corpus Check
- 149 files · ~104,361 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 3, .example 2, .conf 1)

## Summary
- 1058 nodes · 3431 edges · 42 communities (35 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
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
- SubmitButton
- formatDate
- lib/types.ts
- createClient
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- compte/page.tsx
- public.campaigns
- environment
- prix/page.tsx
- admin/campagnes/[id]/page.tsx
- contribuer/page.tsx
- storage
- services
- db
- environment
- environment
- 20261026000100_schema.sql
- public.clubs
- 20261120000100_controle_conformite.sql
- 20261101000400_communication.sql
- CampaignDocuments.tsx
- club.ts
- contributions/[id]/page.tsx
- admin/page.tsx
- CampaignPhotos.tsx
- ManageCampaignPage
- CLAUDE.md
- .claude/CLAUDE.md
- public.clubs

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 96 edges
2. `next` - 77 edges
3. `SubmitButton()` - 60 edges
4. `formatMoney()` - 56 edges
5. `getViewer` - 55 edges
6. `public.campaigns` - 55 edges
7. `public.profiles` - 50 edges
8. `formatDate()` - 49 edges
9. `text()` - 49 edges
10. `public.clubs` - 49 edges

## Surprising Connections (you probably didn't know these)
- `CommentForm()` --indirect_call--> `postComment()`  [INFERRED]
  src/app/campagnes/[slug]/CommentForm.tsx → src/lib/actions/community.ts
- `ClubDossierForm()` --indirect_call--> `saveClubDossier()`  [INFERRED]
  src/app/club/ClubDossierForm.tsx → src/lib/actions/club.ts
- `DocumentUpload()` --indirect_call--> `uploadClubDocument()`  [INFERRED]
  src/app/club/DocumentUpload.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `CampaignEditor()` --indirect_call--> `saveCampaign()`  [INFERRED]
  src/app/club/campagnes/CampaignEditor.tsx → src/lib/actions/club.ts

## Import Cycles
- None detected.

## Communities (42 total, 7 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "lib/types.ts"
Cohesion: 0.07
Nodes (77): @supabase/supabase-js, [email, role = "admin"], ROLES, supabase, metadata, NewsPage(), NewsRow, metadata (+69 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.07
Nodes (38): ForbiddenPage(), metadata, metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), body (+30 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.10
Nodes (21): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+13 more)

### Community 4 - "SubmitButton"
Cohesion: 0.06
Nodes (77): react, server-only, GET(), CommentForm(), CommentItem(), Comments(), Props, ClubDossierForm() (+69 more)

### Community 5 - "formatDate"
Cohesion: 0.20
Nodes (25): AdminCampaignsPage(), AdminClubsPage(), AdminCommentsPage(), metadata, Row, TABS, AdminUpdatesPage(), Audience() (+17 more)

### Community 6 - "lib/types.ts"
Cohesion: 0.07
Nodes (36): ClubRow, KIND_LABEL, metadata, PROOF, TABS, DossierValues, EMPTY_DOSSIER, DocumentUpload() (+28 more)

### Community 7 - "createClient"
Cohesion: 0.15
Nodes (18): nextConfig, next, AuditLogPage(), metadata, GET(), POST(), GET(), GET() (+10 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.6, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

### Community 10 - "public.profiles"
Cohesion: 0.09
Nodes (31): club_members_user_idx, public.admin_add_club_member(), public.admin_set_role(), public.club_members, public.current_app_role(), public.declare_identity(), public.is_club_member(), public.profiles (+23 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "compte/page.tsx"
Cohesion: 0.12
Nodes (21): metadata, Row, STATUSES, TONE, metadata, metadata, STATUS_TONE, CONTRIBUTION_STATUS_LABELS (+13 more)

### Community 14 - "public.campaigns"
Cohesion: 0.13
Nodes (25): milestones_campaign_idx, public.campaign_milestones, public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), public.save_campaign_draft(), public.set_campaign_suspension() (+17 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.17
Nodes (18): metadata, ReferenceFields(), addDays(), CampaignEditor(), EditorValues, Line, parse(), Step (+10 more)

### Community 17 - "admin/campagnes/[id]/page.tsx"
Cohesion: 0.14
Nodes (19): AdminCampaignPage(), Detail, metadata, Detail, metadata, ComplianceReportView(), ICONS, SUMMARY (+11 more)

### Community 18 - "contribuer/page.tsx"
Cohesion: 0.24
Nodes (9): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), ContributePage(), metadata, PaymentMode (+1 more)

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
Nodes (33): audit_log_created_idx, audit_log_entity_idx, campaigns_club_idx, campaigns_status_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_refresh_totals (+25 more)

### Community 25 - "public.clubs"
Cohesion: 0.29
Nodes (10): club_documents_club_idx, club_private_touch, public.club_documents, public.club_private, public.normalize_payout(), public.save_club_private(), public.submit_club_registration(), public.update_club_registration() (+2 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.12
Nodes (13): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.compute_campaign_compliance(), public.price_references (+5 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.09
Nodes (24): campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify, contributions_referred_idx, notifications_unread_idx, notifications_user_idx, profiles_1_referral (+16 more)

### Community 28 - "CampaignDocuments.tsx"
Cohesion: 0.38
Nodes (10): CampaignDocuments(), KIND_LABELS, accepted(), FileField(), onDrop(), prepare(), FolderIcon(), formatBytes() (+2 more)

### Community 31 - "club.ts"
Cohesion: 0.06
Nodes (90): GET(), POST(), POST(), ContributeForm(), onPhoneChange(), PRESETS, Props, requestAccountDeletion() (+82 more)

### Community 32 - "contributions/[id]/page.tsx"
Cohesion: 0.19
Nodes (11): GET(), PayoutSummary(), ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), ICONS, noop() (+3 more)

### Community 33 - "admin/page.tsx"
Cohesion: 0.27
Nodes (9): AdminDashboard(), loadDashboard(), metadata, PlanRow(), addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod (+1 more)

### Community 34 - "CampaignPhotos.tsx"
Cohesion: 0.36
Nodes (9): CampaignPhotos(), deleteCampaignDocument(), deleteCampaignPhoto(), editableCampaign(), photoWithRights(), refreshCampaign(), setCampaignCover(), uploadCampaignDocument() (+1 more)

### Community 35 - "ManageCampaignPage"
Cohesion: 0.39
Nodes (7): FeesNotice(), ManageCampaignPage(), metadata, NewCampaignPage(), listPriceReferences(), todayInKinshasa(), CAMPAIGN_LIMITS

### Community 45 - "public.clubs"
Cohesion: 0.10
Nodes (27): public.campaign_updates, public.clubs, public.handle_new_user(), public.review_campaign_update(), updates_campaign_idx, public.handle_new_user(), campaign_updates_fill_club, campaign_updates_notify (+19 more)

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `contributions/[id]/page.tsx`, `lib/types.ts`, `app/layout.tsx`, `admin/page.tsx`, `SubmitButton`, `formatDate`, `lib/types.ts`, `ManageCampaignPage`, `package.json`, `compte/page.tsx`, `prix/page.tsx`, `admin/campagnes/[id]/page.tsx`, `contribuer/page.tsx`, `club.ts`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `contributions/[id]/page.tsx`, `lib/types.ts`, `admin/page.tsx`, `ManageCampaignPage`, `SubmitButton`, `formatDate`, `lib/types.ts`, `compte/page.tsx`, `prix/page.tsx`, `admin/campagnes/[id]/page.tsx`, `contribuer/page.tsx`, `club.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `lib/types.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06995614035087719 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `lib/types.ts` to `Tribune Supporters`, `SubmitButton`, `createClient`, `seed-demo.mjs`, `package.json`, `club.ts`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06734006734006734 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09634146341463415 - nodes in this community are weakly interconnected._
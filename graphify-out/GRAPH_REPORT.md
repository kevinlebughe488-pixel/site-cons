# Graph Report - site-cons  (2026-11-20)

## Corpus Check
- 145 files · ~102,950 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1049 nodes · 3328 edges · 46 communities (39 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a6f78c02`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- formatMoney
- app/layout.tsx
- pawapay.ts
- actions/auth.ts
- SubmitButton
- lib/types.ts
- next
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- compte/page.tsx
- public.campaigns
- environment
- prix/page.tsx
- getViewer
- createClient
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
- contribuer/page.tsx
- contributions/[id]/page.tsx
- can
- public.compute_campaign_compliance
- inscription/page.tsx
- notifications/page.tsx
- plan.ts
- CLAUDE.md
- .claude/CLAUDE.md
- mise-a-jour-production.sql
- admin/campagnes/[id]/page.tsx

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 95 edges
2. `next` - 75 edges
3. `SubmitButton()` - 60 edges
4. `formatMoney()` - 56 edges
5. `getViewer` - 55 edges
6. `public.campaigns` - 52 edges
7. `formatDate()` - 49 edges
8. `text()` - 48 edges
9. `createAdminClient()` - 45 edges
10. `public.clubs` - 44 edges

## Surprising Connections (you probably didn't know these)
- `CampaignEditor()` --indirect_call--> `saveCampaign()`  [INFERRED]
  src/app/club/campagnes/CampaignEditor.tsx → src/lib/actions/club.ts
- `CommentForm()` --indirect_call--> `postComment()`  [INFERRED]
  src/app/campagnes/[slug]/CommentForm.tsx → src/lib/actions/community.ts
- `ClubDossierForm()` --indirect_call--> `saveClubDossier()`  [INFERRED]
  src/app/club/ClubDossierForm.tsx → src/lib/actions/club.ts
- `CampaignDocuments()` --indirect_call--> `uploadCampaignDocument()`  [INFERRED]
  src/app/club/campagnes/CampaignDocuments.tsx → src/lib/actions/club.ts
- `DocumentUpload()` --indirect_call--> `uploadClubDocument()`  [INFERRED]
  src/app/club/DocumentUpload.tsx → src/lib/actions/club.ts

## Import Cycles
- None detected.

## Communities (46 total, 7 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "formatMoney"
Cohesion: 0.11
Nodes (49): CampaignsPage(), metadata, STATUS_FILTERS, CommentForm(), CommentItem(), Comments(), Props, ContributePage() (+41 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.14
Nodes (20): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), CookieBanner(), decide(), noop() (+12 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.10
Nodes (20): BASE_URLS, formatAmount(), PawapayConfig, PawapayFailure, PawapayGateway, PawapayInitiation, PawapaySearch, toInitiation() (+12 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.05
Nodes (69): react, server-only, @supabase/supabase-js, [email, role = "admin"], ROLES, supabase, ClubDossierForm(), Props (+61 more)

### Community 5 - "SubmitButton"
Cohesion: 0.18
Nodes (26): AdminCampaignPage(), AdminClubsPage(), AdminCommentsPage(), metadata, Row, TABS, AdminUpdatesPage(), metadata (+18 more)

### Community 6 - "lib/types.ts"
Cohesion: 0.09
Nodes (35): AdminCampaignsPage(), metadata, TABS, ClubRow, KIND_LABEL, metadata, PROOF, TABS (+27 more)

### Community 7 - "next"
Cohesion: 0.12
Nodes (16): nextConfig, next, ForbiddenPage(), metadata, Footer(), Header(), NavLinks(), signOut() (+8 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

### Community 10 - "public.profiles"
Cohesion: 0.09
Nodes (25): club_members_user_idx, public.admin_set_role(), public.club_members, public.current_app_role(), public.declare_identity(), public.is_club_member(), public.profiles, public.register_club() (+17 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "compte/page.tsx"
Cohesion: 0.14
Nodes (15): metadata, Row, STATUSES, TONE, metadata, metadata, STATUS_TONE, CONTRIBUTION_STATUS_LABELS (+7 more)

### Community 14 - "public.campaigns"
Cohesion: 0.09
Nodes (24): campaigns_club_idx, campaigns_status_idx, public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), platform_settings_touch (+16 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.11
Nodes (26): metadata, PriceReferencesPage(), ReferenceFields(), addDays(), CampaignEditor(), EditorValues, Line, parse() (+18 more)

### Community 17 - "getViewer"
Cohesion: 0.29
Nodes (13): metadata, ResetPasswordPage(), submitClubDossier(), updateClubInfo(), campaignPath(), deleteComment(), followClub(), markAllNotificationsRead() (+5 more)

### Community 18 - "createClient"
Cohesion: 0.18
Nodes (14): metadata, NewsPage(), NewsRow, GET(), GET(), GET(), GET(), LoginPage() (+6 more)

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
Nodes (30): audit_log_created_idx, audit_log_entity_idx, campaigns_touch, clubs_touch, contributions_campaign_status_idx, contributions_refresh_totals, contributions_status_created_idx, contributions_touch (+22 more)

### Community 25 - "public.clubs"
Cohesion: 0.16
Nodes (17): public.admin_add_club_member(), public.clubs, public.save_campaign_draft(), public.submit_campaign(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents (+9 more)

### Community 26 - "20261120000100_controle_conformite.sql"
Cohesion: 0.11
Nodes (10): milestones_campaign_idx, public.campaign_milestones, campaign_documents_campaign_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.compute_campaign_compliance(), public.price_references (+2 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.08
Nodes (25): public.campaign_updates, updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify (+17 more)

### Community 28 - "CampaignDocuments.tsx"
Cohesion: 0.38
Nodes (10): CampaignDocuments(), KIND_LABELS, accepted(), FileField(), onDrop(), prepare(), FolderIcon(), formatBytes() (+2 more)

### Community 31 - "club.ts"
Cohesion: 0.06
Nodes (92): POST(), POST(), ContributeForm(), onPhoneChange(), PRESETS, Props, requestAccountDeletion(), addClubMember() (+84 more)

### Community 32 - "contribuer/page.tsx"
Cohesion: 0.26
Nodes (8): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), metadata, PaymentMode, paymentMode()

### Community 33 - "contributions/[id]/page.tsx"
Cohesion: 0.26
Nodes (8): PayoutSummary(), ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), noop(), ShareButtons(), providerLabel()

### Community 34 - "can"
Cohesion: 0.12
Nodes (17): GET(), DirectoryClub, metadata, PREPARE, STEPS, clubSteps(), HowItWorksPage(), metadata (+9 more)

### Community 35 - "public.compute_campaign_compliance"
Cohesion: 0.17
Nodes (7): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_photos_campaign_idx, campaign_photos_sha_idx, public.campaign_photos, public.compute_campaign_compliance(), public.compute_campaign_compliance()

### Community 36 - "inscription/page.tsx"
Cohesion: 0.43
Nodes (6): AccountChoice(), ClubIcon(), Kind, metadata, RegisterPage(), SupporterIcon()

### Community 40 - "notifications/page.tsx"
Cohesion: 0.31
Nodes (7): ChangePasswordPage(), metadata, icon(), metadata, NotificationsPage(), requireViewer(), Notification

### Community 41 - "plan.ts"
Cohesion: 0.40
Nodes (5): addYears(), currentPlanPeriod(), PLAN_YEARS, PlanPeriod, PlanYear

### Community 45 - "mise-a-jour-production.sql"
Cohesion: 0.19
Nodes (9): campaign_documents_campaign_idx, campaign_photos_campaign_idx, campaign_photos_sha_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.campaign_photos, public.price_references (+1 more)

### Community 49 - "admin/campagnes/[id]/page.tsx"
Cohesion: 0.12
Nodes (28): Detail, metadata, AuditLogPage(), metadata, AdminDashboard(), loadDashboard(), metadata, PlanRow() (+20 more)

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `contribuer/page.tsx`, `formatMoney`, `can`, `app/layout.tsx`, `actions/auth.ts`, `SubmitButton`, `lib/types.ts`, `contributions/[id]/page.tsx`, `notifications/page.tsx`, `package.json`, `inscription/page.tsx`, `compte/page.tsx`, `prix/page.tsx`, `admin/campagnes/[id]/page.tsx`, `createClient`, `getViewer`, `club.ts`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `contribuer/page.tsx`, `formatMoney`, `can`, `contributions/[id]/page.tsx`, `inscription/page.tsx`, `SubmitButton`, `lib/types.ts`, `actions/auth.ts`, `notifications/page.tsx`, `next`, `compte/page.tsx`, `prix/page.tsx`, `admin/campagnes/[id]/page.tsx`, `getViewer`, `club.ts`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Should `formatMoney` be split into smaller, more focused modules?**
  _Cohesion score 0.10847457627118644 - nodes in this community are weakly interconnected._
- **Why does `public.profiles` connect `public.profiles` to `public.compute_campaign_compliance`, `mise-a-jour-production.sql`, `public.campaigns`, `20261026000100_schema.sql`, `public.clubs`, `20261120000100_controle_conformite.sql`, `20261101000400_communication.sql`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14039408866995073 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09716599190283401 - nodes in this community are weakly interconnected._
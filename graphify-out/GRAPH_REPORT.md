# Graph Report - site-cons  (2026-11-19)

## Corpus Check
- 135 files · ~93,314 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 984 nodes · 3076 edges · 45 communities (38 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9efe8249`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- createClient
- formatMoney
- next
- pawapay.ts
- actions/auth.ts
- can
- club/page.tsx
- contributions/[id]/page.tsx
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- formatDate
- public.campaigns
- environment
- Tribune Supporters
- next
- forms.tsx
- storage
- services
- db
- environment
- environment
- 20261026000100_schema.sql
- public.clubs
- mise-a-jour-production.sql
- 20261101000400_communication.sql
- createClient
- club.ts
- public.contributions
- navigation.ts
- clubs/[slug]/page.tsx
- public.campaign_updates
- SubmitButton
- DocumentUpload.tsx
- inscription/page.tsx
- promote.mjs
- CLAUDE.md
- .claude/CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 90 edges
2. `next` - 71 edges
3. `SubmitButton()` - 56 edges
4. `public.campaigns` - 56 edges
5. `public.clubs` - 54 edges
6. `getViewer` - 53 edges
7. `formatMoney()` - 50 edges
8. `public.profiles` - 46 edges
9. `text()` - 43 edges
10. `can()` - 42 edges

## Surprising Connections (you probably didn't know these)
- `ChangePasswordForm()` --indirect_call--> `changePassword()`  [INFERRED]
  src/app/compte/mot-de-passe/ChangePasswordForm.tsx → src/lib/actions/auth.ts
- `ResetPasswordForm()` --indirect_call--> `resetPassword()`  [INFERRED]
  src/app/mot-de-passe-oublie/nouveau/ResetPasswordForm.tsx → src/lib/actions/auth.ts
- `RegisterForm()` --indirect_call--> `register()`  [INFERRED]
  src/app/inscription/RegisterForm.tsx → src/lib/actions/auth.ts
- `LoginForm()` --indirect_call--> `signIn()`  [INFERRED]
  src/app/connexion/LoginForm.tsx → src/lib/actions/auth.ts
- `CodeForm()` --indirect_call--> `verifyCode()`  [INFERRED]
  src/app/verification/CodeForm.tsx → src/lib/actions/auth.ts

## Import Cycles
- None detected.

## Communities (45 total, 7 thin omitted)

### Community 0 - "createClient"
Cohesion: 0.09
Nodes (58): GET(), POST(), POST(), ContributeForm(), onPhoneChange(), PRESETS, Props, addClubMember() (+50 more)

### Community 1 - "formatMoney"
Cohesion: 0.06
Nodes (86): @supabase/supabase-js, AdminCampaignPage(), Detail, metadata, AdminCampaignsPage(), metadata, TABS, AdminDashboard() (+78 more)

### Community 2 - "next"
Cohesion: 0.10
Nodes (24): metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), body, display, metadata (+16 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.07
Nodes (31): AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), ContributePage(), metadata, DemoBanner() (+23 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.10
Nodes (37): server-only, metadata, ResetPasswordPage(), INTROS, metadata, TITLES, VerificationPage(), cancelVerification() (+29 more)

### Community 5 - "can"
Cohesion: 0.13
Nodes (17): clubSteps(), HowItWorksPage(), metadata, SUPPORTER_STEPS, icon(), metadata, NotificationsPage(), can() (+9 more)

### Community 6 - "club/page.tsx"
Cohesion: 0.10
Nodes (26): ClubRow, KIND_LABEL, metadata, PROOF, TABS, DossierValues, EMPTY_DOSSIER, Props (+18 more)

### Community 7 - "contributions/[id]/page.tsx"
Cohesion: 0.23
Nodes (10): PayoutSummary(), ContributionPage(), FAILURE_HINTS, metadata, StatusPoller(), noop(), ShareButtons(), CONTRIBUTION_STATUS_LABELS (+2 more)

### Community 8 - "seed-demo.mjs"
Cohesion: 0.13
Nodes (17): anon, b64(), service, sign(), CLUBS, createUser(), dateIn(), daysAgo() (+9 more)

### Community 9 - "package.json"
Cohesion: 0.07
Nodes (36): config, dependencies, next@16.4.3, react@19.3.1, react-dom@19.3.1, server-only@0.0.1, @supabase/ssr@0.12.7, @supabase/supabase-js@2.118.0 (+28 more)

### Community 10 - "public.profiles"
Cohesion: 0.08
Nodes (31): club_members_user_idx, public.admin_set_role(), public.campaign_public_contributions(), public.club_members, public.complete_milestone(), public.current_app_role(), public.declare_identity(), public.is_club_member() (+23 more)

### Community 11 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 12 - "environment"
Cohesion: 0.11
Nodes (18): environment, API_EXTERNAL_URL, GOTRUE_API_HOST, GOTRUE_API_PORT, GOTRUE_DB_DATABASE_URL, GOTRUE_DB_DRIVER, GOTRUE_DISABLE_SIGNUP, GOTRUE_EXTERNAL_EMAIL_ENABLED (+10 more)

### Community 13 - "formatDate"
Cohesion: 0.13
Nodes (28): AdminClubsPage(), AdminCommentsPage(), metadata, Row, TABS, AuditLogPage(), metadata, AdminUpdatesPage() (+20 more)

### Community 14 - "public.campaigns"
Cohesion: 0.10
Nodes (25): campaigns_club_idx, campaigns_status_idx, public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), public.save_campaign_draft(), public.set_campaign_suspension() (+17 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "Tribune Supporters"
Cohesion: 0.07
Nodes (21): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion en deux étapes (codes SMS), Déploiement sur Vercel, Développement local sans projet Supabase (+13 more)

### Community 17 - "next"
Cohesion: 0.22
Nodes (8): nextConfig, next, GET(), LoginPage(), metadata, GET(), CLUB_PRIORITY, safeReturnPath()

### Community 18 - "forms.tsx"
Cohesion: 0.19
Nodes (16): react, ChangePasswordForm(), ChangePasswordPage(), metadata, LoginForm(), Props, RegisterForm(), ResetPasswordForm() (+8 more)

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
Nodes (21): audit_log_created_idx, audit_log_entity_idx, budget_lines_campaign_idx, campaigns_touch, clubs_touch, contributions_touch, milestones_campaign_idx, on_auth_user_created (+13 more)

### Community 25 - "public.clubs"
Cohesion: 0.10
Nodes (25): public.admin_add_club_member(), public.clubs, public.submit_campaign(), club_documents_club_idx, club_private_touch, public.admin_set_club_payout(), public.club_documents, public.club_private (+17 more)

### Community 26 - "mise-a-jour-production.sql"
Cohesion: 0.09
Nodes (20): campaigns_goal_notify, campaigns_goal_reached, club_documents_club_idx, club_private_touch, notifications_unread_idx, notifications_user_idx, profiles_1_referral, public.campaign_comments (+12 more)

### Community 27 - "20261101000400_communication.sql"
Cohesion: 0.09
Nodes (22): campaigns_goal_notify, campaigns_goal_reached, campaigns_status_notify, clubs_status_notify, contributions_referred_idx, notifications_unread_idx, notifications_user_idx, profiles_1_referral (+14 more)

### Community 28 - "createClient"
Cohesion: 0.26
Nodes (18): GET(), GET(), metadata, STATUS_TONE, requestAccountDeletion(), updateProfile(), submitClubDossier(), updateClubInfo() (+10 more)

### Community 31 - "club.ts"
Cohesion: 0.18
Nodes (19): ClubsPage(), CAMPAIGN_FIELDS, deleteClubDocument(), DOSSIER_FIELDS, EDITABLE_DOSSIER, lineSchema, milestoneSchema, saveClubDossier() (+11 more)

### Community 32 - "public.contributions"
Cohesion: 0.14
Nodes (16): contributions_campaign_status_idx, contributions_refresh_totals, contributions_status_created_idx, contributions_user_idx, public.contributions, public.platform_stats(), public.refresh_campaign_totals(), public.club_ranking() (+8 more)

### Community 33 - "navigation.ts"
Cohesion: 0.15
Nodes (14): ForbiddenPage(), metadata, Footer(), Header(), NavLinks(), signOut(), Viewer, CLUB_SPACE_LABEL (+6 more)

### Community 34 - "clubs/[slug]/page.tsx"
Cohesion: 0.17
Nodes (13): metadata, NewsPage(), NewsRow, DirectoryClub, metadata, PREPARE, STEPS, ClubPublicPage() (+5 more)

### Community 35 - "public.campaign_updates"
Cohesion: 0.25
Nodes (8): public.campaign_updates, updates_campaign_idx, campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update(), campaign_updates_fill_club, campaign_updates_notify, public.review_campaign_update()

### Community 36 - "SubmitButton"
Cohesion: 0.23
Nodes (11): CommentForm(), CommentItem(), Comments(), Props, ClubDossierForm(), ClubPage(), DocumentList(), ForgotPasswordPage() (+3 more)

### Community 40 - "DocumentUpload.tsx"
Cohesion: 0.40
Nodes (7): DocumentUpload(), FileField(), onChange(), formatBytes(), replaceInputFile(), shrinkImage(), ClubDocumentKind

### Community 41 - "inscription/page.tsx"
Cohesion: 0.36
Nodes (7): AccountChoice(), ClubIcon(), Kind, metadata, RegisterPage(), SupporterIcon(), KYC_THRESHOLD

### Community 42 - "promote.mjs"
Cohesion: 0.50
Nodes (3): [email, role = "admin"], ROLES, supabase

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `next` to `createClient`, `formatMoney`, `clubs/[slug]/page.tsx`, `pawapay.ts`, `navigation.ts`, `SubmitButton`, `club/page.tsx`, `can`, `next`, `package.json`, `contributions/[id]/page.tsx`, `inscription/page.tsx`, `actions/auth.ts`, `formatDate`, `forms.tsx`, `createClient`, `club.ts`?**
  _High betweenness centrality (0.083) - this node is a cross-community bridge._
- **Should `createClient` be split into smaller, more focused modules?**
  _Cohesion score 0.08904428904428904 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `createClient`, `formatMoney`, `clubs/[slug]/page.tsx`, `pawapay.ts`, `SubmitButton`, `can`, `club/page.tsx`, `contributions/[id]/page.tsx`, `actions/auth.ts`, `inscription/page.tsx`, `navigation.ts`, `formatDate`, `next`, `club.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Should `formatMoney` be split into smaller, more focused modules?**
  _Cohesion score 0.06391941391941391 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `formatMoney` to `actions/auth.ts`, `seed-demo.mjs`, `package.json`, `promote.mjs`, `Tribune Supporters`, `next`, `forms.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `next` be split into smaller, more focused modules?**
  _Cohesion score 0.10338680926916222 - nodes in this community are weakly interconnected._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06948051948051948 - nodes in this community are weakly interconnected._
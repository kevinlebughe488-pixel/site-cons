# Graph Report - site-cons  (2026-11-20)

## Corpus Check
- 144 files · ~102,617 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: .example 2, (none) 2, .conf 1)

## Summary
- 1047 nodes · 3319 edges · 39 communities (32 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8f78dc08`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Tribune Supporters
- formatMoney
- app/layout.tsx
- pawapay.ts
- actions/auth.ts
- club/page.tsx
- seed-demo.mjs
- package.json
- public.profiles
- compilerOptions
- environment
- app/page.tsx
- public.campaigns
- environment
- prix/page.tsx
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
- club.ts
- can
- public.compute_campaign_compliance
- lib/types.ts
- promote.mjs
- CLAUDE.md
- .claude/CLAUDE.md
- mise-a-jour-production.sql
- formatMoney

## God Nodes (most connected - your core abstractions)
1. `createClient()` - 95 edges
2. `next` - 74 edges
3. `SubmitButton()` - 60 edges
4. `formatMoney()` - 56 edges
5. `getViewer` - 55 edges
6. `public.campaigns` - 52 edges
7. `formatDate()` - 49 edges
8. `text()` - 48 edges
9. `createAdminClient()` - 45 edges
10. `public.clubs` - 44 edges

## Surprising Connections (you probably didn't know these)
- `LoginForm()` --indirect_call--> `signIn()`  [INFERRED]
  src/app/connexion/LoginForm.tsx → src/lib/actions/auth.ts
- `RegisterForm()` --indirect_call--> `register()`  [INFERRED]
  src/app/inscription/RegisterForm.tsx → src/lib/actions/auth.ts
- `ChangePasswordForm()` --indirect_call--> `changePassword()`  [INFERRED]
  src/app/compte/mot-de-passe/ChangePasswordForm.tsx → src/lib/actions/auth.ts
- `ResetPasswordForm()` --indirect_call--> `resetPassword()`  [INFERRED]
  src/app/mot-de-passe-oublie/nouveau/ResetPasswordForm.tsx → src/lib/actions/auth.ts
- `CampaignEditor()` --indirect_call--> `saveCampaign()`  [INFERRED]
  src/app/club/campagnes/CampaignEditor.tsx → src/lib/actions/club.ts

## Import Cycles
- None detected.

## Communities (39 total, 7 thin omitted)

### Community 0 - "Tribune Supporters"
Cohesion: 0.07
Nodes (23): 1. Créer le projet Supabase, 2. Configurer l'application, 3. Créer le premier administrateur, 4. Données de démonstration (facultatif, projet de test uniquement), Communication, Connexion et codes SMS, Contrôle de conformité des campagnes, Déploiement sur Vercel (+15 more)

### Community 1 - "formatMoney"
Cohesion: 0.15
Nodes (33): CampaignsPage(), metadata, STATUS_FILTERS, CampaignPage(), Detail, generateMetadata(), loadCampaign, AmbassadorRank (+25 more)

### Community 2 - "app/layout.tsx"
Cohesion: 0.07
Nodes (37): ForbiddenPage(), metadata, metadata, TermsPage(), COOKIES, metadata, PrivacyPage(), body (+29 more)

### Community 3 - "pawapay.ts"
Cohesion: 0.07
Nodes (29): server-only, AdminNav(), AdminLayout(), OK_MESSAGES, OkKey, OkNotice(), PaymentMode, paymentMode() (+21 more)

### Community 4 - "actions/auth.ts"
Cohesion: 0.09
Nodes (44): metadata, ResetPasswordPage(), INTROS, metadata, TITLES, DemoBanner(), Account, cancelVerification() (+36 more)

### Community 6 - "club/page.tsx"
Cohesion: 0.06
Nodes (76): react, AdminCampaignPage(), Detail, metadata, AdminClubsPage(), ClubRow, KIND_LABEL, metadata (+68 more)

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

### Community 13 - "app/page.tsx"
Cohesion: 0.23
Nodes (11): metadata, TABS, followedClub(), HomePage(), myContributions(), FollowedClub, CAMPAIGN_WITH_CLUB, STATUS_LABELS (+3 more)

### Community 14 - "public.campaigns"
Cohesion: 0.09
Nodes (24): campaigns_club_idx, campaigns_status_idx, public.campaigns, public.close_campaign(), public.post_campaign_update(), public.review_campaign(), public.set_campaign_suspension(), platform_settings_touch (+16 more)

### Community 15 - "environment"
Cohesion: 0.15
Nodes (13): ANON_KEY, AUTH_JWT_SECRET, DATABASE_URL, ENABLE_IMAGE_TRANSFORMATION, FILE_SIZE_LIMIT, FILE_STORAGE_BACKEND_PATH, GLOBAL_S3_BUCKET, POSTGREST_URL (+5 more)

### Community 16 - "prix/page.tsx"
Cohesion: 0.12
Nodes (25): metadata, ReferenceFields(), addDays(), CampaignEditor(), EditorValues, Line, parse(), Step (+17 more)

### Community 18 - "createClient"
Cohesion: 0.05
Nodes (88): nextConfig, next, metadata, NewsPage(), NewsRow, AdminCampaignsPage(), AdminCommentsPage(), metadata (+80 more)

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

### Community 31 - "club.ts"
Cohesion: 0.06
Nodes (86): POST(), POST(), ContributeForm(), onPhoneChange(), PRESETS, Props, addClubMember(), checkPawapay() (+78 more)

### Community 34 - "can"
Cohesion: 0.13
Nodes (22): AdminDashboard(), loadDashboard(), metadata, PlanRow(), ClubsPage(), DirectoryClub, metadata, PREPARE (+14 more)

### Community 35 - "public.compute_campaign_compliance"
Cohesion: 0.17
Nodes (7): budget_lines_campaign_idx, public.campaign_budget_lines, campaign_photos_campaign_idx, campaign_photos_sha_idx, public.campaign_photos, public.compute_campaign_compliance(), public.compute_campaign_compliance()

### Community 40 - "lib/types.ts"
Cohesion: 0.12
Nodes (16): CLUB_MANAGER, COMPLIANCE, MATRIX, Permission, Role, ROLES, SUPPORTER, AuditEntry (+8 more)

### Community 42 - "promote.mjs"
Cohesion: 0.50
Nodes (3): [email, role = "admin"], ROLES, supabase

### Community 45 - "mise-a-jour-production.sql"
Cohesion: 0.19
Nodes (9): campaign_documents_campaign_idx, campaign_photos_campaign_idx, campaign_photos_sha_idx, price_references_label_idx, price_references_touch, public.campaign_documents, public.campaign_photos, public.price_references (+1 more)

### Community 49 - "formatMoney"
Cohesion: 0.24
Nodes (13): @supabase/supabase-js, GET(), money(), Row, SIZE, FeesNotice(), Detail, ManageCampaignPage() (+5 more)

## Knowledge Gaps
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `next` connect `createClient` to `formatMoney`, `app/layout.tsx`, `pawapay.ts`, `can`, `actions/auth.ts`, `club/page.tsx`, `package.json`, `app/page.tsx`, `prix/page.tsx`, `formatMoney`, `club.ts`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `Tribune Supporters` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Why does `createClient()` connect `createClient` to `formatMoney`, `can`, `app/layout.tsx`, `actions/auth.ts`, `club/page.tsx`, `app/page.tsx`, `prix/page.tsx`, `formatMoney`, `club.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06711915535444947 - nodes in this community are weakly interconnected._
- **Why does `@supabase/supabase-js` connect `formatMoney` to `Tribune Supporters`, `can`, `actions/auth.ts`, `club/page.tsx`, `seed-demo.mjs`, `package.json`, `promote.mjs`, `app/page.tsx`, `createClient`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `pawapay.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0746606334841629 - nodes in this community are weakly interconnected._
- **Should `actions/auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08521870286576169 - nodes in this community are weakly interconnected._
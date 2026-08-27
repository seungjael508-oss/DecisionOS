# DecisionOS MVP Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working counselor/project-admin DecisionOS MVP with Supabase Auth, project-isolated PostgreSQL RLS, transactional consultation/grade/assignment workflows, and browser UI.

**Architecture:** Next.js App Router uses Supabase SSR cookie sessions. Server Components perform authenticated reads and thin Server Actions call PostgREST/RPC with the user's token; PostgreSQL RLS and private transaction functions make all final authorization decisions.

**Tech Stack:** Next.js App Router, TypeScript, React, Tailwind CSS, shadcn/ui, Supabase Auth/PostgreSQL/PostgREST, `@supabase/ssr`, Zod, Vitest, Testing Library, Playwright, pgTAP/Supabase database tests.

**Spec:** `docs/superpowers/specs/2026-08-27-decisionos-mvp-phase1-design.md` and `docs/architecture/phase1-schema-and-entities.md`

## Global Constraints

- Read both specs and `/Users/apple/Downloads/DecisionOS_논리스키마_v1.2.md` completely before changing code.
- Do not add Express, NestJS, Prisma, Drizzle, a queue, a worker, or a microservice.
- Do not implement Import, AI execution, funnel events, reports, member management, or organization/project creation UI.
- Keep the `TEAM_LEAD` enum value but grant it no Phase 1 UI, RLS, or RPC authorization.
- Never trust route `projectId`, form `project_id`, counselor/member IDs, role values, or `user_metadata` for authorization.
- Never use or expose a service-role key in application code, `NEXT_PUBLIC_*`, browser tests, or browser bundles.
- Use the publishable key in the client and user-scoped SSR cookies on the server.
- Enable RLS on every exposed table; use separate operation-specific policies and explicit `TO authenticated` clauses.
- Use `USING` and `WITH CHECK` for update policies and ensure the corresponding select policy exists.
- No physical delete UI, grant, RLS policy, or RPC.
- Use `supabase migration new` followed by a descriptive migration name to create every migration; do not hand-invent migration timestamps.
- Pin installed package versions and commit the lockfile.
- Implement tasks in order. After every task: run its tests, stop for Codex security/architecture review, then commit only after approval.
- Cursor writes code. Codex and Claude Code review plans, security, scope, test evidence, and operational readiness; they do not silently expand the implementation.

## Planned file structure

```text
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx
    (app)/projects/page.tsx
    (app)/projects/[projectId]/layout.tsx
    (app)/projects/[projectId]/page.tsx
    (app)/projects/[projectId]/customers/page.tsx
    (app)/projects/[projectId]/customers/[customerId]/page.tsx
    auth/callback/route.ts
  features/
    auth/actions.ts
    projects/queries.ts
    customers/queries.ts
    customers/schemas.ts
    customers/components/customer-list.tsx
    customers/components/customer-detail.tsx
    customers/components/assignment-form.tsx
    customers/components/grade-change-form.tsx
    consultations/schemas.ts
    consultations/actions.ts
    consultations/components/consultation-form.tsx
    consultations/components/consultation-history.tsx
  lib/
    supabase/client.ts
    supabase/server.ts
    supabase/types.ts
    auth/current-membership.ts
    errors/database-errors.ts
proxy.ts
supabase/
  config.toml
  seed.sql
  migrations/                 # names generated only by Supabase CLI
  tests/database/schema.test.sql
  tests/database/rls.test.sql
  tests/database/rpc.test.sql
tests/
  unit/
  e2e/auth.setup.ts
  e2e/counselor.spec.ts
  e2e/admin.spec.ts
  e2e/tenant-isolation.spec.ts
.env.example
README.md
```

### Task 1: Scaffold the application and test harness

**Files:**
- Create: the Next.js scaffold at repository root
- Create: `.env.example`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `proxy.ts`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**
- Produces: `createBrowserClient()` for Client Components
- Produces: `createServerClient()` for Server Components, Server Actions, and Route Handlers
- Produces: cookie refresh proxy using the current official Supabase SSR pattern

- [ ] Verify current official Next.js App Router and Supabase SSR docs, and scan the Supabase changelog for relevant breaking changes.
- [ ] Scaffold TypeScript, App Router, `src/`, ESLint, Tailwind, and npm without creating a nested directory.
- [ ] Install all runtime and test dependencies with exact versions and commit `package-lock.json`.
- [ ] Add `.env.example` containing only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; do not add a service-role variable.
- [ ] Write a failing unit test that imports both Supabase client factories and asserts they are functions.
- [ ] Run `npm test -- --run` and verify it fails because the modules do not exist.
- [ ] Implement the browser/server factories and cookie refresh proxy exactly from current official docs.
- [ ] Run `npm run lint`, `npm test -- --run`, and `npm run build`; require all three to pass.
- [ ] Request Codex review of dependency pins, environment exposure, SSR cookie handling, and the production bundle.
- [ ] Commit with `chore: scaffold DecisionOS web app` after review approval.

### Task 2: Create the Phase 1 PostgreSQL schema

**Files:**
- Create via CLI: migration named `phase1_schema`
- Create: `supabase/tests/database/schema.test.sql`
- Create: `supabase/seed.sql`
- Generate: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: enums and tables `organization`, `project`, `project_member`, `customer`, `consultation`, `customer_status_log`
- Produces: composite keys `(id, project_id)` on `project_member`, `customer`, and `consultation`
- Must match: every field, enum, constraint, index, and entity boundary in `docs/architecture/phase1-schema-and-entities.md`

- [ ] Initialize local Supabase using commands discovered from `supabase --help` and `supabase init --help`.
- [ ] Run `supabase migration new phase1_schema` and edit only the generated migration file.
- [ ] First write pgTAP assertions for every Phase 1 table, required column, enum, composite unique constraint, composite foreign key, check constraint, index, and `ON DELETE RESTRICT` rule from v1.2.
- [ ] Run the database test command discovered from `supabase test --help`; verify schema assertions fail before the migration exists.
- [ ] Implement the minimum schema to satisfy the assertions. Preserve all v1.2 consultation AI columns/checks for compatibility, but do not implement an AI worker.
- [ ] Ensure every timestamp is `TIMESTAMPTZ`, every UUID default uses `gen_random_uuid()`, and `updated_at` behavior is deterministic.
- [ ] Add deterministic local seed rows for two organizations/projects, counselor A, counselor B, admin P1, admin P2, and a `TEAM_LEAD`; do not put production credentials in the repository.
- [ ] Reset the local database, run schema tests, and generate TypeScript types from the local database.
- [ ] Request Codex comparison against v1.2, focusing on cross-project composite FKs and deletion rules.
- [ ] Commit with `feat: add phase 1 database schema` after review approval.

### Task 3: Lock down grants and project-scoped RLS

**Files:**
- Create via CLI: migration named `phase1_rls`
- Create: `supabase/tests/database/rls.test.sql`
- Modify: `supabase/seed.sql`

**Interfaces:**
- Produces private helpers equivalent to `private.current_project_member_id(uuid, project_member_role[]) -> uuid` and `private.has_project_role(uuid, project_member_role[]) -> boolean`
- Produces operation-specific RLS policies described in the spec

- [ ] Write failing database tests that impersonate each seeded user and exercise direct PostgREST-equivalent table access.
- [ ] Include explicit tests for counselor cross-assignment denial, admin cross-project denial, inactive member denial, unauthenticated denial, and `TEAM_LEAD` denial.
- [ ] Include IDOR tests using known customer, consultation, log, project, and project-member UUIDs from another tenant.
- [ ] Run the database suite and verify the new tests fail before policies exist.
- [ ] Create the migration with `supabase migration new phase1_rls`.
- [ ] Revoke default/public/anon access, grant only required authenticated operations, enable RLS, and add separate policies per operation.
- [ ] Put recursive membership helpers in `private`; use `SECURITY DEFINER` only there with `search_path = ''`, schema-qualified references, internal `auth.uid()` checks, and revoked default execute privileges.
- [ ] Ensure no helper or policy authorizes `TEAM_LEAD` and no table has a delete policy.
- [ ] Run database tests and Supabase database advisors; resolve every security warning relevant to created objects.
- [ ] Request Codex security review with the exact SQL diff and test transcript.
- [ ] Commit with `feat: enforce project scoped RLS` after review approval.

### Task 4: Implement transactional business RPCs

**Files:**
- Create via CLI: migration named `phase1_rpcs`
- Create: `supabase/tests/database/rpc.test.sql`
- Regenerate: `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `api.record_consultation(p_customer_id uuid, p_consulted_at timestamptz, p_content text, p_next_action_at timestamptz, p_grade_after customer_grade, p_reason text)`
- Produces: `api.update_consultation(p_consultation_id uuid, p_content text, p_next_action_at timestamptz)`
- Produces: `api.change_customer_grade(p_customer_id uuid, p_grade customer_grade, p_reason text)`
- Produces: `api.assign_customer_counselor(p_customer_id uuid, p_assignee_project_member_id uuid)` where assignee may be null
- Produces: `api.list_project_counselors(p_project_id uuid)` returning active counselor member IDs and email display labels only to a same-project admin
- Every mutation returns the affected row ID and a stable success result; authorization/validation failures use documented stable error codes.

- [ ] Write failing tests for each permitted role and every forbidden cross-project, wrong-role, inactive-member, forged-assignee, no-op-grade, empty-content, and immutable-field case.
- [ ] Write a rollback test proving customer grade and `customer_status_log` cannot diverge.
- [ ] Write a concurrency-aware test asserting the mutation locks the target customer before grade or assignment changes.
- [ ] Run database tests and verify failure before RPC implementation.
- [ ] Create `phase1_rpcs` with Supabase CLI.
- [ ] Create exposed `api` wrappers as `SECURITY INVOKER` and private transaction implementations as tightly controlled `SECURITY DEFINER` functions.
- [ ] Configure `api` as an exposed Data API schema, grant schema usage explicitly, and grant execute only on named wrappers.
- [ ] Derive caller member ID, role, and project inside PostgreSQL; never accept them as authoritative parameters.
- [ ] Revoke execute from `PUBLIC` and `anon`, then grant only the specific API wrappers to `authenticated`.
- [ ] Implement `list_project_counselors` as a read-only, same-project-admin-only exception for presenting counselor email labels; never use returned email or metadata in authorization.
- [ ] Make consultation creation, optional grade update, and log insertion one transaction; make manual grade update and log insertion one transaction.
- [ ] Ensure consultation edits increment `content_version` and reset every v1.2 AI result/status field consistently.
- [ ] Run all database tests and advisors, regenerate TypeScript types, and request Codex security review.
- [ ] Commit with `feat: add transactional customer RPCs` after approval.

### Task 5: Implement authentication and project shell

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/auth/callback/route.ts`
- Create: `src/app/(app)/layout.tsx`
- Create: `src/app/(app)/projects/page.tsx`
- Create: `src/app/(app)/projects/[projectId]/layout.tsx`
- Create: `src/features/auth/actions.ts`
- Create: `src/features/projects/queries.ts`
- Create: `src/lib/auth/current-membership.ts`
- Test: `tests/unit/auth-actions.test.ts`
- Test: `tests/unit/current-membership.test.ts`

**Interfaces:**
- Produces: `signIn(input: { email: string; password: string })`
- Produces: `getActiveMembership(projectId: string)` returning only `COUNSELOR | PROJECT_ADMIN`

- [ ] Write failing tests for invalid credentials, expired sessions, inactive membership, `TEAM_LEAD`, and forged URL project IDs.
- [ ] Implement Korean login validation and Supabase password sign-in.
- [ ] Implement project listing through RLS and a project layout guard that treats URL IDs only as lookup inputs.
- [ ] Redirect authenticated users with one allowed project to that project; show a selector for multiple projects.
- [ ] Use a generic access-denied/not-found page that does not disclose whether another project exists.
- [ ] Run unit tests, lint, and build.
- [ ] Request Codex review of session verification, redirect behavior, and absence of service-role usage.
- [ ] Commit with `feat: add authentication and project shell` after approval.

### Task 6: Build customer list and detail reads

**Files:**
- Create: `src/features/customers/queries.ts`
- Create: `src/features/customers/schemas.ts`
- Create: `src/features/customers/components/customer-list.tsx`
- Create: `src/features/customers/components/customer-detail.tsx`
- Create: `src/features/consultations/components/consultation-history.tsx`
- Create: `src/app/(app)/projects/[projectId]/customers/page.tsx`
- Create: `src/app/(app)/projects/[projectId]/customers/[customerId]/page.tsx`
- Test: `tests/unit/customer-queries.test.ts`
- Test: `tests/unit/customer-list.test.tsx`

**Interfaces:**
- Produces: `listCustomers({ projectId, query, grade, assignment, counselorId, page })`
- Produces: `getCustomerDetail({ projectId, customerId })`

- [ ] Write failing tests for role-shaped results, filters, pagination, empty state, missing/access-denied detail, and phone display formatting.
- [ ] Implement server-side PostgREST queries using the user-scoped SSR client; do not add app-side authorization as a substitute for RLS.
- [ ] Render counselor assigned-customer list and admin project-wide filters from the same focused components.
- [ ] Render customer details, consultation history, grade history, and next action without exposing AI/import/report controls.
- [ ] Add loading, empty, and recoverable error states with Korean copy.
- [ ] Run unit tests, lint, and build; request Codex scope and data-leak review.
- [ ] Commit with `feat: add customer list and detail` after approval.

### Task 7: Build consultation and grade workflows

**Files:**
- Create: `src/features/consultations/schemas.ts`
- Create: `src/features/consultations/actions.ts`
- Create: `src/features/consultations/components/consultation-form.tsx`
- Create: `src/features/customers/components/grade-change-form.tsx`
- Create: `src/lib/errors/database-errors.ts`
- Modify: customer detail page
- Test: `tests/unit/consultation-actions.test.ts`
- Test: `tests/unit/consultation-form.test.tsx`

**Interfaces:**
- Produces thin actions calling the four exact RPC names from Task 4
- Produces stable Korean mappings for validation, authorization, conflict, and retryable database errors

- [ ] Write failing tests proving actions pass only business inputs, use the user-scoped client, map stable RPC errors, and revalidate only affected routes.
- [ ] Write failing component tests for required content, date parsing, optional grade change, pending submission, success reset, and preserved values on retryable failure.
- [ ] Implement consultation creation/edit and manual grade forms without direct writes to protected columns or log tables.
- [ ] Do not log consultation content, phone numbers, tokens, or raw Supabase errors.
- [ ] Run unit tests, lint, and build; request Codex review of RPC usage and sensitive-data handling.
- [ ] Commit with `feat: add consultation and grade workflows` after approval.

### Task 8: Build project-admin overview and assignment

**Files:**
- Create: `src/app/(app)/projects/[projectId]/page.tsx`
- Create: `src/features/customers/components/assignment-form.tsx`
- Modify: `src/features/projects/queries.ts`
- Modify: customer detail page
- Test: `tests/unit/project-overview.test.tsx`
- Test: `tests/unit/assignment-form.test.tsx`

**Interfaces:**
- Produces: project overview counts derived only from RLS-visible rows
- Consumes: `api.list_project_counselors` for administrator-only counselor display labels
- Produces: assignment form calling `api.assign_customer_counselor`

- [ ] Write failing tests for admin totals, unassigned/grade/counselor counts, active-counselor options, counselor redirection, and assignment errors.
- [ ] Implement the lightweight overview without creating report views or a reporting subsystem.
- [ ] Populate assignment options only from `api.list_project_counselors`; treat email as display text, never as an authorization input.
- [ ] Allow unassignment through a null assignee and refresh list/detail/overview after success.
- [ ] Run unit tests, lint, and build; request Codex role-boundary and scope review.
- [ ] Commit with `feat: add admin overview and assignment` after approval.

### Task 9: Prove end-to-end behavior and tenant isolation

**Files:**
- Create: `tests/e2e/auth.setup.ts`
- Create: `tests/e2e/counselor.spec.ts`
- Create: `tests/e2e/admin.spec.ts`
- Create: `tests/e2e/tenant-isolation.spec.ts`
- Modify: `playwright.config.ts`

**Interfaces:**
- Produces: repeatable browser fixtures for Counselor A/B, Admin P1/P2, and `TEAM_LEAD`
- Produces: direct Data API attack tests using each user's own access token, never a browser-exposed service-role token

- [ ] Write failing Playwright tests for login, role navigation, customer search/filter/detail, consultation creation/edit, grade change/history, admin assignment, and responsive keyboard use.
- [ ] Write direct Data API tests that submit foreign project/customer/member UUIDs and require empty/denied results.
- [ ] Include `TEAM_LEAD`, inactive member, expired session, and forged project URL cases.
- [ ] Configure any local test-only admin credential exclusively in Node test setup; assert it is absent from client environment and built browser assets.
- [ ] Run local Supabase, the app, all database/unit/E2E tests, lint, and production build.
- [ ] Request Codex final security review and Claude Code product/operations review with complete transcripts.
- [ ] Commit with `test: verify mvp workflows and tenant isolation` after both approvals.

### Task 10: Document operations and handoff

**Files:**
- Modify: `README.md`
- Create: `docs/operations/local-development.md`
- Create: `docs/operations/supabase-setup.md`
- Create: `docs/operations/release-checklist.md`

**Interfaces:**
- Produces: reproducible setup, migration, seed, test, and deployment instructions
- Produces: a release checklist explicitly checking RLS, advisors, secrets, and rollback readiness

- [ ] Document exact prerequisite versions, environment variables, local startup commands, migration workflow, type generation, and test commands observed during implementation.
- [ ] Document how an operator creates initial organizations, projects, auth users, and project-member rows without adding self-service UI.
- [ ] Document that production deploys require database migration/advisor success before the web deployment.
- [ ] Add checks for no browser service-role key, all exposed tables with RLS, `TEAM_LEAD` denied, tenant-isolation suite passing, and backup/rollback readiness.
- [ ] Run every documented command from a clean checkout or equivalent clean environment and correct discrepancies.
- [ ] Request Codex/Claude Code operational-readiness review.
- [ ] Commit with `docs: add DecisionOS operations runbook` after approval.

## Final completion evidence

Cursor must not report completion without attaching:

```text
git status --short
npm run lint
npm test -- --run
npm run build
supabase migration list --local
supabase test db
supabase db advisors
npx playwright test
```

Also attach the migration/RLS/RPC diff, database advisor output, tenant-isolation test names, and confirmation that built browser assets contain no secret/service-role key.

# DecisionOS MVP Phase 1 Design

## 1. Goal and scope

DecisionOS Phase 1 is a production-shaped browser application for counselors and project administrators. It includes real Supabase Auth, PostgreSQL persistence, project-scoped RLS, customer/consultation workflows, counselor assignment, and immutable grade-change history.

In scope:

- Email/password login and cookie-backed sessions
- Project selection for active memberships
- `COUNSELOR` assigned-customer workflow
- `PROJECT_ADMIN` project-wide customer workflow
- Customer details, consultations, follow-up dates, actual grade changes
- Counselor assignment
- Grade change audit log
- PostgreSQL constraints, RLS, transactional RPCs, and security tests

Out of scope:

- Organization/project self-service creation
- Member invitation or role management
- `TEAM_LEAD` permissions or UI
- Customer Import, AI grade suggestions, funnel events, reports
- Express, NestJS, queues, workers, or microservices
- Physical delete operations

The source logical schema is `/Users/apple/Downloads/DecisionOS_논리스키마_v1.2.md` (the filesystem may display the Korean filename in decomposed Unicode form). Phase 1 implements only the subset identified above while preserving compatible enum and foreign-key definitions needed for later phases.

## 2. Architecture

```text
Next.js App Router
  ├─ Supabase Auth via @supabase/ssr cookie session
  ├─ Server Components for authenticated reads
  ├─ thin Server Actions for form validation and user-scoped Supabase calls
  └─ PostgREST / RPC
          ↓
    grants + project-scoped RLS
          ↓
    PostgreSQL constraints + transactions
```

There is no independent API server. Server Actions contain no authorization decisions and never use a service-role key. Their database calls run with the signed-in user's access token; RLS and RPC checks remain the final security boundary.

The browser may know a project UUID and may alter any request value. Every table policy and RPC therefore derives the caller from `auth.uid()` and compares the target row's `project_id` with an active `project_member` row.

## 3. Data model

```text
organization
  └─ project
      └─ project_member ── auth.users
          └─ customer
              ├─ consultation
              └─ customer_status_log
```

Use the v1.2 field types, enum values, checks, indexes, composite unique constraints, composite foreign keys, and `ON DELETE RESTRICT` rules for these six application tables.

Important interpretations:

- `customer.assigned_counselor_id` references `project_member.id`, not `auth.users.id`.
- A counselor owns no customer row. Access is derived by joining the assigned project-member row to `project_member.user_id = auth.uid()` inside the same project.
- `customer_status_log` is the existing v1.2 grade-transition log. Logical `from_status`/`to_status` wording maps to physical `grade_before`/`grade_after`; `changed_by_project_member_id` maps to `changed_by`; `created_at` maps to `changed_at`.
- `TEAM_LEAD` remains an enum value for schema compatibility but receives no Phase 1 RLS or RPC authorization.
- Organization and project seed data are prepared operationally, not through the application UI.

## 4. Authorization

Default posture:

- Revoke application-table access from `anon`.
- Enable RLS on every table exposed through the Data API.
- Grant `authenticated` only the operations and columns required by Phase 1.
- Do not create any delete policy.
- Do not base authorization on `user_metadata`, route parameters, hidden buttons, or request-provided role/counselor IDs.
- Do not include a production `SUPABASE_SERVICE_ROLE_KEY` variable in the Next.js application.

Role behavior:

| Table | COUNSELOR | PROJECT_ADMIN |
|---|---|---|
| organization | Read the organization of an active member project | Same |
| project | Read active member projects | Same |
| project_member | Read own membership | Read all members in the same project |
| customer | Read currently assigned customers | Read all customers in the same project |
| consultation | Read consultations for currently assigned customers | Read consultations in the same project |
| customer_status_log | Read history for currently assigned customers | Read history in the same project |

Policy predicates must include `project_member.active = true`, `project.status = 'ACTIVE'`, `organization.status = 'ACTIVE'`, `project_member.user_id = auth.uid()`, the exact allowed role, and equality between the membership `project_id` and target-row `project_id`.

Avoid self-referential `project_member` RLS recursion with narrowly scoped authorization helpers in a non-exposed `private` schema. Any `SECURITY DEFINER` helper must:

- live outside exposed schemas;
- set `search_path = ''`;
- schema-qualify every referenced object;
- check `auth.uid()` internally;
- revoke execute from `PUBLIC` and `anon`;
- return only a boolean or current member UUID;
- never contain a `TEAM_LEAD` authorization branch.

## 5. Mutation boundaries

General reads use PostgREST with RLS. The following mutations use exposed RPC wrappers because they enforce invariants or modify multiple rows:

1. `api.record_consultation`
   - Locks/validates the customer.
   - Authorizes the current assigned counselor; project admin cannot create consultations in Phase 1.
   - Inserts the consultation with caller-derived `project_id`, `counselor_id`, and `created_by`.
   - If an optional new grade differs, updates `customer.grade` and inserts `customer_status_log` in the same transaction.

2. `api.update_consultation`
   - Allows only the active, currently assigned counselor who originally created it.
   - Changes only `content` and `next_action_at`.
   - Increments `content_version` in the database.
   - Resets the v1.2 AI analysis fields to their pending/null state for future compatibility.

3. `api.change_customer_grade`
   - Allows the active assigned counselor or same-project project admin.
   - Locks the customer, rejects a no-op grade, updates the current grade, and appends the immutable log atomically.
   - Uses `consultation_id = NULL` for a manual change.

4. `api.assign_customer_counselor`
   - Allows only an active same-project `PROJECT_ADMIN`.
   - Locks the customer.
   - Requires the assignee to be an active `COUNSELOR` in the same project.
   - Accepts `NULL` to mark a customer unassigned.

RPC parameters never include an authoritative `project_id`, acting member ID, or role. Those values are derived in the database. Exposed `api` wrappers are `SECURITY INVOKER`; mutation implementations that need elevated table privileges live in `private`, use `SECURITY DEFINER`, and repeat all authentication and project checks internally.

The `api` schema is the only additional exposed Data API schema. It receives explicit `USAGE`/function `EXECUTE` grants; tables remain in `public` with RLS. A narrowly scoped read RPC, `api.list_project_counselors`, may return active same-project counselor IDs and email-based display labels to a same-project administrator because `auth.users` is not directly exposed. The email is presentation data only and is never used for authorization.

## 6. Routes and screens

```text
/login
/projects
/projects/[projectId]
/projects/[projectId]/customers
/projects/[projectId]/customers/[customerId]
```

Counselor:

- Starts on assigned customers.
- Searches by name or normalized phone and filters by grade.
- Opens a customer to see details, consultation history, grade history, and next action.
- Records or edits a consultation and optionally changes actual grade.

Project administrator:

- Starts on a lightweight project overview showing total, unassigned, grade, and counselor counts.
- Searches and filters every customer in the project.
- Opens the same customer detail in read-oriented mode.
- Assigns/unassigns an active counselor and may manually change actual grade.

UI route checks improve navigation only. A forged URL or request must still fail at RLS/RPC.

## 7. Data flow

Authenticated read:

1. Next.js creates a server Supabase client from request cookies.
2. It verifies the user with the supported Supabase server-auth method.
3. It queries memberships/customers through PostgREST.
4. RLS filters rows by `auth.uid()` and target `project_id`.
5. The Server Component renders only returned data.

Mutation:

1. The form validates shape with Zod.
2. A thin Server Action creates a user-scoped Supabase server client.
3. The action calls one named RPC and passes only business inputs.
4. The private mutation function authenticates and authorizes again, locks rows when required, then commits or rolls back atomically.
5. The action maps known database error codes to Korean user messages and revalidates the affected route.

## 8. Error handling

- Unauthenticated session: redirect to `/login`.
- No active Phase 1 membership: show an access-denied page without leaking project existence.
- RLS denial or missing row: use the same generic not-found/access-denied result.
- Validation error: field-level Korean message; no database request.
- Concurrent/no-op update: RPC returns a stable application error code.
- Unexpected database/network error: show a retry message, preserve safe form values, and log only non-sensitive context.
- Never render phone numbers or consultation content in console/error telemetry.

## 9. Verification

Database tests must prove allowed paths and direct-API attacks:

- Counselor A can read only currently assigned customers and related consultation/log rows.
- Counselor A cannot read or mutate Counselor B's customer, even with known UUIDs.
- Project Admin P1 cannot read or mutate P2 rows.
- `TEAM_LEAD` cannot access Phase 1 business rows or call mutation RPCs.
- Request-provided project/member identifiers cannot cross tenant boundaries.
- Grade update and log insertion commit together or both roll back.
- Consultation update increments `content_version` and resets AI fields.
- Direct inserts into `customer_status_log` and direct protected-column updates fail.
- No application bundle or browser environment contains a secret/service-role key.

UI tests cover login, role navigation, list/detail filters, consultation form, grade change, assignment, loading/empty/error states, responsive layout, and keyboard-accessible dialogs/forms.

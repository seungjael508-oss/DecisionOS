# DecisionOS

Counselor and project-admin MVP for customer consultations, grade changes, and assignment. The browser app uses Next.js App Router with Supabase Auth cookie sessions. PostgreSQL RLS and RPCs remain the authorization boundary.

## Prerequisites

- Node.js 20+
- npm

## Environment

Copy `.env.example` to `.env.local` and set only the public Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not add a service-role key to application, browser, or `NEXT_PUBLIC_*` environment variables.

## Scripts

```bash
npm run dev
npm run lint
npm test -- --run
npm run build
```

Local database, seed, and RLS work start in later Phase 1 tasks.

## Auth clients

- `src/lib/supabase/client.ts` — browser client for Client Components
- `src/lib/supabase/server.ts` — cookie-backed server client for Server Components, Server Actions, and Route Handlers
- `src/proxy.ts` — refreshes the Auth cookie on matched requests

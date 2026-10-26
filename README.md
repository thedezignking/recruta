# Recruta

Recruiter-first recruitment operations: create an organization and job, publish an application link, review applicants, communicate, and collaborate with invited hiring managers. Hiring requests are an optional inbound path.

## Local setup

1. Copy `.env.example` to `.env.local` and add Supabase, Resend, and Sentry credentials.
2. Run `npm install`.
3. Start local Postgres with `npm run db:start`, then run `npm run db:reset`.
4. Run `npm run dev`.

Authenticated product and portal routes require Supabase. Use synthetic data in local and staging environments.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run db:test`
- `npm run test:e2e`
- `npm run build`

Regenerate `src/types/database.generated.ts` after schema changes with
`npm run db:types > src/types/database.generated.ts`.

For authenticated browser coverage, start a full disposable local stack with `npx supabase start -x realtime,imgproxy,studio,edge-runtime,logflare,vector,supavisor`, reset it with `npm run db:reset`, then run `npm run test:e2e:local`. The wrapper builds and runs on port 3001, binds credentials to the local stack, and disables external AI, email, telemetry, and enrichment providers. Do not reset a hosted database. CI uses this isolated path for its authenticated browser job.

The staging collaboration schema is applied as `20261026180009_recruiter_hardening_and_collaboration.sql`; its matching application changes still need deployment. Deploy the worker supporting both screening prompt versions before applying `20261026190000_screening_v2_enqueue.sql`. See [ADR 0005](docs/decisions/0005-recruiter-hardening-and-collaboration.md). Local tests do not deploy or activate hosted providers.

The primary UI accent is `#5C5AED`. All product icons are Solar linear or solid/bold; duotone icon styles are intentionally not used.

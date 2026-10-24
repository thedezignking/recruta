# Recruta

Phase-one recruitment operations platform covering agency onboarding, team and client access, client hiring requests, clarification and approval, and conversion to an active job.

## Local setup

1. Copy `.env.example` to `.env.local` and add Supabase, Resend, and Sentry credentials.
2. Run `npm install`.
3. Start local Postgres with `npm run db:start`, then run `npm run db:reset`.
4. Run `npm run dev`.

Without environment credentials, the product routes render the seeded interface for UI review. Authenticated mutations require Supabase.

## Verification

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run db:test`
- `npm run test:e2e`
- `npm run build`

Regenerate `src/types/database.generated.ts` after schema changes with
`npm run db:types > src/types/database.generated.ts`.

The primary UI accent is `#5C5AED`. All product icons are Solar linear or solid/bold; duotone icon styles are intentionally not used.

## Recruta project instructions

These instructions apply to the entire repository. The two master documents are the product and technical sources of truth:

- `docs/Recruta Master PRD.md`
- `docs/Recruta Master Technical PRD.md`

Read the relevant sections before changing product behavior, architecture, data, permissions, or the visual system. If implementation and documentation disagree, identify the mismatch and update the appropriate source of truth with the change.

### Product direction

- Recruta is a recruiter-first recruitment operations and automation product for agencies.
- The primary workflow is: select or create an organization, open a job, publish it, receive applications, review and communicate, collaborate, interview, offer, and place.
- A hiring request is an optional inbound path from an agency website or invited employer. It is not required before a recruiter can create a job.
- One job can have multiple openings through `positions_required`. Never create duplicate jobs or organizations merely because headcount is greater than one.
- An organization record does not require a portal membership. A recruiter can create an organization inline while opening a job.
- A candidate is an agency-scoped person; an application is that person's submission to one job. Do not put job-specific state on the candidate.
- Candidates apply without an account through the dedicated public apply route.
- AI assists with extraction, evidence, completeness, summaries, and suggestions. It must not make final hiring decisions or silently reject candidates.
- Email is the first communication channel. Keep domain behavior provider-neutral so WhatsApp or SMS can be added later.
- Dashboards and navigation should prioritize actionable recruiter work. Do not add vanity cards or empty future modules to primary navigation.
- The current build priority is Milestone 3: applicant operations, then AI-assisted screening, candidate communications, and a recruiter attention queue.

### Current architecture

- Next.js 16.4 App Router, React 19, TypeScript, Tailwind CSS 4, local shadcn-style/Base UI components.
- Supabase provides Postgres, Auth, SSR sessions, and private Storage.
- Authenticated reads default to Server Components. Interactive controls should be small Client Component islands.
- Versioned mutations live in `src/app/api/v1` Route Handlers and call reusable functions in `src/server/services`.
- Validate external input with Zod. Keep API responses in `{ data, meta? }` and errors in `{ error: { code, message, fieldErrors?, requestId } }`.
- Use `src/lib/env.ts` for validated environment access. Never expose secret/service keys through `NEXT_PUBLIC_*` variables.
- Keep this a modular monolith. Do not introduce another API server, microservice, or speculative abstraction without an approved architecture change.
- Planned services such as AI providers, background runners, WhatsApp, and SMS are not current dependencies until selected and installed.

### Supabase and data safety

- Make schema changes only through forward migrations in `supabase/migrations`; regenerate `src/types/database.generated.ts` afterward.
- Discover current Supabase CLI commands with `--help` and consult current Supabase documentation before changing Auth, RLS, Storage, functions, or configuration.
- Enable RLS on every table in an exposed schema and use least-privilege grants.
- Authorization comes from active memberships and explicit job access in the database, never user-editable auth metadata.
- Include `agency_id` on tenant-owned records and enforce cross-tenant integrity with composite constraints where relationships require it.
- Treat `SECURITY DEFINER` functions as privileged APIs: verify `auth.uid()`, active membership/role, tenant relationships, execute grants, and `search_path`.
- Public access is limited to eligible published jobs and controlled application submission. Candidate documents remain private and use short-lived signed URLs.
- Use idempotency and unique constraints for retryable operations. A double click or provider retry must not create duplicate organizations, jobs, applications, invitations, or communications.
- Preserve operational history. Delete only records the domain explicitly defines as safely empty; otherwise archive, revoke, cancel, or close.
- Store material actor, tenant, resource, request ID, and state changes in audit history.
- Use synthetic candidate data in local and staging environments.

### UI and content standards

- Brand accent is `#5C5AED`; do not use it as a semantic success or error color.
- Use Geist Sans for product UI and Geist Mono for identifiers or operational metadata where useful.
- Use `@solar-icons/react` `2.3.3` with per-icon imports.
- Use Solar Linear icons for routine actions, unselected navigation, fields, table controls, and metadata.
- Use Solar Bold solid icons only for selected navigation, product identity, major empty states, and high-salience confirmation. Do not use duotone icons.
- Use the plain Add icon for ordinary create actions, not a circled add icon.
- Decorative icons need `aria-hidden`; icon-only controls need an accessible label and tooltip.
- Reuse primitives in `src/components/ui` and shared product components before creating one-off implementations.
- Publishing flows must show a faithful preview of the public job and the fields candidates will complete.
- The agency workspace should be compact and efficient; public and external flows must be fully responsive.
- Meet WCAG 2.2 AA: keyboard access, visible focus, semantic labels, accessible errors, contrast, and reduced-motion behavior.

### Engineering workflow

- Preserve user changes and inspect the dirty worktree before editing overlapping files.
- Use `rg`/`rg --files` for repository search.
- Use `apply_patch` for intentional file edits.
- Keep business rules in services/database operations, not duplicated across route handlers and UI components.
- Prefer deterministic server-side filtering and cursor pagination for operational lists.
- Email or AI provider failure must not roll back an already-valid application, job, request, or transition.
- Treat uploaded documents and their extracted text as untrusted input.
- Add or update tests in proportion to risk: unit validation/permissions, database RLS and constraints, integration behavior, and Playwright for critical workflows.

Before handing off a material change, run the relevant subset and, for a complete feature, all of:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run db:test
npm run test:e2e
npm run build
```

If local Supabase is required, use the repository scripts to start and reset it. Report tests that could not run and the exact reason; never claim unrun checks passed.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

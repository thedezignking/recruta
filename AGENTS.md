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
- Summary cards are independent surfaces with visible gaps. Keep interface copy concise: remove taglines and repeated explanations, while retaining task guidance, labels, validation, consent, and destructive-action consequences.
- Overview cards are ordered Active jobs, Applications received, In review, Shortlisted. In review excludes new arrivals; these are job-specific application counts, not unique people. Summary filters use rolling 24h/7d/14d/30d intake windows or All time, with current lifecycle status. Work queues stay unfiltered so older outstanding work remains visible. Placements are not a dashboard metric until confirmation exists.
- Overview has no greeting. Its content-width date-range select defaults to Last 30 days and sits beside New job (stack responsively on small screens). All time is an explicit choice. Main sections have no breadcrumbs. Password fields include accessible show/hide controls. Collapsed navigation labels appear only on hover or keyboard focus; reset tooltip state when toggling the sidebar.
- The compact workspace dropdown lists active memberships and links to Create workspace. Workspace selection is a user-scoped HttpOnly cookie preference, never authorization; pages and APIs re-check active database membership and workspace status. Explicit agency headers override the preference only after verification. Creating an additional workspace must preserve the personal profile, seed workflows atomically, and reuse an owned slug on retry.
- Tenant-wide mutations without a resource ID, including settings and team invitations, must send the originating page's explicit agency ID so another tab's workspace selection cannot redirect a stale form submission into a different agency.
- The top bar has compact inline, non-modal workspace search with a `⌘ K` hint (Ctrl/Cmd+K both work) and a real notification feed. The sidebar account menu holds personal account/security controls, shortcut help, careers-page access, and separated destructive logout—not duplicate Team/Settings links. Mobile uses the same menu. Notification read IDs are currently device-local and agency/user-scoped.
- Reuse the shared company picker and editable organization fields for standalone and inline creation. Contacts are optional. Do not persist Brand Search responses or temporary suggestion images; enrichment is separately fetched only when credentials and storage permission are configured. Manual entry must always work.
- The current build priority is Milestone 3: applicant operations, then AI-assisted screening, candidate communications, and a recruiter attention queue.
- Applicant review now uses job-scoped RLS for recruiters and agency-wide access for managers. Use `review_application` for stage/owner/note writes; do not restore direct table writes. State/owner changes require the last `updated_at`, notes use retry-safe UUIDs, and consequential stage changes require a reason. Stage changes currently send no email and cannot mark a placement. Keep advanced duplicate merging, AI, and communication features explicitly separate from this core 3A slice.
- Milestone 3B includes the screening evidence/history/extracted-text UI, append-only recruiter corrections, per-agency activation, extraction checkpoints, and automatic intake enqueue after opt-in. Milestone 3C includes queued candidate email/templates/history/retry/cancel, signed delivery callbacks, acknowledgement automation, and Needs attention. Follow `docs/decisions/0001-screening-execution.md` and `0002-applicant-processing-and-communication.md`. Initial verification used fake providers; the owner subsequently authorized model selection and live synthetic evaluations. GPT-6 Luna is the local pilot candidate and passed six screening cases plus simple PDF/DOCX extraction-to-evidence tests. This is a smoke evaluation, not production accuracy approval. Automatic intake and app-level AI remain disabled pending pilot activation. Do not silently provision a scheduler, send email without an authorized test recipient, or transmit real staging data. Screening never changes lifecycle stages or sends email. Stage changes never send email automatically.

### Current architecture

- Next.js 16.4 App Router, React 19, TypeScript, Tailwind CSS 4, local shadcn-style/Base UI components.
- Supabase provides Postgres, Auth, SSR sessions, and private Storage.
- Authenticated reads default to Server Components. Interactive controls should be small Client Component islands.
- Versioned mutations live in `src/app/api/v1` Route Handlers and call reusable functions in `src/server/services`.
- Validate external input with Zod. Keep API responses in `{ data, meta? }` and errors in `{ error: { code, message, fieldErrors?, requestId } }`.
- Use `src/lib/env.ts` for validated environment access. Never expose secret/service keys through `NEXT_PUBLIC_*` variables.
- Keep this a modular monolith. Do not introduce another API server, microservice, or speculative abstraction without an approved architecture change.
- Planned services such as AI providers, background runners, WhatsApp, and SMS are not current dependencies until selected and installed.
- OpenAI SDK `7.43.0` is installed for the screening adapter; no external background runner is installed. Processing uses Postgres leases and requires an operator-configured worker scheduler. `store: false` is not a zero-retention guarantee.

### Supabase and data safety

- Make schema changes only through forward migrations in `supabase/migrations`; regenerate `src/types/database.generated.ts` afterward.
- The historical RLS optimization migration has one portability guard for the hosted-only `rls_auto_enable()` helper. Preserve that conditional revoke so clean local replay works; new domain changes still require forward migrations.
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

- Branding uses a near-black (#111111) rounded square with a white abstract fit symbol formed by two complementary corners, defined in `public/brand/recruta-symbol.svg` and mirrored in `src/app/icon.svg`. Previous starburst and gradient ribbon artwork is legacy only. Do not add gradients, 3D effects, or generic product icons.
- The default lockup uses a 28 px square mark (8/40 proportional corner radius), a 22 px semibold Geist wordmark, and a 10 px gap. The sidebar uses the compact 24 px mark, 20 px wordmark, and 8 px gap. Use 6 px control/navigation corners and 10 px card/overlay corners through the shared radius scale; navigation icons are 20 px and compact action icons 16 px.

- Brand accent is `#5C5AED`; do not use it as a semantic success or error color.
- Use Geist Sans for product UI and Geist Mono for identifiers or operational metadata where useful.
- Use `@solar-icons/react` `2.3.3` with per-icon imports.
- Use Solar Linear icons for routine actions, inactive sidebar navigation, fields, table controls, and metadata. Selected navigation uses a brand-purple Solar Bold solid icon on a neutral gray surface with dark text. The sidebar/canvas is neutral #F5F5F5; the work area is white, with #E8E8E8 borders.
- Owners and administrators can upload, replace, and remove the public agency logo in Agency settings. Accept PNG/JPG/WebP up to 2 MiB; keep candidate documents private. Use the existing agency-logos bucket, immutable object paths, and update_agency_logo for concurrency checks and audit history.
- Use Solar Bold solid icons only for active navigation, product identity, major empty states, and high-salience confirmation. Do not use duotone icons.
- Use the plain Add icon for ordinary create actions, not a circled add icon.
- Decorative icons need `aria-hidden`; icon-only controls need an accessible label and tooltip.
- Reuse primitives in `src/components/ui` and shared product components before creating one-off implementations.
- Reserve filled primary buttons for a page's main action or a form's main submission. Supporting/repeated actions, empty-state CTAs, and alternate Save draft actions use `outline`, not filled `secondary`. Keep lightweight navigation ghost/link and destructive actions semantically destructive.
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

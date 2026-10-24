# RECRUTA

## Master Technical Product Requirements Document

**Version:** 4.0  
**Date:** October 24, 2026  
**Company:** Evenkore  
**Product:** Recruta  
**Document type:** Engineering and system architecture specification  
**Status:** Revised technical source of truth  
**Product source:** Recruta Master PRD v4.0  
**Supersedes:** Recruta Master Technical PRD v3.0

---

# 1. Purpose and Architecture Goal

This document defines how Recruta is built and how its current foundation should evolve. It reflects the repository as of October 24, 2026 and distinguishes implemented systems from planned ones.

The primary engineering goal is to support this recruiter-first path securely and reliably:

**Create/select organization → open job → publish → receive application → process and review → communicate → collaborate → interview → offer → placement**

Hiring requests are a secondary intake path. They may create a job through an approved revision, but direct job creation is a first-class workflow and must remain independent.

## 1.1 Architecture Principles

1. **One modular application before distributed services.** Keep transactional product logic in a well-structured Next.js and Postgres system until scale or operational isolation justifies extraction.
2. **Server Components for authenticated reads.** Keep data access and credentials on the server and add client components only where interaction requires them.
3. **Route handlers plus domain services for mutations.** HTTP handlers validate context and format responses; services own business operations.
4. **Postgres enforces invariants.** Use foreign keys, checks, unique constraints, RLS, and narrowly scoped transactional functions for multi-record operations.
5. **Tenant boundaries are enforced twice.** Application authorization and database RLS must both restrict agency data.
6. **Public access is deliberately narrow.** Public users can see published jobs and submit applications, not query internal records.
7. **Async work never owns authoritative state.** AI and email failures must not lose an application or reverse a valid recruitment transition.
8. **Human-controlled hiring decisions.** AI produces evidence and assistance; authorized people transition consequential candidate state.
9. **Idempotency at external and transactional boundaries.** Repeated requests, provider retries, and double clicks must not create duplicate operational records.
10. **Current documentation wins over remembered framework conventions.** Next.js and Supabase APIs change; engineers must consult repository-local Next.js docs and current Supabase documentation before changing those integrations.

---

# 2. Current Technology Baseline

Versions below are the installed baseline from `package.json`. Do not silently document planned packages as already present.

| Area | Current technology |
| --- | --- |
| Runtime/package manager | Node.js 22 in CI, npm, committed lockfile |
| Web framework | Next.js `16.4.2`, App Router |
| UI runtime | React and React DOM `19.3.0` |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| UI primitives | Base UI via `@base-ui/react`, shadcn-style local components, CVA |
| Icons | `@solar-icons/react` `2.3.3` |
| Fonts | Geist `1.8.2` |
| Forms and validation | React Hook Form `7.90.0`, Zod `4.6.7`, Hook Form resolvers `5.2.2` |
| Data tables/query tools | TanStack Table `9.3.1`, TanStack Query `5.104.5` |
| Database/auth/storage | Supabase JS `2.118.0`, Supabase SSR `0.12.7`, PostgreSQL, Supabase Storage |
| Email | Resend `6.34.1` plus Supabase SMTP for authentication mail |
| Error monitoring | Sentry for Next.js `11.8.0` |
| Unit/component tests | Vitest `5.0.5`, Testing Library |
| Browser/accessibility tests | Playwright `1.64.1`, axe-core Playwright `4.11.0` |
| Deployment target | Vercel with separate local, preview/staging, and production services |

## 2.1 Planned, Not Yet Installed

- An AI provider SDK and chosen models for document extraction and screening assistance.
- A durable background workflow/execution system. Trigger.dev remains a candidate, not a committed current dependency.
- WhatsApp and SMS channel providers.
- Calendar or mailbox integration SDKs.

These choices require an architecture decision record that covers reliability, region, privacy, operating cost, observability, and local development.

---

# 3. Repository and Runtime Structure

The existing repository structure is the baseline:

```text
src/
  app/
    (auth)/                 # login, signup, reset, onboarding
    (agency)/app/           # recruiter/agency workspace
    (portal)/portal/        # scoped external collaboration
    api/v1/                 # versioned route handlers
    careers/[agencySlug]/   # public career, job, and apply pages
    invitations/[token]/    # invitation acceptance
  components/
    applications/
    auth/
    jobs/
    layout/
    organizations/
    public/
    requests/
    settings/
    shared/
    team/
    ui/
  lib/
    supabase/               # browser, server, public, admin, proxy clients
    api.ts                  # response envelope and structured errors
    env.ts                  # environment validation
    validation.ts           # shared Zod contracts
  server/
    auth/
    authorization/
    email/
    services/               # application/domain operations
  types/
    database.generated.ts
    domain.ts
supabase/
  migrations/
  tests/
tests/e2e/
.github/workflows/
```

Do not create a second speculative architecture such as `features/*`, a separate API server, or repositories layered over every query without a demonstrated need. New modules should follow the current boundaries and may be extracted only when their complexity warrants it.

## 3.1 Request Flow

Authenticated read:

```text
Server Component
  → require agency/client page context
  → domain service or scoped Supabase query
  → RLS-protected Postgres
  → rendered UI
```

Mutation:

```text
Client form/control
  → /api/v1 route handler
  → request ID + session + active membership + role check
  → Zod validation
  → domain service
  → scoped query or transactional database function
  → activity event / async event
  → { data, meta? } or structured error
```

Public application:

```text
Public job/apply page
  → narrow public job lookup
  → multipart POST to public application route
  → eligibility + question + upload validation
  → private resume upload
  → transactional submit_public_application
  → acknowledgement delivery attempt
  → confirmation independent of email success
```

## 3.2 Next.js Conventions

- App Router pages and layouts are Server Components by default.
- Client components are interaction islands, not page-wide defaults.
- Use `proxy.ts` only for session refresh and lightweight routing concerns. It is not the authorization layer.
- Every protected service and route verifies user and active membership at execution time.
- Use Route Handlers for the versioned application API.
- Read the relevant guide under `node_modules/next/dist/docs/` before changing framework behavior; Next.js 16 conventions may differ from older knowledge.

---

# 4. Product Domains and Ownership

## 4.1 Identity and Tenancy

Tables:

- `user_profiles`
- `agencies`
- `agency_memberships`
- `agency_invitations`

Responsibilities:

- Supabase Auth owns credentials and sessions.
- Recruta tables own authorization roles and membership status.
- Onboarding atomically creates the agency, owner membership, profile, and default workflow templates.
- User-editable authentication metadata is never an authorization source.

## 4.2 Organizations and External Membership

Current internal table names retain the earlier `client` vocabulary:

- `clients`
- `client_contacts`
- `client_memberships`
- `client_invitations`
- `client_job_access`

The product UI calls these employer records **Organizations**. Do not rename database tables casually; a rename requires a migration, regenerated types, updated policies/functions, and compatibility review.

An organization can be created independently or as part of the transactional manual-job flow. An organization does not imply a portal user.

## 4.3 Hiring Requests

Tables:

- `hiring_requests`
- `hiring_request_requirements`
- `hiring_request_revisions`
- `hiring_request_messages`
- `hiring_request_attachments`

Requests are optional inbound work. Approval references an immutable revision. The unique relationship from request to job ensures one converted job per request.

## 4.4 Jobs and Workflows

Tables:

- `jobs`
- `job_requirements`
- `job_assignments`
- `workflow_templates`
- `workflow_stages`
- `job_workflow_stages`
- `job_application_questions`

Important invariants:

- `positions_required` is headcount within one job.
- `source` identifies manual, hiring request, public request, portal request, or imported origin.
- A publicly accepting job is open and has `public_slug` and `published_at`.
- Job requirements and workflow stages are copied/snapshotted so later template edits do not rewrite history.
- Manual job creation and request conversion are separate supported entry points into the same job model.

## 4.5 Candidates and Applications

Current tables:

- `candidates`
- `applications`
- `application_answers`
- `candidate_documents`

Important invariants:

- Candidates are unique by normalized email within an agency in the current foundation.
- An application belongs to one candidate and one job.
- One candidate can apply to many jobs.
- The same candidate can have at most one application to the same job unless a future reapplication model explicitly changes this constraint.
- Application status is job-specific; candidate identity is not.
- Resume files live in a private bucket and are opened with a short-lived signed URL.

## 4.6 Audit and Communications

- `activity_events` is append-only operational history for material actions.
- `communications` records recipient, message type, provider ID, state, attempts, idempotency key, related entity, and error state.
- Sending failure is operational state, not a reason to roll back a successful job/application/request mutation.

---

# 5. Database and Supabase Requirements

## 5.1 General Rules

- Use UUID primary keys and UTC `timestamptz` values.
- Put constrained statuses behind check constraints or intentionally managed enums.
- Include `agency_id` on tenant-owned operational tables.
- Use composite foreign keys where needed to prevent cross-agency relationships.
- Add tenant/status/time indexes that reflect actual list queries.
- Enable RLS on every table in an exposed schema.
- Grant Data API access only where required; grants and RLS are separate controls.
- Prefer `security invoker`; use `security definer` only for a justified transaction or public submission boundary with explicit authorization and tightly controlled execute grants.
- Revoke default `PUBLIC` execution for privileged functions and grant only the roles that require each function.
- Do not use `auth.role()` policies; use explicit policy roles and row predicates.
- An update policy requires both row visibility and appropriate `USING`/`WITH CHECK` protections.
- Views exposed through the API must use `security_invoker = true` where supported or remain unexposed.

## 5.2 Transactional Functions

Existing functions cover operations such as:

- `onboard_agency`
- invitation acceptance
- request submission and transition
- request approval and conversion
- `create_manual_job`
- `publish_job`
- job assignment and transition
- `submit_public_application`
- safe deletion of empty manual jobs and organizations

Each function must:

- Derive the actor from `auth.uid()` for authenticated operations.
- Check active membership and allowed roles internally when it can bypass RLS.
- Verify all related records belong to the same agency.
- write required audit events in the same transaction.
- Return stable identifiers or a well-defined record shape.
- Remain idempotent when the endpoint promises idempotency.

## 5.3 Migration Workflow

- Create new migration files through the Supabase CLI command discovered with `supabase migration --help`; do not invent filenames during implementation.
- Iterate locally, run database tests, review generated diff, and regenerate `src/types/database.generated.ts`.
- Review RLS, function grants, storage policies, and advisors before deployment.
- Never edit an already-applied migration to change production state; add a forward migration.

## 5.4 Storage

Current private file classes are hiring-request attachments and candidate documents.

Requirements:

- PDF and DOCX only for current resume/request flows.
- Maximum 10 MiB per file unless a later product requirement changes it.
- Tenant/job/application identifiers are part of the storage path.
- Upload names are sanitized; the original display name is stored separately.
- Download uses a short-lived signed URL after application authorization.
- Public bucket access to resumes is forbidden.
- Deleting a database row and storage object must have an explicit, recoverable or compensating strategy.

---

# 6. Authentication and Authorization

## 6.1 Authentication

- Supabase email/password authentication.
- Email verification and reset callback routes.
- Cookie-backed SSR session handling with `@supabase/ssr`.
- Authentication messages use configured Supabase SMTP; application messages use the server-only Resend adapter.
- Secret/service keys are server-only and never use a `NEXT_PUBLIC_` prefix.

## 6.2 Authorization Sources

Agency roles:

- `owner`
- `administrator`
- `recruitment_manager`
- `recruiter`

External roles:

- `client_administrator`
- `hiring_manager`
- `reviewer`

The code-level permission matrix lives in `src/server/authorization/permissions.ts`; database policy and function checks must remain consistent with it. New permissions should be capability-based rather than spread as repeated role arrays throughout UI code.

## 6.3 Workspace Context

- API requests may carry `x-agency-id` or `x-client-id` when a user has multiple memberships.
- The server confirms the requested context belongs to an active membership.
- Absence of context is acceptable only when exactly one applicable membership can be resolved or the page has an explicit selection flow.
- A future workspace switcher must not store authorization only in the browser.

---

# 7. API Contract

## 7.1 Envelope and Errors

Successful responses:

```json
{ "data": {}, "meta": {} }
```

`meta` is optional.

Errors:

```json
{
  "error": {
    "code": "STABLE_MACHINE_CODE",
    "message": "Safe explanation for the user.",
    "fieldErrors": {},
    "requestId": "uuid-or-propagated-id"
  }
}
```

- Every API mutation carries or creates a request ID and returns it in error responses and headers.
- Validation errors use HTTP 422 with field errors.
- Authentication and authorization use 401 and 403 distinctly.
- Conflicts such as duplicate submission or unsafe deletion use 409.
- Server logs include the request ID but do not expose secrets or raw candidate documents.

## 7.2 Current Route Families

Authenticated agency API:

- `/api/v1/agency/onboarding`
- `/api/v1/agency/profile`
- `/api/v1/agency/members`
- `/api/v1/agency/invitations`
- `/api/v1/clients`
- `/api/v1/clients/[id]`
- `/api/v1/clients/[id]/invitations`
- `/api/v1/workflow-templates`
- `/api/v1/jobs`
- `/api/v1/jobs/[id]`
- `/api/v1/jobs/[id]/publish`
- `/api/v1/jobs/[id]/assignments`
- `/api/v1/jobs/[id]/transitions`
- `/api/v1/applications`
- `/api/v1/applications/[id]/documents/[documentId]/download-url`
- `/api/v1/hiring-requests` and explicit action subroutes
- `/api/v1/communications/[id]/resend`

Public API:

- `/api/v1/public/agencies/[agencySlug]/jobs/[jobSlug]/applications`

External portal API:

- `/api/v1/portal/invitations`
- `/api/v1/portal/requests`
- `/api/v1/portal/jobs`

## 7.3 Next Applicant-Operations API

Milestone 3 should add or complete:

- `GET /api/v1/applications/[id]`
- `PATCH /api/v1/applications/[id]`
- `POST /api/v1/applications/[id]/transitions`
- `GET|POST /api/v1/applications/[id]/notes`
- `POST /api/v1/applications/[id]/assignments`
- `POST /api/v1/applications/[id]/messages`
- `POST /api/v1/applications/[id]/processing/retry`
- Candidate duplicate-review and merge endpoints after the merge rules are specified.

List endpoints use cursor pagination, bounded page size, validated filters, and deterministic sort order. Bulk endpoints must specify per-item outcome and must not allow silent partial destructive changes.

## 7.4 Idempotency

An `Idempotency-Key` is required for invitation sends, request conversion, outbound communication creation, and other externally retryable mutations. Manual job creation currently uses a creation request identifier at the database boundary and must continue to protect against repeated submission.

Idempotency records or unique constraints must bind the key to tenant, operation, and relevant payload identity. Reusing a key with a materially different payload returns a conflict.

---

# 8. Public Job and Application Architecture

Canonical routes:

- Career index: `/careers/[agencySlug]`
- Public job: `/careers/[agencySlug]/jobs/[jobSlug]`
- Dedicated application: `/careers/[agencySlug]/jobs/[jobSlug]/apply`

## 8.1 Publication Eligibility

A job is public only when all are true:

- Agency is active.
- Job status is `open`.
- `accepting_applications = true`.
- `public_slug` is set.
- `published_at` is set.

The public query uses the publishable Supabase client and RLS-limited policies. The secret/admin client may be used only inside the controlled submission service for operations the anonymous role cannot safely perform directly.

## 8.2 Application Submission

The submission service must:

- Resolve the eligible job by agency and job slug.
- Validate standard fields with Zod.
- Validate submitted question IDs against that job.
- Require every configured required answer.
- Accept only PDF/DOCX resume files up to 10 MiB.
- Sanitize file paths and avoid overwrite/upsert.
- Upload to the private `candidate-documents` bucket.
- Transactionally create/match candidate, application, answers, document metadata, and audit event.
- Handle same-candidate/same-job conflict without duplicate records.
- Schedule or attempt acknowledgement after authoritative persistence.
- Return a generic success response that does not expose internal identifiers unnecessarily.

If the database transaction fails after upload, the service must remove or queue cleanup of the orphaned object. If acknowledgement fails, the application remains submitted and communication state records the failure.

## 8.3 Preview

Before publishing, the internal job form must provide a general preview of:

- Agency and organization identity displayed publicly.
- Job title and details.
- Openings, requirements, and deadline.
- Standard applicant fields Recruta always collects.
- Configured screening questions and which are required.
- Public salary visibility if/when configurable.

Preview should use the same presentation components or data contract as the public page to reduce divergence.

---

# 9. Applicant Operations Architecture — Next Milestone

## 9.1 Required Schema Extensions

Introduce forward migrations only after exact product interactions are finalized. Expected additions include:

- `application_notes` for internal notes with author and timestamps.
- `application_status_events` or a normalized event shape for from/to status, reason, actor, and timestamp.
- Optional `application_assignments` if ownership must differ from job assignment.
- Candidate merge/audit support if deduplication moves beyond the current agency-email unique key.
- Structured extraction and screening tables described in Section 10.

Avoid hiding core query fields only inside arbitrary JSON. JSON is appropriate for provider payloads, immutable snapshots, and evolving evidence structures; statuses, ownership, dates, and frequently filtered data remain typed columns.

## 9.2 List Query

The recruiter inbox query must support:

- Agency scope, with optional authorized job scope.
- Candidate/job/organization/email search.
- Status and processing status.
- Recruiter/job ownership.
- Source and received-time range.
- Cursor pagination using a deterministic pair such as `(submitted_at, id)`.

Indexes must be based on the final query plan and verified with representative data. TanStack Table may manage interaction state, but the server owns filtering and pagination for large datasets.

## 9.3 Application Detail

One detail read returns or composes:

- Candidate identity and contacts.
- Job and organization context.
- Current lifecycle and processing states.
- Screening answers.
- Authorized document metadata and signed-download action.
- Notes, assignments, communications, AI evidence, and activity timeline.
- Duplicate warnings.

Do not return internal private notes through portal endpoints.

## 9.4 Transition Rules

Transitions go through a service and transactional function rather than arbitrary status updates. The operation validates:

- Current state and requested state.
- Actor capability and job access.
- Required reason or metadata.
- Placement/opening constraints for terminal success.
- Side effects to enqueue, without making the transition depend on provider delivery.

Every transition records the actor, old state, new state, reason, request ID, and timestamp.

---

# 10. AI-Assisted Processing

This section is planned architecture, not current implementation.

## 10.1 Processing Pipeline

```text
application.submitted
  → document text extraction
  → structured fact extraction
  → requirement-by-requirement evidence mapping
  → completeness and uncertainty checks
  → recruiter review summary
  → application.processing.ready or visible failure
```

The pipeline is asynchronous. The application is immediately visible with `pending` or `extracting` state.

## 10.2 Proposed Data Records

Use versioned records rather than overwriting a single opaque result:

- `document_extractions`: document, extractor version, text/object location, status, failure, timestamps.
- `application_assessments`: application, job requirement version/snapshot, model/prompt version, summary, status, timestamps.
- `assessment_evidence`: assessment, requirement, verdict category, explanation, source excerpt/reference, confidence/uncertainty.
- `processing_runs`: operation, attempt, idempotency key, provider identifiers, timing, failure class, retry state.

Exact tables may be consolidated if the resulting query and audit model remains clear.

## 10.3 Output Contract

AI responses must be validated against a strict schema. Each criterion result should distinguish:

- Supported by evidence.
- Not found in provided material.
- Contradicted.
- Unclear or requires follow-up.

The system must not translate `not found` into `candidate does not have`. Recruiter corrections are stored separately from the original model output.

## 10.4 Safety

- Treat resume and applicant text as untrusted input, including prompt-injection attempts.
- Never let document content change tool permissions or system instructions.
- Do not infer protected traits or use them for ranking.
- Minimize data sent to providers and configure retention/privacy controls.
- Keep prompt/model version and evaluation results.
- Provide a non-AI manual path whenever processing fails.
- Automatic rejection is out of scope.

---

# 11. Events, Background Work, and Automation

## 11.1 Event Boundary

Authoritative domain changes write an event/outbox record in the same database transaction. A worker claims and processes it asynchronously. Provider callbacks update delivery/run state idempotently.

Candidate events include:

- `application.submitted`
- `application.processing_requested`
- `application.processing_failed`
- `application.status_changed`
- `candidate.information_requested`
- `communication.requested`
- `communication.failed`
- `feedback.overdue`

`activity_events` is an audit history, not by itself a complete queue implementation. A durable outbox/queue table or provider integration is needed before automated workflow execution.

## 11.2 Delivery Guarantees

- At-least-once execution with idempotent handlers.
- Bounded exponential retry for transient failures.
- Permanent-failure state and operator-visible recovery.
- Per-operation idempotency key.
- No long-running provider call inside a core database transaction.
- Concurrency controls prevent two workers from processing the same run simultaneously.

## 11.3 Automation Guardrails

- Every automation has trigger, conditions, actions, owner, enabled state, and stop conditions.
- The UI shows why an action ran.
- Consequential or sensitive messages may require approval.
- A user can cancel pending actions when safe.
- Automation never changes a rejected/withdrawn/closed record contrary to current state.

---

# 12. Communications

## 12.1 Channel Abstraction

Define a server-only provider-neutral interface for:

- Recipient and verified contact channel.
- Template/message type and version.
- Rendered subject/body.
- Related entity.
- Idempotency key.
- Provider message ID.
- Attempt and delivery state.

Email via Resend is the initial adapter. Future WhatsApp/SMS adapters should not require changing recruitment state definitions.

## 12.2 Required Behavior

- Never expose provider/API credentials to the browser.
- Sanitize or safely render user-entered content in messages.
- Record pending before or atomically with enqueue.
- Update sent/delivered/failed state from provider results and webhooks.
- Verify webhook signatures and process callbacks idempotently.
- Provide authorized resend without duplicating an already delivered logical message.
- Separate authentication email configuration from application communication.

---

# 13. Observability and Operations

- Sentry captures server and client failures with environment and release context.
- Structured logs include request ID, operation, tenant/resource identifiers where safe, result, and duration.
- Logs exclude access tokens, secret keys, resume contents, raw passwords, and unnecessary candidate PII.
- Health route confirms application availability without leaking dependency secrets.
- Monitor API error rate, public application success, upload failures, processing backlog, AI failures, email delivery failures, and idempotency conflicts.
- Alerts should describe the affected workflow and recovery action, not just infrastructure symptoms.

## 13.1 Environment Configuration

Validated current variables include:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `RESEND_API_KEY`
- `RECRUTA_EMAIL_FROM`
- `NEXT_PUBLIC_SENTRY_DSN`
- Sentry build/deployment variables

New provider variables must be added to `.env.example` with safe placeholders and to server-side Zod validation before use. Local, staging, and production use separate Supabase, Resend, Sentry, and future AI/background environments.

---

# 14. Performance and Reliability

- Authenticated list pages use bounded server-side pagination.
- Avoid fetching full documents or large JSON blobs in list queries.
- Use signed URLs for document access rather than proxying large files through application memory unless security requirements demand it.
- Public pages should render useful content quickly and avoid mandatory client-side data fetching.
- Mutations show pending state and disable repeat controls while still relying on server/database idempotency.
- Database indexes are verified against real filter/sort queries.
- Background backlog and processing age are measurable.
- A provider outage degrades assistance or delivery, not access to authoritative applications and jobs.

Initial service-level objectives should be set during pilot load testing rather than invented in this document.

---

# 15. Testing Strategy

## 15.1 Unit Tests

- Zod payload validation.
- Permission matrix.
- Invitation expiry and revocation.
- Hiring-request and application transition rules.
- Duplicate and idempotency behavior.
- AI output schema and evidence classification.
- Communication render and channel rules.

## 15.2 Database Tests

- RLS for every tenant-owned table.
- Cross-agency denial.
- Revoked membership denial.
- Public job visibility conditions.
- Public submission boundaries.
- Private document access.
- Composite tenant constraints.
- Safe organization/job deletion.
- One application per candidate/job and one conversion per request.
- Privileged function execute grants and internal authorization.

## 15.3 Integration Tests

- Onboarding and invitation acceptance.
- Direct job plus inline organization creation.
- Retry/double-submit idempotency.
- Publish and public application submission.
- Upload compensation/cleanup on partial failure.
- Email failure without state rollback.
- Application transitions and audit history.
- AI processing retry and human correction.

## 15.4 Browser and Accessibility Tests

Critical Playwright flows:

1. Owner verifies email and onboards.
2. Owner invites a recruiter.
3. Recruiter opens one job with multiple openings and optionally creates the organization inline.
4. Recruiter previews and publishes.
5. Candidate opens the job, uses the dedicated apply page, uploads a resume, and submits.
6. Application appears in the agency inbox.
7. Recruiter opens application detail, reviews evidence, changes state, and sends a message.
8. Hiring manager sees only explicitly shared work.
9. Other tenants and revoked users are denied.
10. Duplicate job creation, application submission, and request conversion do not create duplicate records.

Run axe checks on critical pages and explicitly test keyboard operation, focus visibility, form errors, dialogs, icon-only controls, and reduced motion.

## 15.5 Current Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run db:start
npm run db:reset
npm run db:test
npm run test:e2e
npm run build
```

---

# 16. CI, Deployment, and Release

The existing GitHub Actions pipeline has three lanes:

- Verify: install, formatting, lint, types, unit tests, build.
- Browser: Chromium install and Playwright.
- Database: local Supabase, reset, and pgTAP/Supabase tests.

Required release discipline:

- Pinned versions for security-sensitive and integration packages.
- Committed npm lockfile.
- Preview/staging deployment before production.
- Forward-only reviewed database migrations.
- Generated database types updated with schema changes.
- Environment variables configured separately per environment.
- Sentry release/source map configuration verified.
- Synthetic candidate data only in development and staging.
- Rollback or forward-fix plan for application and schema changes.

A production release is not complete until the primary recruiter-to-application flow works in the deployed environment and delivery/monitoring is observable.

---

# 17. UI Engineering Standards

- Use `#5C5AED` for brand actions, focus rings, links, selected navigation, and active workflow markers.
- Use semantic tokens for success, warning, and destructive state.
- Use Solar Linear icons for routine actions, unselected navigation, fields, and metadata.
- Use Solar Bold solid icons only for selected navigation, identity, major empty states, and high-salience confirmation.
- Do not use Solar duotone variants.
- Use the plain `AddIcon` for ordinary create buttons, not a circled add icon.
- Import icons per icon/variant for tree-shaking.
- Decorative icons use `aria-hidden`; icon-only buttons have labels and tooltips.
- Reuse local `src/components/ui` primitives and shared product components before inventing one-off controls.
- Keep Server Components as the default and isolate client state.
- Use React Hook Form and Zod for non-trivial forms.
- Preview and public job display should share contracts and, where practical, presentation components.
- Meet WCAG 2.2 AA for critical flows.

---

# 18. Delivery Sequence

## Milestone 1 — Foundation and Workspace (substantially complete)

Auth, agency setup, memberships, invitations, organizations, request foundation, database security, email foundation, audit, CI, and environments.

## Milestone 2 — Direct Job and Application Intake (substantially complete)

Manual job transaction, inline organization, multiple openings, publication, public career/job/apply routes, application questions, private resume upload, candidate/application foundation, and basic inbox.

Technical hardening still required:

- Complete preview parity with public rendering.
- Audit end-to-end idempotency-key behavior.
- Improve duplicate organization guidance.
- Expand public-form abuse/rate controls.
- Expand database and browser coverage for new flows.

## Milestone 3A — Applicant Operations (next)

- Detail route/service/API and authorization.
- Notes, transition history, and ownership.
- Server-side inbox search/filter/cursor pagination.
- Job pipeline counts and actionable overview queries.
- Duplicate-review design.

## Milestone 3B — AI-Assisted Screening

- Background execution decision and outbox.
- Extraction/assessment schemas.
- Secure document-to-structured-data pipeline.
- Evidence UI, correction, retry, evaluation, and monitoring.

## Milestone 3C — Candidate Communication and Work Queue

- Candidate message API and composer.
- Templates, delivery state, webhooks, resend, and opt-out groundwork.
- Attention queue and first guarded automations.

## Milestone 4 — Hiring Manager Collaboration and Website Intake

- Candidate submission/feedback data model.
- Job-scoped external UI and authorization.
- Public hiring-request endpoint with abuse controls and organization matching.
- Optional requestor invitation.

## Milestone 5 — Interviews, Offers, and Placements

Normalized scheduling, feedback, offer, opening, and placement records plus related communications.

## Milestone 6 — Reporting, Integrations, and Pilot Scale

Operational metrics derived from reliable events, retention/export tools, calendar/mailbox/job-board integrations, and performance work driven by pilot data.

---

# 19. Non-Goals and Constraints

- Do not split the system into microservices during the current milestones.
- Do not make client requests mandatory for job creation.
- Do not model two openings as duplicate jobs.
- Do not require a candidate account to apply.
- Do not expose candidate documents publicly.
- Do not use authentication user metadata for authorization.
- Do not allow AI to make final rejection or hiring decisions.
- Do not couple recruitment state to successful email/AI provider execution.
- Do not add navigation for modules that have no useful workflow.
- Do not introduce a broad automation builder before the first fixed automations are reliable.

---

# 20. Open Technical Decisions

- Durable job/outbox provider: Supabase-native approach, Trigger.dev, or another service.
- AI provider/model and regional/privacy configuration.
- Document text extraction provider or library for PDF/DOCX quality.
- Public form rate limiting, CAPTCHA/turnstile threshold, and abuse storage.
- Candidate identity rules beyond normalized agency email, including shared emails and changed email addresses.
- Merge semantics and reversibility.
- Candidate retention, deletion, export, and legal hold behavior.
- Public agency website deployment: same application, separate application, or configurable hosted surface.
- WhatsApp/SMS provider and webhook security.
- Search implementation when Postgres text search is no longer sufficient.

Each decision must be recorded before the relevant implementation begins.

---

# 21. Definition of Done

A feature is complete only when:

- Product behavior matches the Master PRD.
- Authorization and RLS are both correct.
- Validation and error states are user-safe.
- Material actions are auditable.
- Retry and duplicate behavior is defined.
- Accessibility is verified for the interaction.
- Relevant unit, database, integration, and browser tests pass.
- Generated types and documentation are updated.
- Monitoring can identify failure in staging/production.
- The production build succeeds.

The current program milestone is complete when a recruiter can create and publish a job, receive an application, review it with evidence, communicate with the candidate, and progress it safely without relying on spreadsheets or manual data copying for the core flow.

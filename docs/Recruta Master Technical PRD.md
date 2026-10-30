# RECRUTA

## Master Technical Product Requirements Document

**Version:** 4.1\
**Date:** October 30, 2026\
**Company:** Evenkore  
**Product:** Recruta  
**Document type:** Engineering and system architecture specification  
**Status:** Revised technical source of truth  
**Product source:** Recruta Master PRD v4.1\
**Supersedes:** Recruta Master Technical PRD v4.0

Create-job revision status: the owner authorized P0, then P1 and continued product implementation. Local forward migrations now protect job mutations and store incomplete draft configuration in an authenticated, job-scoped relation; publication validates and compiles that configuration transactionally. Database types are regenerated. The [implementation plan](prd/create-job-flow-and-content-implementation-plan.md) tracks remaining work, including atomic save-and-publish receipts. [ADR 0006](decisions/0006-job-drafting-publication-and-data-boundaries.md) remains the full target, not a claim of deployment.

---

# 1. Purpose and Architecture Goal

This document defines how Recruta is built and how its current foundation should evolve. It reflects the October 24 foundation with the October 30 create-job implementation revision, distinguishing local implementation from remaining target contracts and deployed behavior.

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

## 2.1 Screening Addition (October 25, 2026)

OpenAI SDK `7.43.0` is installed for server-only screening. `screening_runs` consolidates the durable queue, source snapshots, extraction, assessment evidence, provider/version metadata, and retry state. The owner activated gated GitHub Actions scheduling after a synthetic deployed pilot; workspace AI remains opt-in. See ADRs 0001 and 0004 for limits, activation, privacy, and remaining scope.

## 2.2 Planned, Not Yet Installed

- A selected/evaluated screening model and broader document-quality benchmark.
- An external background workflow service if the Postgres lease worker becomes insufficient. Trigger.dev is not a current dependency.
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

Company autocomplete already shares a picker across standalone organization and job creation. Search saved agency organizations first; optional browser-only Brandfetch suggestions remain temporary. Separately retrieved, reviewed enrichment requires server credentials and explicit storage permission. Debounce/cancel/bound searches and preserve immediate manual entry through outages. A selection does not persist a record until confirmed; no LinkedIn integration is assumed. Operator verification of provider licensing, storage rights and spending remains required before enrichment activation. The P5 target adds country names, safe website normalization and advisory near-duplicate guidance without persisting search images.

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

### 4.4.1 Create-job target contract (partially implemented locally)

- Draft completeness is independent of publication: require tenant, organization, title and positive openings; retain safe incomplete description/owner/workflow/question configuration in a protected versioned draft relation. Compile valid public criteria/questions atomically on publication. Do not relax published-question validity to allow blank draft rows.
- Keep employment arrangement, hours, public role details, public compensation representation, and frequently filtered values typed and constrained. Keep private budgets, contacts, references, hiring reasons, sourcing/evaluation notes and agreement context in separately protected relations. Anonymous and employer-portal projections must exclude them at the database boundary.
- Authenticated app job mutations use authorized transactional RPCs. Revoke direct insert/update/delete paths to jobs, requirements, questions, workflow snapshots and assignments only after all callers have compatible replacements. Preserve service-only intake and existing history protections.
- Active agency managers have agency-wide job authority. Active recruiters create roles and edit/publish owned unpublished drafts or explicitly assigned jobs. Managers control cross-user reassignment. Creation alone does not extend applicant access after reassignment; contact selection does not create membership or job access.
- Every edit/publish/lifecycle mutation binds expected version and actor/agency/resource/operation/payload to an atomic receipt. Identical retries return the receipt; changed payload under the same key conflicts. Save-and-publish is one transaction; initial publication and resume are distinct audited operations.
- Workflow selection shows usable stage snapshots. Primary recruiter and the one primary assignment remain synchronized; drafts may be explicitly unassigned, publication may not. Configuration snapshots preserve existing application-stage and screening semantics.
- Questions add number/date/URL/multi-select only after every intake/history/hash/worker consumer supports the versioned answer contract. Legacy string/Boolean answers remain valid; canonical decimal/date/URL strings and string arrays have type-specific validation. Agency library edits/archive never mutate job snapshots or prior answers.
- Closing dates use a frozen job IANA time zone and an exclusive UTC cutoff at the next local day's start. Enforce cutoff consistently in reads, links, public projection/RLS and the submission transaction. Extend through a narrow versioned operation; never resume automatically or claim a placement.
- Migrate additively and preserve legacy values: full-time does not imply permanent; existing public salaries keep intentional visibility; existing deadline instants do not move on agency-zone changes. Review legacy impact before enabling changed intake/visibility rules. Preserve request provenance and one conversion; converted roles target drafts and explicit employer grants.

Local migrations implement the mutation boundary, incomplete draft configuration, canonical arrangement/hours and conditional public role fields. `job_internal_briefs` isolates hiring reason, target start, sourcing text and private budgets; hidden public salary columns are constrained to null. The agency question library has manager-authorized writes, private payload-bound retry receipts, optimistic versions, audit and independent job copies. See [content-pass evidence](verification/create-job-content-pass.md). Atomic job save-and-publish receipts, ownerless drafts, additional role/compensation models, richer answer types and frozen-zone deadline cutoffs remain target work. No deployment is claimed.

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
- `update_draft_job` atomically edits an unpublished draft, its requirements, questions, workflow snapshot, and primary assignment after tenant, role, status, and `updated_at` checks. A request ID makes successful retries idempotent and each edit records an audit event.
- Manual job creation and draft editing persist optional `experience_min_years` and `seniority_level` on the job; these are public posting details and do not alter application screening or stages. Bounds and supported levels are checked in validation and database constraints. Optional salary amounts use `salary_period` (`hourly`, `daily`, `weekly`, `monthly`, or `annually`) alongside currency, and public posting previews show the chosen period. Existing salary records with no period remain valid.
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
- Workspace selection uses a user-scoped `recruta-workspace-<user-id>` HttpOnly, SameSite=Lax cookie (Secure over HTTPS). It is a preference only. Pages and APIs verify active memberships and active workspace status on every request. Explicit `x-agency-id` is validated and takes precedence; unauthorized explicit IDs are denied. Missing or stale preferences use the same deterministic oldest-active-membership fallback for pages and APIs. `POST /api/v1/workspaces/select` validates the payload, origin, current user and active membership before setting the cookie; switching reloads `/app` to discard previous-tenant client state.
- `onboard_agency` permits multiple owned workspaces. An advisory transaction lock and the existing unique slug make same-slug retries safe only for the active owner of an active workspace. Other callers receive a conflict. Creation atomically inserts the agency, owner membership, default workflows, profile if absent, and one creation audit event; it never overwrites the existing personal profile or settings on retry. The authenticated `/app/workspaces/new` form reuses known profile details, and successful creation selects the new workspace.

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
- `PATCH /api/v1/jobs/[id]` requires the explicit agency header and `x-expected-updated-at` value to edit a draft; stale edits return a conflict.
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

## 7.3 Applicant-Operations API

Implemented in the first 3A slice:

- `GET /api/v1/applications` with validated query filters and 25-row `(submitted_at,id)` cursor pagination, exact matching totals, and deterministic descending order.
- `GET /api/v1/applications/[id]` with authorized application, notes, and audit history.
- `PATCH /api/v1/applications/[id]` with a discriminated `action`: `transition`, `assign`, or `note`. Transitions and assignments require `expectedUpdatedAt`; note retries use a client UUID. Responses are private/no-store.

Later milestone endpoints, when their workflows are implemented:

- `POST /api/v1/applications/[id]/messages`
- `POST /api/v1/applications/[id]/processing/retry`
- Candidate duplicate-review and merge endpoints after the merge rules are specified.

Screening uses `GET/POST /api/v1/applications/[id]/screening` for 20 latest reviewer-authorized runs and enqueue/retry with `{ documentId }` plus a UUID `Idempotency-Key`. Evidence context excludes private input metadata/lease tokens. `POST /screening/corrections` appends reviewer corrections without rewriting model output. POST processing requires operator configuration and workspace activation. Protected one-run worker routes are `/api/internal/screening`, `/api/internal/automations`, and `/api/internal/messages`. Application submission commits an intake task through a trigger; no scheduler or live provider is automatically enabled.

List endpoints use cursor pagination, bounded page size, validated filters, and deterministic sort order. Bulk endpoints must specify per-item outcome and must not allow silent partial destructive changes.

## 7.4 Idempotency

An `Idempotency-Key` is required for invitation sends, request conversion, outbound communication creation, and other externally retryable mutations. Manual job creation currently uses a creation request identifier at the database boundary and must continue to protect against repeated submission.

Idempotency records or unique constraints must bind the key to tenant, operation, and relevant payload identity. Reusing a key with a materially different payload returns a conflict.

Create-job target (P2): bind the actor and resource as well, store a protected transactional operation receipt, return saved version/state, and reconcile ambiguous outcomes. The current creation-request unique key and draft audit-key lookup are not full payload-bound receipts. Do not let a changed form reuse a successful edit key, and do not expose a conversion retry receipt before authorization. See ADR 0006 and the baseline inventory for current callable paths.

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

P3 target adds a null closing cutoff or current time strictly before that cutoff. Validate publication readiness under the same transaction/version lock, not only in the browser. At or after closing, reject intake regardless of when the form loaded. Deadline expiry does not mutate job lifecycle/application stages. Legacy cutover requires the impact review in ADR 0006; P0 has not enabled this predicate.

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

P9 target: preview and live career/job/apply pages use the same safe public projection and presentation components, including configured agency logo/fallback, consent, upload rules, exact controls, options/help and required states. Show the private setup summary separately and reject preview submissions at the boundary. The current form's summary preview is not full parity; the existing saved draft preview remains authenticated/read-only.

## 8.4 Public projection and private job data (target)

New internal budget and brief fields must not become reachable through raw anonymous table selects, portal endpoints, serialized page props, or network responses. Public salary visibility therefore requires a safe projection and coordinated reader/grant rollout, not only conditional rendering. Public access continues to use the publishable client with least-privilege grants/RLS or a narrowly designed eligible projection RPC/view. Existing candidate résumé storage remains private. Selecting a hiring contact never grants employer access. Detailed storage, migration and privacy tests are in ADR 0006 and T16 of the implementation plan.

---

# 9. Applicant Operations Architecture

## 9.1 Required Schema Extensions

The first 3A migration adds `applications.owner_user_id` with a tenant-composite membership FK and `application_notes` with author, immutable body, and timestamps. Status and ownership events use normalized `activity_events` metadata (`from`/`to`/`reason`, or `fromOwner`/`toOwner`) alongside actor, tenant, resource, and request ID. Notes never put their body in global audit metadata.

`private.can_review_job` and `private.can_review_application` check active database memberships and real job assignments. Managers have agency-wide review; recruiters are assigned-job scoped. Applications, candidate identity, answers, documents, notes, and application audit events enforce this in RLS. Authenticated direct writes to application/candidate/answer/document tables are revoked; public intake retains its existing trusted service-only path. The public `review_application` RPC is SECURITY INVOKER and delegates to a narrowly granted private transaction with explicit authorization, row locking, stale-version checks, state-machine validation, and atomic audit insertion. No email/provider call runs inside the transaction.

Further extensions remain planned:

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

The durable queue, provider adapters, recruiter review UI, candidate email, and intake automation are implemented as described in ADRs 0001 and 0002. Live activation, scheduling, and provider evaluations remain operator prerequisites; the normalized tables below describe the longer-term target rather than additional current dependencies.

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

## 10.2 Versioned Screening Records

The first backend implementation consolidates the following proposed records into RLS-protected `screening_runs` and private idempotency-key bindings. Atomic request creation snapshots the job, criteria versions, answers, and document metadata; output retains separate extraction and assessment JSON plus provider/version metadata. Authenticated readers cannot access lease tokens or raw input snapshots. Claim/finish functions are service-role-only; the enqueue transaction checks live reviewer access. Details and pending UI/correction/evaluation work are recorded in ADR 0001.

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

- Use `#5C5AED` for brand actions, focus rings, links, and active workflow markers. Keep broad surfaces neutral: #F8F8F8 sidebar/canvas, white work area, #E8E8E8 borders, and white selected navigation with dark text and icon.
- Reserve filled primary buttons for a page's main action or form's main submission. Use the shared `outline` variant for supporting/repeated CTAs, empty-state actions, and alternate Save draft actions, not `secondary`. Preserve ghost/link navigation and destructive semantics.
- Overview summary cards form a compact bordered strip with distinct cells and real intake mini charts. Interface copy omits taglines and repeated explanations; retain meaningful metadata, task guidance, validation, consent, and destructive-action consequences.
- Use semantic tokens for success, warning, and destructive state.
- Use the shared 6 px radius base: 6 px controls/navigation, 10 px cards/overlays, and 4 px compact nested elements. The brand lockup pairs a 28 px square mark with a 22 px semibold Geist wordmark and a 10 px gap. Navigation/toolbar icons use 20 px, compact actions use 16 px, and search uses 18 px.
- Use Solar Linear icons for routine actions, inactive sidebar navigation, fields, and metadata; selected sidebar items use the matching Bold solid variant on a neutral gray surface.
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

Overview accepts a validated `range` query parameter: `all`, `24h`, `7d`, `14d`, or `30d` (default). Missing, invalid, or repeated values fall back to the last 30 days. All time remains an explicit `range=all` choice. The Server Component reads exact tenant/RLS-authorized counts through `getWorkspaceOverview`/`getOverviewSummary`. Cards are Active jobs (`status=open`), Applications received (all stages), In review (`status=in_review` only), and Shortlisted (`status=shortlisted`). Rolling UTC windows are bounded by a single server timestamp; jobs use `created_at`, applications use `submitted_at`. Counts show current state of that intake cohort, not historical transitions. Work queues remain unfiltered. The desktop toolbar holds the Overview title and New job; subordinate Hiring activity and a segmented button group sit above a four-cell bordered strip. The range buttons update the URL without resetting scroll or dropping unrelated query parameters. `getOverviewTrends` makes eight exact-count queries per metric, plus one comparison count per metric, with the same current status and intake-date rules as the cards. For `all`, two tenant-scoped earliest-date reads establish a full-history chart window; the latest bucket is unbounded above to match all-time totals. Charts render 24 dotted columns from the eight measured buckets, with hover/focus details for exact bucket count and time span. The small all-time metric reports last-30-days intake separately. Chart failure leaves counts and work queues usable. Omit the Overview greeting. Selected navigation uses a white surface and dark text with a purple solid icon. Never label application counts as unique candidates or infer placements from late-stage applications.

The lower dashboard uses `getOverviewJobs` for unfiltered authorized job history, current open roles, latest draft, and eligible shareable job. This avoids filtering only the five newest jobs in memory. The inbox reads received/in-review applications oldest-first with ID tie-breaking and shows the exact outstanding count, not preview length. Request queries exclude existing job conversions through an embedded-resource anti-join; the manager-only panel excludes client-waiting clarification states. Needs attention is conditional on actual exceptions. Overview shows its first real attention item as a compact review banner; the user can dismiss it for the current browser session without changing the underlying issue. Session storage dismissal IDs are scoped to agency and user. The Active jobs preview uses a compact table with organization, application review progress, openings, deadline, and status. Section headings sit above their bordered content. `OverviewWork` composes first-use, draft, published-waiting, quiet, and recruiter-assignment states without changing the four summary cards. No permanent Up next or empty request/attention panels remain. The secondary column exists only when useful request content exists. Dedicated attention and request pages retain their own empty states.

Agency settings supports upload, replacement, and removal of a public agency logo through `POST/DELETE /api/v1/agency/logo`. Only active owners/administrators can mutate it. Requests pin the originating agency, bound multipart bodies, and validate PNG/JPEG/WebP MIME types, signatures, and a 2 MiB limit. Immutable object paths use the existing public `agency-logos` bucket; candidate storage stays private. `update_agency_logo` verifies role, tenant path and uploaded object, checks the expected previous path under a row lock, and atomically updates metadata and audit history. Cleanup failure does not undo a successful update. A transport failure can leave an unreferenced upload for later cleanup; it must not delete an upload whose commit result is unknown.

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

## Milestone 3A — Applicant Operations (core implemented; hardening continues)

- Detail route/service/API and authorization.
- Notes, transition history, and ownership.
- Server-side inbox search/filter/cursor pagination.
- Job pipeline counts and actionable overview queries.
- Duplicate-review design.

The first four items are implemented. Hardening adds agency-timezone received-date filters, searchable cursor-paginated job options, independent history cursors, bounded file/signature/answer validation, private-upload recovery, payload-bound public application retries, and hashed per-job/hour abuse limits. Submitted identity is snapshotted per application; existing candidate names are preserved. Agency-normalized email uniqueness and one application per candidate/job prevent duplicates. Advanced identity merging and bulk actions remain follow-up work. Placement is not a review transition until opening-level placement records exist.

Verification uses unit tests, rollback-only pgTAP fixtures, and opt-in authenticated Playwright fixtures (`RECRUTA_E2E_DATABASE=1`). `npm run test:e2e:local` binds build and browser tests to the disposable local Supabase stack with providers disabled. Browser fixtures use UUID-namespaced synthetic users/workspaces and guarded cleanup. CI runs authenticated browser coverage independently of hosted secrets. Docker is required for local database replay and tests.

## Milestone 3B — AI-Assisted Screening

Backend and review UI implemented: strict schemas/prompts, OpenAI adapter, quote/criterion validation, durable queue, idempotent history, evidence and extracted text, append-only corrections, extraction checkpoints, and workspace opt-in. GPT-6 Luna passed six screening cases, simple PDF/DOCX checks, and the deployed pilot with a real Delivered callback. The owner configured the deployed workers and approved the two encrypted credentials for gated GitHub Actions scheduling (ADR 0004). Workspace AI remains opt-in. Broader model/document evaluations and real-data privacy approval remain outstanding; scheduled runs and queue backlog require monitoring.

- Background execution decision and outbox.
- Extraction/assessment schemas.
- Secure document-to-structured-data pipeline.
- Evidence UI, correction, retry, evaluation, and monitoring.

## Milestone 3C — Candidate Communication and Work Queue

The current slice implements provider-neutral message intent in `communications`, fixed candidate templates/composer/history, pending-message cancellation, bounded leased delivery, stable Resend idempotency, signed/deduplicated ordered callbacks, bounce/complaint suppression, durable intake tasks, acknowledgement preparation, and scoped review/failure queues. Separate server flags and workspace preferences gate execution. A bounded operator runner and activation runbook are in ADR 0002. Provider scheduling, live deliverability, and operational alert configuration remain deployment prerequisites.

- Candidate message API and composer.
- Templates, delivery state, webhooks, resend, and opt-out groundwork.
- Attention queue and first guarded automations.

## Milestone 4 — Hiring Manager Collaboration and Website Intake

The local collaboration implementation uses RLS-backed `candidate_submissions` and append-only `submission_feedback`, narrowly scoped transactional RPCs, explicit job grants, private résumé URLs, verified portal membership context, and invitation acceptance that cannot resurrect revoked access. Recruiters share only from assigned jobs. Portal reads expose curated job/submission data, never internal applications, notes, AI assessments, or candidate records. Invitation delivery uses generated Auth links through the SSR callback and the Resend adapter. See ADR 0005 for rollout and boundaries.

Remaining website work:
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

- Scheduler deployment for the implemented Supabase/Postgres screening queue; external workflow service only if operational needs justify it.
- OpenAI model selection and regional/privacy configuration; OpenAI is the selected provider.
- PDF/DOCX extraction quality evaluation and whether an independent parser is required beyond the initial OpenAI file-input adapter.
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

## Implemented organization lookup and workspace utilities

- `GET /api/v1/search?q=` returns up to five jobs, five applicants, and five organizations. Queries are trimmed, bounded to 2–100 characters, escaped for PostgREST filters, deterministically sorted, tenant-filtered, RLS-backed, and `private, no-store`.
- `GET /api/v1/clients/search?q=` searches up to eight non-archived saved organizations by name/website. Existing company matches are preferred; name and domain warnings also appear during manual entry.
- `POST /api/v1/companies/lookup` accepts a validated domain, checks the agency for an existing match before enrichment, and calls only the fixed Brandfetch API endpoint. It requires an active agency membership, uses a server-only secret, has an eight-second timeout, and fails back to manual entry. No private contacts or internal notes are sent.
- Company suggestions require only `NEXT_PUBLIC_BRANDFETCH_CLIENT_ID` (or the server-side alias `BRANDFETCH_CLIENT_ID`, explicitly passed as a public prop). Search remains independent of paid enrichment. Selecting a suggestion to fetch and save company details additionally requires `BRANDFETCH_API_KEY` and `BRANDFETCH_PERSISTENCE_ALLOWED=true`; leave enrichment disabled until the operator confirms plan-specific storage/logo rights and configures provider spending limits. Never pass the API key to a Client Component. No provider account or paid subscription is created automatically. Nullable search names/icons must not discard valid domain matches.
- Brand Search runs directly in the browser with debounce, cancellation, and no application caching/persistence. Its temporary logo URLs are hotlinked only in suggestions. Saved company details come from the separate Brand API, never the Search response. Street addresses are manual when unavailable.
- `clients.company_profile` stores reviewed address, HTTPS logo URL, and enrichment source/identifier as an agency-private JSON object; anonymous grants do not include this column. Provider logos remain external URLs with a fallback if unavailable. No logo upload/proxy pipeline is introduced in this slice.
- `create_organization` atomically saves an organization, optional contact, and audit event. Active role checks, advisory locks, and a tenant/request-key unique index protect retries and exact-name duplicate creation. Existing records are returned without silent edits. Inline `create_manual_job` calls the same operation within its job transaction.
- `PATCH /api/v1/account` validates a name and updates only the authenticated user's profile under RLS. Password changes use Supabase Auth. `/auth/logout` supports JSON feedback for the shared account menu and retains POST/303 fallback behavior.
- The desktop shell has a 56 px toolbar with the current destination, a boxed notification bell before inline non-modal Base UI workspace search, and contextual New job last on Overview and Jobs. Ctrl/Cmd+K focuses search on desktop. Mobile retains navigation, workspace switching, the same account menu in the header, and the four-destination bottom bar. Company selection also uses Base UI Combobox. The two-line desktop account control is anchored at the bottom of the sidebar and opens personal account/security links, public careers access, and destructive logout. The 208 px #F8F8F8 sidebar starts with the active agency name and public logo, falling back to a 24 px purple initial placeholder. The local Evenkore logo asset is used only for the Evenkore slug when no uploaded logo overrides it. A muted compact up/down glyph ends the workspace switcher; navigation rows are 36 px, with a 60 px collapsed state. Role-gated Team and Settings follow recruiter workflow destinations beneath one faint divider and without section labels. The workspace selector reuses the menu primitive with active memberships supplied by the server. Membership-scoped queries return logo paths for each active workspace, and the layout converts them to public Storage URLs for their respective menu rows. Routine/inactive icons remain Solar Linear; active navigation uses a dark solid icon on white.
- Jobs uses the desktop toolbar destination as its sole page title and places New job after search as the last toolbar action. `/app/jobs?new=1` opens a four-stage Base UI dialog over the Jobs list; `/app?new=1` opens it over Overview and closes back to Overview; `/app/jobs/new` redirects to the Jobs modal state for existing links. At wide desktop sizes the dialog caps at 940 × 760 px. Its 271 px left rail and inset rounded right pane share one outer container. The right pane keeps a fixed progress header and footer around a scrollable form pane; the progress indicator sits directly on the white header. Saved organization options include `company_profile.logoUrl` for the selected state, and the picker displays status copy only for search progress or outcomes. Jobs and Overview render the same metric strip component and interactive dotted chart. Jobs metrics show open jobs, sum of positions to fill on open jobs, open jobs due in seven days, and filled jobs, all grouped by current job status and creation date within the selected rolling window or full history. Each bucket and previous comparison uses real jobs. List status totals are independent all-time counts; review-progress columns use exact current application status counts, counting an application reviewed after it leaves Received unless it was withdrawn. Deadline and recruiter filters are applied server-side. The filter popover sits above the table without clipping and shows selected deadline and recruiter options.
- The top toolbar mounts the existing `GET /api/v1/notifications` feed. Read IDs remain device-local and scoped to agency and user. Overview and dedicated work queues continue to expose actionable applications, requests, and failures.
- Active branding uses the small native vector `public/brand/recruta-symbol.svg`: a #111111 square with an 8-unit radius in a 40-unit viewBox and a white abstract fit path formed by two complementary corners, representing candidate–role alignment. `src/app/icon.svg` contains the identical vector. The shared logo component pairs it with an accessible Geist wordmark. Previous supplied PNGs, ribbon wrapper, and starburst ICO remain legacy assets only; they are not active favicon fallbacks.
- Database tests cover contact-free/atomic creation, retry reuse, inline profile copying, multi-opening jobs, rollback of failed jobs, anonymous denial, cross-tenant RLS, and revoked access. The intentionally authenticated `SECURITY DEFINER` creation API is guarded by live membership checks and explicit execute grants; its advisor warning is expected, not an unguarded permission bypass. The existing disabled leaked-password-protection warning still requires operator review.

## Completion criteria

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

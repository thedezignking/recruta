# Create-job P0: authority inventory, compatibility and local baseline

Date: 2026-10-30 (Africa/Lagos). Scope: first implementation package P0 in the [complete plan](../prd/create-job-flow-and-content-implementation-plan.md). Target decisions are recorded in [ADR 0006](../decisions/0006-job-drafting-publication-and-data-boundaries.md) and master PRDs v4.1. No job UI, API, database behavior, provider activation or deployment changes are part of P0.

## 1. Preservation and evidence boundary

- Starting HEAD: `748558f6ef814c43d91786243434dac109ced8a2`, branch `main`.
- [Pre-edit manifest](create-job-p0-preexisting-worktree.json) records path, status, bytes and SHA-256 for 100 pre-existing changed/untracked files. It includes the previously prepared implementation plan. It is an integrity manifest, not a recoverable content backup or a commit.
- Final integrity comparison: all 97 original files outside the two intentionally updated master PRDs and implementation plan match their original SHA-256; zero unexpected changes. Code, package files, user tests, migration files and existing output artifacts were preserved byte-for-byte.
- Both master documents already had user edits. P0 changes were layered onto those files; no reset/checkout/rebase/commit or deletion was used. Existing code, package files, migration files and tests remain owned by the user.
- Three untracked migration files (`20261029152536`, `20261029152651`, `20261029152822`) and generated-type edits are part of the starting state. They affect source replay; their applied status on any database is unknown.
- Inventory below is the **expected source-replay state**, including those files, not a claim about effective deployed grants. Docker is unavailable locally, so catalog execution, replay and negative write reproduction could not be completed. No hosted database was substituted.
- [Read-only catalog SQL](create-job-p0-permission-inventory.sql) is supplied to inspect installed migrations, inherited table/column privileges, RLS policies, all relevant function overloads/execute grants, triggers and default ACLs once the disposable local stack is available. It reads catalogs only and rolls back; it is not a migration or a passing test result.

## 2. Effective-grant expectations from source

The foundation ends with `grant select, insert, update, delete on all tables in schema public to authenticated` (`202610230001_phase_one_foundation.sql:698`). Later policies restrict rows, but no subsequent repository migration revokes authenticated writes to the five job aggregate tables. Questions also receive explicit authenticated CRUD in `20261023194831_recruiter_job_application_foundation.sql:426`. Standard inherited/platform defaults must still be inspected in the actual catalog.

| Relation | Authenticated expected writes after source replay | Latest controlling write predicates | Public exposure |
| --- | --- | --- | --- |
| `jobs` | INSERT/UPDATE/DELETE | `20261024010437` policies permit active owner/admin/manager/recruiter agency roles; not job-assignment scoped. | `20261024014035` eligible published-row RLS and explicit SELECT columns. Salary is readable. New experience/seniority/period columns lack explicit anon grants in their adding migrations. |
| `job_requirements` | INSERT/UPDATE/DELETE | `20261024010437` active recruitment agency roles, not job-scoped. | Eligible published-job SELECT projection. |
| `job_application_questions` | INSERT/UPDATE/DELETE | `20261024010437:13` replaces all-write policy with three `is_active_agency_member` predicates, not job scope. | Eligible published-job question columns. |
| `job_workflow_stages` | INSERT/UPDATE/DELETE | `20261024010437` active recruitment agency roles, not job-scoped. | No explicit anon grant in these migrations. |
| `job_assignments` | INSERT/UPDATE/DELETE | `20261024010437` managers only, but direct writes still bypass invariant/audit handling. | No explicit anon grant. |
| `workflow_templates`, `workflow_stages` | Adjacent template-maintenance writes exist | Owner/admin policies; job aggregate revocation must not indiscriminately revoke unrelated template administration. | No public-template dependency for applicant intake. |

`20261026180009_recruiter_hardening_and_collaboration.sql` updates `is_active_agency_member`/`has_agency_role` to include active agency state and live membership. It updates job/requirement/workflow reads for explicit employer access and revokes writes to employer-grant tables, but does not revoke the above aggregate writes. This later helper replacement must be preserved; the older foundation helper alone is not the effective source definition.

Current agency members can read job-list/detail metadata agency-wide. Applicant review is a narrower `can_review_job` boundary. Do not confuse broad job metadata reads with permission to read applicants or newly added private brief data.

## 3. Production writer/caller inventory

All discovered application job aggregate writes route through `src/server/services/jobs.ts` or the request conversion service. Search included `src`, `scripts`, `tests`, and migrations, including dynamic fixture-table writers. Service reads are not replacement write dependencies.

| Operation | App caller / route | Latest source definition and effects | P1/P2/P3 work required |
| --- | --- | --- | --- |
| Create manual job | `jobs.ts:310`, `POST /api/v1/jobs`; `new-job-form.tsx` | `20261029152822:6`; SECURITY DEFINER, empty search path, authenticated execute, auth/active agency role, client/workflow/member checks; inserts job, criteria, questions, workflow snapshot, primary assignment and audit. Calls `create_organization` for inline creation. | Restrict recruiter assignment to self; validate eligible assignee role; validate direct-RPC shapes; retain atomic organization rollback. P2 adds payload-bound receipt and draft split. |
| Edit draft | `jobs.ts:385`, `PATCH /api/v1/jobs/[id]`; form | `20261029152822:132`; locked draft, creator/assignment or manager check, expected timestamp, audit request-key lookup; replaces requirements/questions/workflow and primary assignment. | Preserve job authority but prevent non-manager reassignment bypass; safely handle explicit unassigned state. P2 binds payload and response version and retains incomplete rows. |
| Publish | `jobs.ts:363`, `POST /api/v1/jobs/[id]/publish`; `publish-job-button.tsx` and form | `20261023194831:301`; active agency recruitment role; allows draft/open/on-hold; updates acceptance/slug/first publication/time; inserts publication audit every call. | Restrict recruiter job authority in P1. P2/P3 enforce reviewed version/readiness, first-publication idempotency and distinct resume. |
| Assign | `jobs.ts:453`, `POST /api/v1/jobs/[id]/assignments` | `202610230002:407`; manager role; active target member; upserts assignment and updates job primary pointer. | Ensure target is eligible recruitment role and old primary is demoted/removed consistently; one primary; prevent direct writes. Add concurrency/receipt in P2. |
| Transition | `jobs.ts:470`, `POST /api/v1/jobs/[id]/transitions`; `job-lifecycle-actions.tsx` | `202610230002:444`; manager OR matching assignment. Open/on-hold transitions; non-open acceptance false; open preserves prior acceptance. | Assignment-only branch needs explicit active actor/agency/role check (old assignment must not authorize revoked user). P3 resume must set acceptance true when eligible; timestamp/receipt in P2. |
| Delete safe empty manual job | `jobs.ts:486`, `DELETE /api/v1/jobs/[id]`; lifecycle component | `20261026180009:412`; authenticated, active authorized manager/recruiter creator/assignment; source manual, no applications or collaboration history; delete + audit. | Preserve history checks and explicit actor/tenant. Limit creator-only permission to an owned unpublished draft per target matrix; direct DELETE must be denied. |
| Convert hiring request | `hiring-requests.ts:165`, `POST /api/v1/hiring-requests/[id]/convert-to-job` | `202610230001:545`; SECURITY DEFINER, empty search path, authenticated execute. Returns existing job before request/membership authorization; otherwise approved request + manager/workflow/member checks; inserts open job, criteria, workflow, assignment, automatic access for active organization members and audit. | Authorize before any retry receipt; compare verified agency/resource; preserve one conversion/provenance. Replace implicit employer grants and target draft creation. Route also calls existing `notifyHiringRequest`; do not introduce or send test notifications. |

Supporting dependencies:

- `create_organization` (`20261024153909`) is the transactional inline/standalone organization boundary with exact-name reuse, optional contact, advisory lock and audit. Preserve retry safety and no unsolicited contact edits on reuse.
- `private.can_review_job` and `private.can_access_client_job` (`20261026180009`) authorize review/collaboration reads. Keep explicit job grants and immediate revocation; new private-brief reads need creator-draft or assigned/manager checks rather than only agency membership.
- `submit_public_application`'s current hardened definition is in `20261026180009`; it locks eligible job, binds receipt/payload and writes candidate/application/answers/document/audit. It reads jobs/questions rather than modifying them. P3 deadline and P10 typed-answer changes must preserve this service-only path and private upload recovery.
- Application intake trigger/processing workers operate on applications/queues and screening snapshots. No additional production job-table writer was found in `scripts`; do not revoke their service-only application/queue permissions.
- Existing `getJob`, overview/search/job-option/notification services read aggregate records. Portal reads are intentional projections, not authorization for raw internal data. Public career/job services use the publishable anonymous client and explicit column lists.
- Versioned job routes frequently verify an agency context but pass only the resource ID to a service. Target implementations must compare resource agency against verified request agency and repeat actual authorization inside RPCs.

## 4. Fixture writers and regression dependencies

| Location | Usage | Treatment after revocation |
| --- | --- | --- |
| `tests/e2e/workspace-summary.spec.ts:93,118` | Signed-in actor calls creation and publish RPCs; service/admin cleanup deletes fixtures. | Keep actor authorization realism; migrate request/version inputs as needed. Keep cleanup isolated and synthetic. |
| `tests/e2e/collaboration.spec.ts:44,116,394,491` | Dynamic admin fixture inserts, manual admin publication and agency-scoped cleanup. | Do not mistake service-role fixture mutation for permitted recruiter mutation. Add a separate real recruiter publication path. |
| `tests/e2e/applicant-operations.spec.ts:39,82,91,387` | Dynamic admin insert job/assignment fixtures and guarded cleanup. | Preserve service-only setup/cleanup and live reviewer RLS assertions. |
| `supabase/tests/draft_job_edit.test.sql` | Fixture rows inserted as privileged test session; calls draft-edit function and changes status for negative test. | Keep rollback-only fixtures; add explicit SET ROLE authenticated/anon tests for forbidden writes. Current privileged fixture inserts alone do not test grants. |
| `supabase/tests/organization_creation.test.sql` | Calls create job for atomic organization/retry/rollback checks. | Update request contracts only when corresponding phase ships; preserve reuse/rollback assertions. |
| `supabase/tests/phase_one_rls.test.sql` and other pgTAP fixtures | Function existence, cross-tenant/security/domain fixture setup. | Add meaningful negative table/RPC tests without weakening earlier safety coverage. |

## 5. Compatibility findings and required release order

| ID | Finding | Phase / release rule |
| --- | --- | --- |
| P0-C01 | New public query selects `experience_min_years`, `seniority_level`, `salary_period`, while anonymous column grants stop at the earlier publication migration. The three adding migrations grant RPC execute only. | P1 must test anonymous reads after clean replay and fix only the intended public projection/columns. This is static evidence; not reproduced against a running DB. Never use table-wide SELECT as a shortcut. |
| P0-C02 | Owner/workflow schema fields are optional, but manual create SQL currently fills actor as lead and inserts a primary assignment. Null/empty owner is not yet deliberate Assign later. | P2 distinguishes omission/default from explicit null; P3 requires eligible active owner at publish. |
| P0-C03 | Draft save requires 20-character description and workplace enum through API/UI. Draft SQL independently checks completeness. Questions require valid labels even while being drafted. | P2 private draft-config migration and schema split before P4 exposes early Save draft. |
| P0-C04 | Draft retry audit lookup and create request-key unique index do not bind changed payload or actor in the same manner as public intake receipts. | P2 actor/tenant/operation/resource/payload receipt. Preserve old successful operations; no key reuse after successful edit. |
| P0-C05 | Saved draft publication uses PATCH then POST with old initial version/request state. | P2 atomic save-and-publish and recovery response contract before refined review UI. |
| P0-C06 | `transition_job` accepts the existence of an assignment on one branch without active membership; reopening keeps previously false acceptance. | P1 fixes live authorization; P3 repairs resume semantics and deadline gating. |
| P0-C07 | Request conversion returns existing IDs before authorization and implicitly grants employer access, conflicting with target draft/readiness and ADR 0005 explicit-access intent. | P1 closes authorization/access gaps before tightening table writes. P2/P3 coordinate converted draft/readiness behavior; no automatic grant restoration. |
| P0-C08 | Existing salary is intentionally public through old anon columns; protected budgets/briefs would leak if simply added to the same exposure. | P1 defines projection; P5/P7 add protected data only after safe storage and grant rollout. Backfill old public salary visibility deliberately. |
| P0-C09 | Old employment strings conflate hours/arrangement; old salaries may have no period; seniority has five codes; old UTC deadlines have no saved zone/date policy. | P6/P7 additive maps without inventing permanence/period; P3 review cutoff impact and preserve instants. |
| P0-C10 | Published question schemas and answer snapshots feed history and screening; new arrays/types change parsing and receipt hashes. | P10 compatible consumers deployed before new types enabled; never rewrite historical questions/answers/runs. |
| P0-C11 | Actual modal currently caps at 1400px/92vh versus older technical description 940×760px. | P4/P9 reconcile after visual checks; P0 records the mismatch and does not pick an unverified new size. |

Exact implementation sequence: inventory/replace affected writers → verify active/job/tenant authority → revoke direct mutations and align public reads (P1) → additive draft/receipt/atomic-write model (P2) → readiness/deadline/initial-publication/resume (P3) → safe form/brief/compensation data and UI (P4–P8) → shared exact preview (P9) → compatible typed answers (P10) → snapshot library (P11) → full regression/legacy rehearsal and deployment handoff (P12).

Security repairs can ship before the entire content program. Every enabled slice needs its dependent writer/reader contracts deployed. Never restore broad grants as rollback. No legacy real-data impact counts are claimed here; that release gate requires separately authorized environment access.

## 6. Local baseline results

These checks assess the pre-existing working tree, not a completed application feature. No tests were added solely to exercise Markdown.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| `npm run format:check` | Failed, pre-existing | `.claude/launch.json` and `src/components/jobs/new-job-form.test.tsx` fail Prettier. Neither file was reformatted by P0. |
| `npm run lint` | Passed | ESLint exit 0. |
| `npm run typecheck` | Passed | Standalone `tsc --noEmit` exit 0. An earlier combined shell command's final exit 1 was from Supabase/Docker inspection, not TypeScript; standalone rerun isolates this result. |
| `npm run test` | Passed with skips | 50 files passed, 1 skipped; 186 tests passed, 14 skipped; 438.31 seconds. Skipped/live tests were not executed or represented as passing. |
| `npm run build` | Passed | Next.js 16.4.2 production compilation, TypeScript, static generation (57/57) and optimization completed; exit 0. No deployment. |
| Scoped document formatting and whitespace | Passed | Prettier on both masters, ADR 0006, plan, baseline and manifest; `git diff --check -- docs` clean. Read-only catalog SQL was reviewed but not executed against PostgreSQL. |
| `npm run db:test` | Blocked / failed preflight | CLI reports ECONNREFUSED on `127.0.0.1:54322`. No local Postgres; no DB assertion executed. |
| `npm run test:e2e:local` | Blocked / failed preflight | Isolated wrapper fails at `supabase status -o json`; Docker Linux-engine pipe absent. No authenticated browser fixture executed. Used safe wrapper instead of unisolated `test:e2e`. |
| Catalog inventory / clean replay | Not run | Same unavailable Docker/Postgres. Source inventory is not effective live-grant verification. |

Tooling: installed Supabase CLI 2.122.0. Help/status inspection initially hit sandbox access errors writing CLI telemetry and reading Docker configuration. Read-only elevated inspection succeeded in reading help but confirmed the Docker daemon is unavailable (`dockerDesktopLinuxEngine` pipe missing). No automatic-approval rejection occurred. No Docker app launch, local/staging reset, hosted query, schema push, live email, external invitation or provider call was attempted.

To finish DB verification in P1: bring up the complete disposable local Supabase stack using the repository instructions and discovered CLI help; the existing lightweight `db:start` intentionally excludes Auth/API/Storage and does not alone satisfy the browser wrapper. Replay forward migrations locally, execute the supplied catalog SQL and negative write tests, then run `db:test` and `test:e2e:local`. Do not point these fixtures at staging.

## 7. P0 completion and remaining gates

- Target authority matrix, draft/publication split, privacy, receipt/version semantics, deadline rules and compatibility order are recorded in ADR 0006 and master PRDs v4.1.
- All decisions D01–D18 remain traceable to the full plan; recording the target during P0 does not authorize implementation of P1–P12 automatically.
- Source writer/grant inventory and fixture dependencies are documented above, including newly discovered compatibility gaps.
- Pre-existing changed files were inventoried before edits. Final integrity check confirmed all 97 originals outside the intentionally updated masters and plan match, with no unexpected changes.
- Local lint/type/unit baseline is established; formatting is pre-existing red; DB/browser/catalog checks are explicitly environment-blocked. P0 evidence can be handed off with those limits; no claim of repaired security or complete release readiness is made.
- P1 must start by verifying effective catalog state with local Docker available, implementing authorized writers and negative role tests, and repairing identified conversion/assignment/revocation/public-read gaps before revoking broad writes.

## References

- [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security): row policies supplement relation/column privileges; inspect both.
- [Supabase function guidance](https://supabase.com/docs/guides/database/functions): explicit execute privileges and controlled privileged execution matter for RPCs.
- Repository migration definitions cited above are the authority for static behavior. Runtime database/catalog results remain unverified until the local stack can run.

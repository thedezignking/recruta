# ADR 0006: Job drafting, publication and data boundaries

Date: 2026-10-30 (Africa/Lagos).

Status: partially implemented locally following authorization of P1 and the improved product flow. Mutation-boundary repairs and protected incomplete draft configuration are implemented; the remaining operations below are target architecture. No deployment is claimed. The [complete implementation plan](../prd/create-job-flow-and-content-implementation-plan.md), decisions D01–D18, tracks scope and remaining work. The [P0 baseline](../verification/create-job-p0-baseline.md) is historical evidence.

## Context

The current form uses one completeness schema for drafts and publication. Existing SQL offers transactional job creation and draft editing, but broader direct table grants/policies bypass those APIs. Publication checks agency role rather than recruiter job authority and does not bind expected version or payload. Private budgets and briefs cannot be added safely to public-selectable job columns without a public projection boundary. New answer types and deadlines also affect candidate intake, history, queued screening and retries.

The product needs rapid incomplete capture and deliberate publication without changing the modular monolith, candidate/application separation, human hiring decisions, explicit employer grants or existing communication/AI activation boundaries.

## Decision 1: Drafts and publication use separate contracts

A persisted draft requires an active authorized agency context, a valid non-archived organization, a title of 2–160 characters and positive bounded openings (default one). Description, workplace type, owner, workflow and custom rows may remain incomplete. All saves validate safe types/lengths/bounds and tenant integrity. Organization-free and auto-untitled drafts require a separate decision.

Store incomplete question/criterion configuration in a protected versioned job-draft relation with stable local IDs. Compile valid public question/criterion rows during atomic publication. Do not weaken published-table constraints to store blank draft controls. Preserve existing complete drafts and question/criterion identifiers during conversion to this representation.

Publishing validates the reviewed version under lock: organization/title/description, employment arrangement, workplace type and location/eligibility, active eligible lead, compatible usable workflow snapshot, all configured question shapes and required-answer feasibility. Optional criteria, custom questions, deadline and benefits do not become mandatory. Content recommendations are warnings, not hiring decisions.

Keep four UI steps, explicit Save draft, guarded dismissal, linked error summary and exact public preview. Autosave needs a later recovery/retention decision.

## Decision 2: Job mutation authority is enforced inside the database boundary

Definitions: **manager** means active owner, administrator or recruitment manager in an active agency. **assigned recruiter** means an active recruiter with a current tenant/job assignment. **owned draft** means an unpublished draft created by that active recruiter. Creation alone does not retain applicant access after reassignment.

| Operation | Manager | Assigned recruiter | Creator of an otherwise unassigned unpublished draft | Other recruiter | Employer / anonymous |
| --- | --- | --- | --- | --- | --- |
| Create job | Yes | Yes, as recruiter | Yes, as recruiter | Yes, as recruiter | No |
| Save/edit unpublished draft | Agency-wide | Own assigned job | Yes | No | No |
| First publish / reviewed save-and-publish | Agency-wide | Own assigned job | Yes, with valid active lead and workflow | No | No |
| Pause/resume or extend closing date of published job | Agency-wide | Own assigned job | No creator-only access | No | No |
| Assign another lead / manage assignments | Agency-wide | No | No | No | No |
| Choose self / Assign later while drafting | Yes | Self or unassigned on own draft only | Self or unassigned on owned draft | On new draft only | No |
| Delete safely empty manual job | Agency-wide, domain checks | Own assigned job, domain checks | Owned draft, domain checks | No | No |
| Convert approved hiring request | Agency-wide | No recruiter-only permission | No recruiter-only permission | No | No |
| Manage workspace defaults / question library | Agency-wide | Use/read only | Use/read only | Use/read only | No |

All writes additionally require resource/related-record tenant consistency, active membership/agency, allowed lifecycle, version/receipt where applicable, and atomic audit. A recruiter cannot assign another primary recruiter through a creation/edit payload to bypass the manager-only assignment endpoint. If a creator hands off a published role and loses assignment, creator history grants no applicant or published-job mutation access. Existing agency job-list visibility is not blanket private-brief access.

Revoke authenticated direct insert/update/delete on jobs, requirements, application questions, workflow snapshots and assignments after authorized replacement writers are ready. Review column grants, inherited/PUBLIC privileges and overloaded function signatures, not just policies. Keep public functions as narrow granted wrappers where needed; use fixed/empty search paths and least privilege for any SECURITY DEFINER operation.

Keep service-only application intake available and preserve safe deletion of manual jobs only when application and collaboration history are absent. No operator/service key is introduced into browser clients. Existing reviewer RLS remains authoritative.

Request conversion must authorize before receipt lookup, retain one-request/one-job provenance and not implicitly grant every employer member access. The target is a draft governed by the same readiness rules, with deliberate job grants through existing collaboration operations. Conversion notification delivery remains subject to the existing explicit request flow; no new live messages are part of this program.

## Decision 3: Writes return payload-bound receipts

Use a protected unique receipt keyed by actor, agency, operation, resource and request ID, with a canonical input hash. Persist receipt, domain writes and material audit in one transaction. Same key/same payload returns the original receipt before a stale-version check; same key/different payload returns a conflict. Authenticate and authorize before returning a receipt.

New successful saves use new keys; ambiguous outcomes retain the existing key. Responses include saved ID, version and state so the client can recover without reusing an obsolete expected timestamp. Atomic save-and-publish removes the current two-request partial-success path. Publication locks/version checks include relevant child configuration and current assignee/template eligibility.

First publication only promotes an unpublished draft and records one initial publication event. Repeated identical publish requests return their receipt; resume is a distinct lifecycle operation and must actually restore acceptance. Stable slug and first publication timestamp remain unchanged. A filled job is not a confirmed placement metric.

## Decision 4: Public projection is explicit

Separate protected private job data from the public posting. Internal fields include references, hiring reasons/confidential flags, contacts, account/agreement context, private compensation, sourcing notes and per-question evaluation rationale. Public fields include only deliberately disclosed role details and the selected public compensation representation.

New salary budgets default internal until explicitly disclosed as amounts or recruiter-authored public text. Backfill existing published salary visibility without silently changing published ads. Include currency, pay period, exact/range/from/up-to and gross/net/not-specified basis; preserve legacy null periods and fractional amounts.

Use an eligible public projection (RLS-limited table/columns, security-invoker view where appropriate, or narrowly designed RPC) that is safe under direct REST reads. UI hiding alone is insufficient. Do not grant table-wide SELECT to solve a missing public-column grant. Test HTML, serialized props, network responses, raw REST and portal endpoints. Private résumé storage and intentional employer candidate packages remain as in ADR 0005.

A contact is not a portal membership. An internal confidential-replacement flag does not implement anonymous-employer publication. No automatic invitation is sent on contact selection or publication.

## Decision 5: Local closing dates have a precise cutoff

For new closing dates, save the local date and the job's IANA time zone; derive the exclusive next-local-day-start cutoff in UTC. Accept only while current time is strictly before the cutoff, in addition to existing active-agency/open/published/slug/acceptance requirements. Null cutoff means no automatic date limit.

Enforce the same predicate in public list/job/apply reads, link eligibility and authoritative submission under transaction time. A form loaded before cutoff cannot submit after it. Expiry does not mark a role filled/closed or move applications; no scheduler is necessary to reject late intake.

Support authorized versioned deadline extension with old/new cutoff audit and public-date preview. Extension does not automatically resume paused roles. Preserve existing UTC instants and freeze per-job zones so workspace-zone edits do not move existing deadlines. Before applying cutoff semantics to old data, review counts/invalid shapes in an authorized environment; never query real candidate data just to produce this report.

## Decision 6: Version role and question semantics without rewriting history

Separate employment arrangement from working hours using stable codes. Legacy Full-time/Part-time map only to hours, not permanence. Restore optional department and add conditional working conditions, duration, remote eligibility, compensation and experience guidance as specified in the plan. Keep internal brief separate from public description/criteria. Workflow snapshots describe actual supported stages; no speculative custom engine.

Choice questions require 2–20 distinct nonempty choices. Required means an answer is necessary; false is a valid yes/no answer. All questions are evidence collection, never automatic rejection, stage changes or email.

Add number/date/URL/multi-select only after forms, schema/parser, SQL persistence, canonical receipt hashing, history and worker readers understand the versioned contract. Use canonical decimal strings, ISO date strings, validated HTTP/HTTPS URL strings and stable choice-value string arrays; legacy strings/Booleans remain supported. Library records snapshot into jobs, so edit/archive never rewrites live questions, submitted answers or historical screening evidence. Private evaluation notes cannot appear in public question rows.

## Alternatives and consequences

- One mandatory complete form is simpler, but loses incomplete client briefs; choose separate completeness rules with safe shape validation.
- Allowing blank rows in published question tables is easier initially, but weakens public intake invariants; choose private draft configuration and atomic compilation.
- Browser-only privacy and service validation are inadequate because callers can use REST/RPC directly; choose effective-grant review and DB-enforced operations.
- A series of PATCH then POST calls creates save/publish reconciliation problems; choose an atomic operation and explicit receipt/version.
- A deadline scheduler could update lifecycle, but adds a dependency and can lag; choose query/submission cutoff enforcement with no automatic hiring-state changes.
- Renaming or rewriting historical enum/text values can fabricate employer intent; choose additive fields, explicit legacy maps and a compatibility report.

This adds schema/service/test work before richer form UI. That cost is accepted as the target design so new private data and question types do not compromise existing intake/history. No new service, paid provider or background runner is required.

## Implementation and release order

The [content priority pass](../verification/create-job-content-pass.md) now implements canonical arrangement/hours, conditional public role details, protected hiring/sourcing/budget storage, a null-constrained public salary projection, readiness and a versioned four-type agency question library locally. Broader targets below are not all complete; no deployment is claimed.

P0 records this ADR, updates the masters, snapshots the dirty tree, inventories writers/effective-grant expectations and records the local baseline. P1 repairs authority/grants and conversion/assignment gaps; P2 implements receipt/draft transactions; P3 applies readiness/deadline/lifecycle rules; P4–P11 deliver form, privacy, preview, richer answers and library; P12 verifies interactions and prepares release evidence.

Before revoking writes, identify every caller and supply replacements. Before private-field entry, deploy safe storage/projection. Before new question types, deploy compatible readers/workers. Before applying new legacy policies, review impact. Use only forward migrations, regenerate types and preserve the hosted-only helper portability guard. Roll back UI capability with forward repair as needed; never restore broad grants or private exposure.

The owner subsequently authorized P1 and continued local product implementation. The original blocked database checks have now passed on a disposable local stack; see [draft-slice verification](../verification/create-job-draft-slice.md). Remote mutation and deployment remain separate from this local evidence.

## Verification required

The plan's T01–T32 are acceptance criteria. Highest-risk gates are direct table/API/RPC negative authorization, revoked/cross-tenant access, request-conversion receipt authorization, exact receipt replay/conflict, stale publication, new and legacy draft recovery, raw public/private projection tests, inclusive date/DST/cutoff races, pause/resume, and typed-answer history/worker compatibility. Run the full local authenticated create→publish→apply→inbox path with synthetic data and providers disabled. Never claim that a passing unit suite alone verifies deployed permissions.

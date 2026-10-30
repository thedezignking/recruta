# PRD and implementation plan: Complete create-job flow and contents

## Metadata

| Field | Value |
| --- | --- |
| Status | P0/P1, draft-flow slice and fourteen-priority content pass implemented locally; remaining audit packages in progress |
| Author | Codex, prepared for the Recruta project owner |
| Created / updated | 2026-10-30, Africa/Lagos |
| Version | 0.3 |
| Inputs | The complete create-job audit, the form-content audit, and the request to plan every finding and recommendation before implementation |
| Sources of truth | `docs/Recruta Master PRD.md`, `docs/Recruta Master Technical PRD.md`, ADRs 0001–0005, repository AGENTS.md |
| Approval scope | The proposed decisions, complete scope register, phased implementation, data exposure rules, migration strategy, and acceptance criteria below |

The owner authorized P0, then P1, and explicitly directed continued implementation of the improved product flow. Continue local implementation without another blanket approval gate. Deployment, remote schema changes, real-data evaluation, external invitations, live candidate email, and new paid services remain separate actions. Preserve existing user changes throughout.

### Current implementation slice

Implemented locally: Save draft from Essentials with organization, title and openings; restore incomplete criteria and screening questions from a private job-scoped relation; validate and compile them on publication; optional Department or team and criterion evidence; modal save/keep/discard protection and browser unload warning; field-linked publication errors; explicit workspace binding, authorized RPC writes, consistent primary assignments, and conversion authorization without implicit employer grants.

The owner's fourteen priority content changes are now implemented locally: canonical arrangement/hours, location/remote eligibility/duration, private reason/start/sourcing details, salary visibility/basis, workflow stages, priority definitions, readiness and a reusable four-type question library. See [content-pass evidence](../verification/create-job-content-pass.md) for the request-by-request mapping.

This spans P1 and parts of P2–P9/P11; it does not complete those entire packages. Remaining work includes atomic job save-and-publish receipts, explicitly unassigned drafts, browser Back/Forward recovery, full deadline rules, organization matching, additional role/compensation controls, shared faithful candidate-control preview, richer answer types, broader library pagination and release verification. Retain every finding below.

Local behavior, database checks and browser evidence are recorded in [draft-slice verification](../verification/create-job-draft-slice.md).

## 1. Problem statement and evidence

Agency recruiters need to capture an incomplete client brief quickly, develop it into a credible vacancy, assign the work, publish an accurate candidate experience, and receive usable applications. The current flow provides a strong base but mixes draft completeness with publication completeness, leaves important recruitment questions unrepresented, and has database mutation paths that bypass the intended services.

Evidence is from the current working tree, including its existing uncommitted implementation, rather than from a deployed production inspection:

- `new-job-form.tsx` uses one `manualJobSchema` for Save draft and Publish. The schema requires organization, title, description, openings, and workplace type.
- At the audit baseline, the PRD required a valid description before draft creation and omitted Department. The authorized local implementation now permits minimal drafts and restores optional Department or team.
- The calendar already prevents selecting past days; the API/schema and database publication boundaries do not enforce equivalent deadline eligibility.
- `create_manual_job` defaults the lead recruiter to the actor and creates a primary assignment. The gap is consistent explicit-unassigned behavior and active ownership validation, not absence of assignment on every new job.
- `publish_job` checks agency role, permits draft/open/on-hold publication, and does not require recruiter job assignment, expected version, or publication readiness.
- Historical table write grants/policies remain broader than the newer draft-edit function. Static inspection is sufficient to require negative authorization tests; actual deployed privileges must be verified separately before rollout.
- The form permits a required single-select question with no options. Candidate answer validation already validates question ownership and choice membership; question configuration needs an equally strong gate.
- Review shares role details but describes applicant fields using a separate summary. It omits the exact form controls, consent, branding, and candidate layout.
- Organization duplicate hints compare exact names or domains; near-duplicate matching is advisory work still to add.
- Targeted verification in the first audit passed 18 tests in 5 files and targeted ESLint. The complete suite, local authenticated browser journey, runtime accessibility inspection, and database privilege reproduction were not run for either audit. Those results are a baseline, not release approval.

The plan distinguishes verified defects, deliberate changes to existing policy, and new recruitment capabilities. Every recommendation is assigned an implementation phase or an explicit disposition in section 14.

## 2. Goals

| Goal | Measure | Acceptance target |
| --- | --- | --- |
| Preserve an early brief | Minimal draft creation/recovery | Organization + valid working title can be saved without description, workplace type, owner, or workflow |
| Enforce publication authority | Role/resource mutation matrix | Every prohibited table/API/RPC write is denied; active managers and authorized recruiters succeed |
| Publish usable vacancies | Readiness invariants | No newly published vacancy has an invalid required question, missing mandatory role details, invalid owner/workflow, or expired closing time |
| Match preview and public experience | Contract and browser parity | Same public projection, role rendering, applicant fields, branding, conditional controls, and required states |
| Collect useful recruitment information | Field persistence/publication tests | Every approved field survives create, edit, review, publication, and authorized read without leaking internal information |
| Preserve history and retry safety | Concurrency/idempotency tests | Repeated identical requests have one effect; changed payloads conflict; stale writes do not overwrite |

Recruiter time-to-draft under one minute is a usability hypothesis, not a measured claim. Validate in synthetic task walkthroughs, then a small recruiter pilot. Baselines for completion time, abandonment, and candidate conversion are **[TODO: collect during the pilot]**; avoid inventing percentage improvement targets.

## 3. Scope and boundaries

The full planned program includes security hardening, drafting/recovery, all form-content changes, organization matching, publication/readiness, shared public preview/branding, richer question types, a question library, defaults/settings, compatibility, and full verification. Later phases remain part of the authorized local implementation scope.

Keep Recruta a modular Next.js/Supabase monolith. Reuse existing UI primitives, company picker, services, job transactions, private Storage, and local test wrapper. Preserve the candidate/application distinction, recruiter-first entry, optional hiring-request path, one job with multiple openings, and existing applicant operations.

Related capabilities with a separate implementation gate are automatic draft autosave, AI writing/quality analysis, anonymous-employer publication, agreement management, recruiter workload routing, separate sourcing ownership, downstream interviews/offers/placements, and job-board distribution. Section 14 records these individually with reasons; none are implied as already implemented. All requested deterministic form improvements can ship without these capabilities.

## 4. Users and key flows

### Users

- Recruiter: capture and develop roles, qualify applicants, and manage explicitly assigned work.
- Recruitment manager, administrator, owner: assign and oversee all agency jobs and manage workspace defaults/question library.
- Candidate: understand the opportunity and submit only relevant application information without an account.
- Hiring manager/contact: provide role context and participate only through existing explicit job grants; selecting a contact never grants portal access.
- Other tenants, inactive members, unassigned recruiters, and public callers: denied mutations beyond their explicit permissions.

### Primary flow

1. Open New job from Overview, Jobs, or organization context; preserve the return destination.
2. Choose scratch or an editable template. Draft editing skips this screen.
3. Select a saved organization or enter a new one using the shared picker.
4. Review optional enrichment and duplicate suggestions; selecting a suggestion alone creates nothing.
5. Enter a working job title and number of positions; keep multiple openings on one record.
6. Optionally record hiring reason, internal reference, target start, and a hiring contact.
7. Save an incomplete draft at this point, or continue.
8. Complete public description, employment arrangement, working hours, workplace type, and conditional location information.
9. Add closing date, compensation, benefits, experience, and any applicable working conditions.
10. Add structured public criteria only when useful for screening; do not require retyping the description.
11. Choose a few relevant candidate questions, optionally from the agency library.
12. Assign an active lead recruiter, inspect workflow stages, set internal priority and sourcing notes.
13. Review blockers and recommendations; follow linked errors to their fields.
14. Inspect exact public role and application previews at desktop and phone widths, plus a separate internal setup summary.
15. Publish the reviewed version atomically with a stable request key.
16. Receive a clear success state with both job and apply links, ownership, accepting state, and contextual next action.
17. Candidate opens the public job and dedicated application page and submits synthetic data in verification.
18. Application reaches the correct job/inbox; retry creates no duplicate application. Email/provider failure does not undo persistence.

### Recovery and alternative flows

- Close/backdrop/Escape/navigation with edits: Save draft, Discard changes, or Keep editing. Save failures preserve the form.
- Refresh or browser close: native unsaved warning when dirty. Previously saved drafts remain recoverable; no promise that unsaved text survives a crash.
- Network outcome unknown: retry the identical operation with its existing key; reconcile the receipt before starting a changed operation.
- Stale edit or stale review: retain local inputs and show reload/review options; never overwrite another user's change.
- Draft saved but publication failed: show saved state/version and publication reason; edits and retry use the correct new version and operation key.
- Pause/resume: separate lifecycle operation; resume actually enables acceptance only when closing time and eligibility permit.
- Hiring-request conversion: retain original provenance and one-conversion invariant; resulting draft follows the same readiness rules.

## 5. Target product decisions

P0 records the target defaults below in the master documents and ADR 0006. Continued local implementation is authorized; recording these decisions does not claim their behavior has shipped. The owner can amend a decision by ID before its implementation.

| ID | Recommended decision | Reason and trade-off |
| --- | --- | --- |
| D01 | Draft minimum is an agency, organization, and working title of 2–160 characters; openings default to 1. | Enables fast capture without making organization nullable across existing relationships. Organization-free/automatically untitled drafts remain a separate expansion. |
| D02 | Drafts may have no description, workplace type, owner, workflow, or incomplete added question. Validate types, lengths, tenant relationships, and safe numeric bounds on every save. | Relax completeness only; represent incomplete draft question/criterion rows intentionally rather than bypassing constraints accidentally. |
| D03 | Publication requires title, substantive description, valid organization, employment arrangement, workplace type, conditional location, active lead, and usable workflow snapshot. Closing date remains optional. | Optional closing dates support ongoing recruitment; absent date means open until paused/closed. Working-hours unknown is explicit, not invented. |
| D04 | A closing date includes that whole calendar day in the job's saved IANA time zone. Store the exclusive next-local-day cutoff as UTC; reject at or after that cutoff. | Makes inclusive dates and DST behavior precise. Existing UTC instants are preserved, not reinterpreted silently. |
| D05 | Deadline stops intake immediately through read/submission predicates; it does not mark a job filled/closed or change candidate stages. | Prevents late applications without requiring a scheduler. An operational expired label is derived from the cutoff. |
| D06 | Managers control agency-wide publication. Recruiters may publish/edit their own unpublished draft or explicitly assigned job, with active membership rechecked. | Preserve current draft creator behavior; creator status alone does not grant ongoing applicant access after reassignment. |
| D07 | Employment arrangement and working hours are separate stable codes. | Full-time and fixed-term may both apply. Preserve legacy text while mapping unambiguous values. |
| D08 | Restore optional Department or team under additional details. | This intentionally supersedes the current PRD omission while keeping initial drafting compact. |
| D09 | New compensation data is internal until a recruiter explicitly chooses public visibility. Existing published salary stays public initially. | Protect new internal budgets without silently changing already published ads. Plain compensation text must state actual policy and never invent “competitive.” |
| D10 | Hiring reason, contact, reference, priority, sourcing brief, evaluation notes, private budget, and account/agreement context are internal. Public fields are visibly marked as such. | Requires database/public projection isolation, not only conditional JSX. |
| D11 | Hiring reason and target start are optional; no new intake contact or portal membership is mandatory to publish. | Supports early agency work and prevents invitation from becoming a prerequisite. |
| D12 | Required questions collect information; they never reject, move stages, or send email automatically. | Preserve human decisions and current AI/communication boundaries. |
| D13 | At least 2 distinct single/multi-select choices; maximum 20. Warn above 5 custom questions or 2 required long answers; retain a hard maximum of 20 questions. | Prevents impossible forms while leaving specialist intake possible. |
| D14 | Keep the four-step modal; use conditional details and collapsible sections rather than making every recommendation another required question. | Reduces content burden across industries. No unrelated navigation or dashboard changes. |
| D15 | Ship explicit Save draft and unsaved-change protection first. Autosave follows a separate design gate. | Reliable request/version reconciliation is required before automatic saving. |
| D16 | Readiness warnings never claim legal compliance or score candidates. | Use deterministic factual checks and concise guidance; jurisdiction-specific legal templates need separate review. |
| D17 | Workspace job defaults and question-library management live in existing Settings, role-gated to owner/admin/manager; recruiters can use defaults and library items. | Avoids a speculative primary-navigation module. Settings mutations bind explicit agency ID. |
| D18 | Support number, date, URL, and multi-select questions in the full program. Treat existing single select as the single-choice type. | No duplicate “multiple choice” type; new answer types ship only when intake, history, preview, and screening consumers are compatible. |

## 6. Field-by-field specification

### 6.1 Essentials and organization

| Field | Behavior and copy | Draft/publication rule | Visibility |
| --- | --- | --- | --- |
| Organization | Existing workspace search first; optional external suggestions; manual entry immediately available. | Required at save/publish; active non-archived tenant record. | Identity shown publicly according to current policy. |
| Organization name | Required only for creating a new organization; exact existing matches offer reuse and preserve saved data. | 2–160 characters; atomic create/reuse with job. | Current public organization name. |
| Website | Accept `example.com`, normalize to HTTPS; accept only HTTP/HTTPS URLs; optional. | Friendly inline errors; no silent fetch of arbitrary URLs. | Existing organization profile policy. |
| Industry | Optional, editable suggestion; max 120 characters consistently in UI/schema. | Never required to open a job. | Organization context as currently allowed. |
| Country | Searchable country name; store validated two-letter code. | Optional for organization creation. | Organization context only; never infer job eligibility from this. |
| Organization location | Replace ambiguous head-office copy; explain that it can prefill job location. | Optional; never overwrite recruiter-edited job location when organization changes. | Profile context; public job location is separate. |
| Office address | Optional precise address, clearly distinct from public job location. | Safe max length; no automatic publication. | Internal unless deliberately entered as public job location. |
| Imported logo | Preview/remove only; no manual URL field. | Never persist temporary search icons; save separately fetched reviewed enrichment only with permission. | As existing organization branding policy permits. |
| Public job title | Helper: “Use the title candidates search for, such as Senior Backend Engineer.” | Draft minimum; required publication; max 160. | Public. |
| Open positions | Default 1; keep multi-hire explanation. | Integer 1–1000. Warn at 100+ as a proposed usability threshold; do not duplicate records. | Public, prominent in review. |
| Internal job reference | Optional client requisition/internal reference; bounded text, not public slug. | 120 characters; no universal uniqueness requirement because clients reuse references. | Internal. |
| Hiring reason | New position, Replacement, Temporary cover, Project/seasonal, Talent pipeline, Other; optional detail; confidential-replacement flag. | Optional; no interview decision or automatic scheduling. | Internal. |
| Target start | Optional date or “Flexible / To be agreed”; mutually exclusive states. | Independent of application closing date; warn if inconsistent rather than block legitimate urgent work. | Internal by default; optional explicit public start-date display. |
| Hiring contact | Select organization contact or add optional name/email/phone/title; not an external membership. | Composite tenant/organization checks; explicit confirmation; retry-safe. | Internal. |

Keep account manager, organization status, agreement reference/status, and confidentiality context in organization details where they belong. Expose existing account/status context during selection when useful, without requiring a contract or adding mandatory fields to Essentials. A minimal optional internal agreement reference/status is included in phase P5; document upload, signature, billing, or agreement lifecycle is separately gated.

### 6.2 Public role and working conditions

| Field | Content and conditional behavior | Publication rule |
| --- | --- | --- |
| Job description | Public formatted editor; paste-friendly headings, emphasis, lists. Guided editable sections: About the role, Responsibilities, Success measures, Team, Benefits, Hiring process. | Required; portable Markdown; minimum useful text and unresolved-prompt checks. Warn on generic/very short copy; no arbitrary mandatory section count. |
| Department or team | Optional text with authorized, bounded organization-specific suggestions from existing saved values. | Optional; preserve existing values. |
| Employment arrangement | Permanent, Fixed-term, Temporary, Contract, Freelance/consulting, Internship, Apprenticeship, Volunteer, Other. Other reveals description. | Required; stable codes independent of labels. |
| Working hours | Full-time, Part-time, Variable, Not specified; optional hours per week. | Unknown permitted explicitly; nonnegative bounded hours when provided. |
| Contract duration | Reveal for fixed-term/temporary/contract/project/internship/apprenticeship; bounded duration text or “To be agreed.” | Require duration or explicit to-be-agreed for newly published fixed-duration roles; do not invent an end date. |
| Workplace type | On-site, Hybrid, Remote. | Required at publication. |
| Public job location | City/region and country; helper discourages private exact addresses. Prefill only untouched blank input. | Required for on-site/hybrid; geography text plus valid country when selected. |
| Hybrid attendance | Optional public text, e.g. 2 office days per week. | Warning if hybrid expectations remain unspecified. |
| Remote eligibility | Anywhere, specified countries/regions, or details to be confirmed; optional time-zone overlap. | Require an explicit eligibility state; confirmation state warns. Remote does not automatically mean worldwide. |
| Working schedule | Standard office hours, Shift, Night, Rotating, Weekends, Flexible, Other + optional detail. | Optional; useful across healthcare, retail, security, logistics, hospitality, support. |
| Travel | None, Occasional, Regular, Not specified + details. | Optional, public if supplied. |
| Work authorization | Required existing authorization, sponsorship may be available, sponsorship available, not specified; relocation separately yes/no/not specified. | Optional factual employer policy; no nationality-based automatic rejection. |
| Reports to | Optional public role title; no automatic publication of a person's private contact data. | Optional. |
| Application closing date | Inclusive local date plus visible saved time zone; clearable. No date: “Applications remain open until this job is paused or closed.” | Optional; future cutoff mandatory when supplied. Server and database enforce. |
| Experience guidance | Optional years 0–50; label and help identify guidance, not an automatic filter. | Optional; no automatic stage/AI-decision change. |
| Seniority | Entry/graduate, Junior, Mid-level, Senior, Lead/principal, Manager, Director/head, Executive, Not specified. | Optional; stable legacy mappings; no forced universal hierarchy beyond descriptive labels. |
| Benefits | Optional public text; commission/bonus/equity/allowances may be described separately. | Optional; factual, never generated as employer promises. |

Description templates remain editable starting points. Improve them into clearly labeled structural examples for the existing example roles and add office/shift/contract examples to avoid technology-office bias. Changing templates or inserting guided headings must not overwrite existing text without confirmation. A template-selection action is not publication approval.

### 6.3 Compensation

- Label the section “Compensation.” Separate internal budget from the public compensation projection.
- Capture amount shape: Exact, Range, From, Up to; require the relevant amount(s) once configured. Positive/nonnegative finite numeric validation, maximum compatible with `numeric(14,2)`, min <= max, zero deliberate rather than a blank-coercion accident.
- Currency: supported validated currency codes with labels; workspace default, editable per job. No silent fallback to USD for invalid data. Expand currency choices with a maintained supported list rather than accepting arbitrary three-character strings.
- Pay period: hourly, daily, weekly, monthly, annually; workspace default, editable. Fractional hourly amounts must not disappear through whole-number formatting.
- Basis: Gross, Net, Not specified. No assumed tax calculation.
- Publication choice: Show amount, Show supplied public text, Keep internal. Preview spells out which one is active. Public text is recruiter-authored, bounded, and does not reveal the internal range.
- Optional additional compensation: commission, bonus, equity, allowances; optional benefits. Public visibility is explicit.
- Removing compensation clears applicable values deliberately; retaining private budget does not publish it.
- Existing published salary retains existing visibility during migration. Existing amounts without a pay period remain valid and show no invented period. New disclosure choices never rewrite historical ads automatically.
- Public salary secrecy must be enforced through a safe database projection or public RPC/view. Hiding text in React or merely omitting it in one select does not protect raw anonymous table access.

### 6.4 Criteria and internal brief

- Public criteria remain optional. Labels use Required and Preferred; helper: “Mark only genuine deal-breakers as Required.”
- Each criterion has category, label, optional evidence/detail text, and order. Categories: Skill, Qualification, Licence/certification, Language, Industry experience, Portfolio/work sample, Working condition, Other.
- Use move-up/down controls with keyboard and pointer support; optional drag must retain button alternatives. Persist stable order and IDs.
- Preserve up to 50 criteria; show field-level length/type errors and duplicate-label warnings.
- Changing a draft's description does not silently rewrite criteria or demand duplication of the public brief.
- Internal sourcing brief stores target experience, sourcing channels/companies, reporting/client context, confidentiality notes, and other recruiter guidance. Bounded text is a starting point; do not build a target-company database.
- Internal notes, private criterion evaluation notes, and internal sourcing data live in a separately protected relation/projection; portal/public access cannot retrieve them. Audit records state what changed without copying sensitive text into broad metadata.
- Requirements consumed by existing screening retain IDs/version semantics and the required/preferred distinction; newly descriptive fields do not alter automated screening decisions. Do not modify old screening runs or queued input snapshots.

### 6.5 Candidate questions

Shared question model: stable job-local ID, label (2–240), help (0–500), answer type, required flag, options where applicable, order, optional private evaluation note, and optional library-origin/version metadata.

| Answer type | Input/validation | Stored answer contract |
| --- | --- | --- |
| Short text | Single line, bounded to a type-appropriate limit (proposed 500). | String. |
| Long text | Multiline; proposed max 5000 with visible counter near limit. | String. |
| Yes/no | Unanswered is distinct from No; optional questions may be blank. | Boolean when answered. |
| Single choice | 2–20 unique trimmed choices; one row per option rather than comma-delimited entry. | Stable option value/ID, compatible with existing legacy text choices. |
| Number | Finite numeric answer; optional configured units/min/max only when meaningful. | Canonical decimal representation; versioned contract avoids locale/coercion ambiguity. |
| Date | ISO calendar date, no implicit timestamp; explicit help when asking start availability. | `YYYY-MM-DD` string. |
| URL | HTTP/HTTPS URL, bounded; no network fetch. | Normalized string. |
| Multiple selections | 2–20 choices; selected values unique and belong to question; optional selection bounds. | Array of stable option values/IDs. |

For Number choose canonical decimal strings in the API/storage value rather than widening every answer to unsafe JavaScript floating point. Date/URL remain strings with type-specific validation. Multi-select extends the existing string/boolean answer union to a versioned string-array case. Document this exact wire contract and normalize legacy option strings before enabling new types.

Configuration and usage rules:

1. New questions default optional. Marking required means “Must answer to submit,” never “Must answer Yes.”
2. Help states: “Contact details and résumé are already collected. Ask only what you need at application stage.”
3. Show a concise privacy reminder about sensitive personal information and identity/financial documents. Present general data-minimization guidance, not a jurisdiction-specific compliance verdict.
4. Provide neutral library examples for availability/notice period, optional salary expectations, work authorization, location, portfolio, shift availability, and travel. Do not suggest salary history, protected-characteristic screening, or nationality tests.
5. Warn on excessive questions (>5 total, >2 required long text); max 20. Display an approximate effort category/range based on configured questions, labeled as an estimate, never a guaranteed time.
6. Options cannot be blank, case-insensitive duplicates, or longer than 120 characters. Changing question type clears incompatible option/config fields with confirmation if destructive.
7. Move/reorder questions and options accessibly. Stable IDs avoid answering the wrong question after edits.
8. Preview renders real controls and all help/required/option states. Preview submit is disabled in the UI and rejected at the boundary if attempted.
9. Private evaluation rationale explains what the recruiter wants evidence of; it is not shown to candidates, employer portal users, or generic audit feeds.
10. Existing valid published questions remain readable. Do not change live schemas in place after applications exist. New question types reach application history, correction UI, intake validation, hashing/idempotency, DB transaction, and compatible screening readers before they can be published.
11. Candidate errors identify the specific question and preserve other inputs/file selection where browsers allow. Required false Boolean answers are valid.

Agency question library:

- Owners/admins/managers create, edit, archive, categorize, search, and preview reusable questions in Settings. Recruiters use/copy them into a job and may customize the job copy.
- Every library mutation uses explicit agency ID, active-role authorization, expected version, retry key, and audit. Tenant-owned table has RLS and least-privilege grants.
- Library items snapshot into jobs. Later edits/archive do not mutate published job questions or old answers; archived entries cannot be newly selected.
- Seed a small reviewed optional starter set on adoption without creating duplicates on retry. Seed only content supported by the current answer types in each phase.
- Include duplicate detection and clear empty/search/error states. No separate primary sidebar destination.

### 6.6 Assignment and review

- Lead recruiter: default to actor if eligible; explicit “Assign later” for draft. Validate the selected user is an active eligible recruitment role in the same agency, not merely any membership. Show ownership helper. One primary assignment and `jobs.primary_recruiter_id` stay synchronized.
- Reassignment policy: managers can change ownership across the agency. A recruiter can assign self during creation and retain existing job authority; assigning a different lead must not escalate their own or another person's privileges. Define any allowed recruiter handoff explicitly and test loss of access.
- Workflow: select a deterministic workspace default, show ordered stage names/types and approval markers, explain snapshot behavior. Publish requires an active compatible workflow and nonempty usable snapshot. Current application-stage semantics remain authoritative; do not promise arbitrary workflow execution unless supported.
- Priority: Low = no immediate deadline; Normal = standard timeline; High = active client need; Urgent = immediate attention. Internal only. Use dates as factual urgency context.
- Optional collaborators use existing explicit grants/invitation flow after save or publication. Selecting a contact never invites someone automatically.
- Review has linked blockers, recommendations, shared public role, shared public application, and internal setup summary. Show exact visibility and publishing consequence (“The role will be public and accept applications”).
- Internal summary includes owner, stages, openings, priority, closing date/time zone, start target, hiring reason/contact, private budget and sourcing brief with clear internal labels. Do not put internal content inside a preview container that gets serialized as public data.
- Readiness recommendations cover compensation disclosure, missing hybrid details, benefits, useful preferred criteria, short/generic description, and missing remote detail. Empty criteria or no custom questions are valid.
- Success shows both stable job/apply URLs and copy controls, actual acceptance state, next-step link to review applicants or continue setup. Sharing remains a user action; publishing never sends invitations/candidate email.

## 7. Technical implementation

### 7.1 Existing code map

| Layer | Verified existing locations | Planned work |
| --- | --- | --- |
| Creation UI | `src/components/jobs/new-job-form.tsx`, `new-job-dialog.tsx`, `job-description-editor.tsx` | Split draft/publish input contracts; form sections, dirty-state recovery, exact preview, readiness and errors. Extract small maintainable form sections as needed. |
| Organization UI | `src/components/organizations/company-picker.tsx`, `organization-fields.tsx`, `organization-duplicate-hint.tsx`, `new-organization-form.tsx` | Country selector, URL normalization, duplicate guidance and complete selected record hydration. |
| Role display | `src/components/jobs/job-role-details.tsx` | Shared typed public role projection, all new public fields, consistent date/currency rendering and semantic Markdown. |
| Applicant form | `src/components/public/application-form.tsx`, `.test.tsx` | Shared controls for preview/live, new answer types, errors and effort hints. |
| Entry/details | `src/app/(agency)/app/page.tsx`, `src/app/(agency)/app/jobs/page.tsx`, `jobs/new/page.tsx`, `jobs/[id]/page.tsx`, `src/components/jobs/job-side-panel.tsx` | Consistent entry context, saved draft hydration, owner/readiness actions, stable return URL. |
| Public routes | `src/app/careers/[agencySlug]/page.tsx`, `jobs/[jobSlug]/page.tsx`, `jobs/[jobSlug]/apply/page.tsx`, `src/app/preview/jobs/[id]/page.tsx` | Agency header/logo reuse, safe projection, exact draft preview, eligibility and responsive parity. |
| Validation | `src/lib/validation.ts`, `organization.ts`, `public-intake.ts`, `job-publication.ts` | Draft/publication schemas, typed answer contract, readiness and date semantics. |
| Services | `src/server/services/jobs.ts`, `public-jobs.ts`, `clients.ts` | Authoritative reusable mutations, errors/receipts, public projection, duplicate search. |
| API | `src/app/api/v1/jobs/route.ts`, `[id]/route.ts`, `[id]/publish/route.ts`, `[id]/transitions/route.ts`, `[id]/assignments/route.ts`, `workflow-templates/route.ts` | Resource/agency binding, idempotent atomic save-and-publish, versions, lifecycle consistency. |
| Settings | `src/components/settings/agency-settings-form.tsx`, `src/app/(agency)/app/settings/page.tsx`, `src/app/api/v1/agency/profile/route.ts` | Job defaults and question-library settings without expanding primary navigation. |
| Database | `supabase/migrations`, `supabase/tests`, `src/types/database.generated.ts` | Forward migrations, grants/RLS, typed RPCs, compatibility and regenerated types. |
| Verification | `src/components/jobs/new-job-form.test.tsx`, `src/lib/validation.test.ts`, `supabase/tests/draft_job_edit.test.sql`, `tests/e2e`, `scripts/with-local-test-env.mjs` | Meaningful boundary, failure and end-to-end tests. |

New component/service/relation names in this document are proposed artifacts, not claims that those files already exist. Discover exact owning modules before editing. Read the relevant Next.js 16.4 bundled docs before code changes. All business rules stay in services and database operations; browser checks provide feedback, not authorization.

### 7.2 Security and permissions

1. Inventory effective table/column/function grants and every app/script/RPC writer for jobs, requirements, questions, workflow snapshots and assignments. Include request conversion and service-only intake dependencies.
2. Replace application-facing direct writes with complete authorized RPCs before revoking access. Revoke authenticated insert/update/delete paths that bypass those RPCs; retain only the reads actually intended. Validate no public role inherits another grant.
3. Privileged operations check `auth.uid()`, agency active state, active database role, resource tenant and job authorization, related record tenant, and allowed lifecycle. Set empty/fixed search path and explicit execute grants.
4. Apply the same authority policy to draft edit, publish, pause/resume, owner assignment, and safe deletion. Resource IDs do not excuse stale membership checks.
5. Public projection includes only eligible public fields; candidate documents stay private. Separate private job brief/compensation/contact/evaluation data from anonymous/public-selectable relations. Employer portal projections remain explicit and exclude raw applications, candidate profiles, AI evidence and internal notes.
6. Keep current safe-empty deletion checks including collaboration history. Direct DELETE revocation must not accidentally make a weaker replacement path available. Preserve historical authorship and audit.
7. Browser-supplied agency ID selects context only after verification. Compare resource agency to verified request context, and bind settings/library operations to the originating page's explicit agency ID.
8. Use least-privilege execute permissions for any public projection RPC/view; security-invoker views where applicable, or narrowly designed public-read RPC with documented eligibility checks. Assess raw REST enumeration as well as rendered pages.

### 7.3 Draft and publication operations

- Define separate shape/completeness contracts: draft-save, readiness, publish, lifecycle. Keep UI/API/SQL constraints aligned and test their boundary cases.
- Incomplete draft criteria/questions require a durable representation. Proposed: draft configuration payload in a protected job-draft relation with stable row IDs, validated safe shapes and bounds; only compile valid public question/requirement rows during atomic publication. Existing full drafts hydrate into that model without loss. Avoid weakening published-table validity to accommodate blank draft rows.
- Atomic create+publish and update+publish use one transaction or a single transactional orchestrator RPC. Do not retain the current successful PATCH followed by independent POST as the sole success path.
- Every write takes request ID; edits/publish also take expected version. Successful responses include saved job ID/version, operation receipt and state.
- Keys bind actor + agency + operation + resource + canonical payload hash. Same key/same payload returns prior receipt before stale checks; same key/changed payload returns 409. Distinct successful saves use new keys. Persist operation receipts atomically in a protected table, not merely via an unbound audit lookup.
- Ambiguous network failures retain the current key. Do not let a changed form re-use the previous successful edit key. Detect already-committed publish before reporting a false failure.
- Readiness runs under the publish transaction lock against the reviewed version, including child configuration/template/assignee state. Readiness in the UI cannot authorize publication by itself.
- Initial publication only from unpublished draft. Retrying a completed identical publish returns its receipt without duplicate audit. Open/on-hold resume uses lifecycle operation, never creates another initial publication event.
- Reopen sets acceptance true when allowed, keeps stable slug/first published timestamp, checks future/null cutoff and active agency, and records lifecycle history once. Closing/pausing do not delete questions/history.
- Provide a narrow authorized closing-date extension action for published/open/on-hold jobs, with expected version, request receipt, old/new cutoff audit and preview of the new public date. Extending the date does not automatically resume a paused role. It does not unlock general published-job or live-question editing. This supplies a recovery path when an expired role needs to accept applications again.
- Maintain state/owner concurrency and audit semantics after any job metadata changes. A job marked filled is not a confirmed placement and must not add dashboard placement metrics.

### 7.4 Deadline behavior

- New input stores selected local closing date, frozen job time zone, and derived exclusive UTC cutoff in/alongside the existing `deadline_at` contract as documented by the migration.
- Acceptance predicate: active agency + open + slug + published + acceptance enabled + null cutoff or current time strictly before cutoff.
- Enforce in career list, job read, apply read, link eligibility, RLS/public projection and authoritative application transaction. Check under transaction time so a form opened before closing cannot submit after closing.
- Date formatting uses the saved job time zone consistently. Agency time-zone edits do not move existing deadlines. Test leap days, UTC crossings, DST spring/fall, and exactly-at-cutoff behavior.
- No scheduler required to reject late intake. A future operational deadline audit event can be scheduled independently; absence of that event cannot reopen intake.
- Existing past deadlines need a read-only impact report. Recommended cutover applies cutoff semantics to all existing deadlines after review; do not silently shift instants or mass-change lifecycle statuses. This is a release gate.

### 7.5 Schema/data changes and compatibility

Use forward migrations created through discovered CLI commands, and regenerate database types. Do not rewrite the three existing untracked job migrations or historical applied SQL to accomplish new behavior. Preserve the hosted-only `rls_auto_enable()` portability guard.

Proposed storage groups:

| Group | Proposed data | Integrity/exposure |
| --- | --- | --- |
| Core public role | Employment arrangement code, hours code, department, duration, remote eligibility, attendance, schedule, travel, authorization/relocation, reports-to, benefits, public compensation representation, closing date/time zone. | Bounded schema; exposed only through eligible public projection. Keep scalar fields relational when filtered/reported; versioned bounded JSON only for genuine nested optional details. |
| Private job brief | Hiring reason/confidential flag, reference, sourcing text, hiring contact ID, target start/public toggle, compensation budget/basis, private evaluation notes, optional agreement context. | Agency/job composite relation and RLS; no public/portal grant. Public target date copied through explicit projection only. |
| Draft configuration | Incomplete criterion/question content, stable local IDs and config version. | Tenant/job composite key; never anonymous-readable. Compiled transactionally at publication. |
| Requirement metadata | Category, detail, stable order/version. | Public only when actually designated public; retain existing screening inputs and history. |
| Question configuration | New type values, stable options, validation config, origin/version snapshot. | Published questions must be answerable; composite job/agency relationships; no private rationale in public rows. |
| Question library | Agency-owned items, category, content/config, version and archived state. | Active manager writes; recruiter read/use; job snapshot isolation. |
| Job defaults | Default currency/period, workspace workflow, current workspace country/time zone reuse. | Settings write authorization, explicit agency, concurrency and audit. Existing data not retroactively rewritten. |
| Operation receipts | Actor, tenant, resource/operation key, input hash, result/version/state. | Private/least privilege; no public execution path; transactional unique constraints. |

Migration rules:

- Full-time/Part-time legacy values map to hours while employment arrangement remains unknown until reviewed; never infer permanent. Fixed unambiguous types map explicitly; preserve legacy display string as needed.
- Existing seniority codes map losslessly; historical screening remains unchanged.
- Invalid/unknown currency, salary period, hours, workflow or question data are reported before tightening constraints; no destructive cleanup or invented values.
- Existing published ads are not forcibly unpublished for every newly recommended field. Introduce readiness for new publication, strict impossibility/security checks universally, and a documented compatibility path for legacy ads. Invalid impossible required choice questions need an explicit repair/disable-intake decision before cutover.
- Existing public salary access is migrated in a coordinated deploy: backfill visibility, populate safe projection, update all readers, then revoke raw exposure. No interval where new private fields are anonymously readable.
- Existing private contacts/agreements are not copied into public description. Do not automatically create portal accounts.
- Update request conversion to populate permitted draft state and preserve approved revision/source. Atomic conversions and one-request/one-job uniqueness remain enforced.
- New question types require answer-contract versioning across form, parsing, hash binding, SQL, history/export consumers, extraction/screening readers. Keep existing string/boolean answers valid. Worker compatibility deploy precedes enabling types that workers cannot read.
- Add indexes/composite constraints based on actual queries and FK relations. Run advisors and function/database tests before rollout.

### 7.6 Frontend behavior and accessibility

- Reuse Base UI/shadcn-style primitives, Geist, Solar per-icon imports, shared radius and neutral/brand tokens. Main submission filled; repeated/supporting actions outline; plain Add icon; semantic destructive discard.
- Preserve responsive modal context and public pages; settle modal dimensions from the existing design direction. Current code and older technical PRD dimension values differ; reconcile using actual desktop/mobile verification rather than freezing either accidentally.
- Dirty tracking includes manual organization inputs, editor changes, custom questions/options, defaults changed by the recruiter, and remove/reorder actions. Initial hydration and harmless autofill are not edits.
- Route all dismissal paths through one guard. Save and close is allowed only on successful save; Discard requires explicit action; Keep editing restores focus. Disable accidental dismiss during mutation or reconcile outcome first.
- Register `beforeunload` only while dirty. Native unload limitations are documented; no unsupported promise of router-wide interception. Keep the modal's own close/return actions guarded and test Back/Forward behavior.
- Step state may be encoded in safe query parameters for resumable navigation; never place draft text, contact details, or budget in the URL. Do not enable jumping to an unreviewed publish action solely via URL state.
- Render visible “Step N of 4,” semantic progress, hierarchical headings and correct current-step state. Step changes announce the heading and move/restore focus intentionally without jumping to background content.
- Link an error summary to invalid controls; wire `aria-invalid` and `aria-describedby` consistently including selects/editor. Scope first-invalid focus to the dialog/form; open collapsed sections before focus.
- Preserve inputs and display actionable field/server errors. Map API `fieldErrors` to the affected fields. Prevent missing error rendering for salary minimum, years, optional nested fields and new types.
- Standard applicant inputs use meaningful names and appropriate autocomplete/type/inputMode; authoring fields use intentional autocomplete behavior. No blocked paste; no focus outline removal without replacement.
- Ensure focus is visible, not hidden by sticky header/footer, trapped only within active dialog, and restored to launcher. Icon controls have labels/tooltips and decorative icons are hidden.
- Test 375px portrait, landscape, tablet, wide desktop, 200% zoom/reflow, reduced motion, Windows high contrast where available, keyboard-only and at least one actual screen-reader walkthrough. AA target minimum is 24 CSS pixels; use larger comfortable mobile controls where possible.
- Editor's supported Markdown must render consistently on the public page: real lists/headings, emphasis, pasted content and links. Avoid accepting unsupported rich formatting that later prints as raw markup. Preserve escaped untrusted text and safe URL handling.
- Long titles, organization names, descriptions, question labels/help/options and currency values must wrap without clipping actions. Modal scroll is contained and content remains reachable.

## 8. Implementation packages and dependencies

Each package is a reviewable implementation unit; split schema/services/UI within a package where necessary. Size is relative effort, not a promised line count or delivery date. No implementation dates were requested or estimated without a verified baseline.

| Package | Work and deliverable | Size | Depends on | Exit gate |
| --- | --- | --- | --- | --- |
| P0 | Approve this plan; snapshot dirty tree without discarding it; effective writer/grant inventory; local baseline; master PRD/technical decision updates and new ADR for draft/publication/privacy rules. | M | Approval | Exact mutation authority, compatibility report and release order documented. |
| P1 | Repair mutation boundary: complete authorized job RPC writers, revoke direct bypasses, active membership/job checks, safe deletion, primary-assignment consistency. | L | P0 | Role/tenant/direct-REST negative tests pass; existing request conversion/collaboration still work. |
| P2 | Versioned operation receipts; split draft/publication schemas; durable incomplete draft config; atomic save-and-publish; stale/retry recovery and actionable API errors. | L | P1 | Minimal draft, changed-payload conflict, lost-response retry, stale publish and partial failure tests pass. |
| P3 | Publication readiness, deadline/time-zone cutoff and controlled extension, first-publication versus resume distinction, acceptance predicate at every boundary, contextual link/success state. | L | P2 | Invalid publish blocked; exact cutoff rejects intake; pause/resume works without duplicate publication events. |
| P4 | UI recovery and foundational accessibility: dirty guard, Save draft behavior, error summary/focus, navigation/context, progress, controlled step validation, editor semantic parity. | M–L | P2 | All close/navigation paths and keyboard error recovery verified. |
| P5 | Organization usability/matching and Essentials: country/website, similarity warnings, selected record hydration, hiring reason/contact/reference/start, account/agreement/confidential context. | L | P2 | No duplicate persistence or unauthorized contacts; optional fields stay optional; internal data protected. |
| P6 | Structured role model/UI: arrangement versus hours, department, duration, conditional work location/remote/attendance, schedule/travel/authorization/relocation/reporting, experience, guided descriptions/templates. | L | P3, P5 | Persistence/legacy mapping/publication tests for each field and branch. |
| P7 | Compensation privacy/public projection, exact/range/from/up-to, gross/net, currency/period defaults, benefits/additional compensation, settings. | L | P1, P6 | Direct public/portal access cannot read private budgets; old public salaries remain intentional. |
| P8 | Criteria detail/categories/order and private sourcing/evaluation notes; initial question configuration validation/guardrails and basic templates. | M–L | P3, P6 | Required/preferred preserved; impossible questions blocked; private rationale does not leak. |
| P9 | Shared public presentation/application preview, agency header/logo across career/job/apply/preview, internal review summary, readiness recommendations and publication success. | L | P3–P8 | Contract parity and responsive/browser accessibility gates pass for every conditional field. |
| P10 | Number/date/URL/multi-select answer contracts, stable options, complete candidate/history/screening compatibility. | L | P8–P9 | Full typed-answer round trip and worker compatibility verified before enablement. |
| P11 | Agency question library: role-gated Settings, search/category/archive/version, snapshot/use/copy, reviewed starter content. | L | P8, P10 | Library changes cannot rewrite existing job questions or answers; tenant/retry tests pass. |
| P12 | Complete cross-flow verification, legacy compatibility and migration rehearsal, docs reconciliation, pilot and release evidence. | L | P1–P11 | All release gates in section 10 satisfied; approval-ready deployment handoff. |

Testing accompanies each package. P12 consolidates and exercises interactions; it is not permission to defer all tests until the end. Security fixes do not need to wait for question-library completion. The full program can be delivered in smaller releases, but each enabled surface must be complete and safe with its dependencies.

## 9. Test and acceptance matrix

| ID | Scenario | Required evidence |
| --- | --- | --- |
| T01 | Owner/admin/manager/creator/assigned/unassigned/revoked/cross-tenant/public mutation matrix | DB table/column privileges, direct REST, RPC and API tests. Stale JWT cannot overcome revoked live membership. |
| T02 | Direct insert/update/delete bypass | All prohibited job/requirement/question/workflow/assignment writes fail; intended RPC writes succeed and audit once. |
| T03 | Minimal draft | Organization + title + default openings saves; blank description/workplace/owner/workflow and incomplete custom row recover exactly. Unsafe types/lengths still rejected. |
| T04 | Existing complete draft | Every field, requirement/question ID/order, selected organization and assignment hydrates without loss or silently invented defaults. |
| T05 | Inline organization + job | One transaction; rollback failure creates neither orphan organization nor job; exact reuse preserves organization/contact data; double click creates one job. |
| T06 | Retry binding | Identical retry returns receipt; changed payload conflicts; new save gets new key; ambiguous response reconciles; audit once. |
| T07 | Concurrent editing/publication | Stale expected version cannot save or publish; UI retains inputs; saved-but-unpublished recovery uses fresh version; reviewed version binds children. |
| T08 | Publication readiness | Missing organization/title/description/arrangement/workplace/location/owner/workflow and invalid questions return linked actionable errors; optional sections do not block. |
| T09 | Deadlines | Today inclusive, null deadline, past day, leap day, UTC date crossing, DST transitions and exact exclusive cutoff. New timezone setting does not move old deadline. |
| T10 | Deadline race | Candidate loaded form before cutoff, submits after; database rejects and upload cleanup/reconciliation preserves correct state. No late applications through raw RPC. |
| T11 | Lifecycle | Pause makes role ineligible; resume restores acceptance when valid; past deadline blocks resume; authorized versioned deadline extension enables deliberate recovery without automatically resuming; repeated publication/resume has one intended audit effect and stable URL. |
| T12 | Organization usability | Bare-domain normalization, invalid URL/country, optional fields, enrichment timeout, manual fallback, cancellation/stale responses, near duplicates, reuse, initial list misses selected org. |
| T13 | Domain fields | Every table in section 6 has create/edit/review/public or private round-trip coverage; changing conditional choices clears/preserves only intended values. |
| T14 | Employment/legacy | Full-time does not imply permanent; contract duration explicit; seniority/department/old salary preserved; unknown legacy text reported. |
| T15 | Compensation | Exact/range/from/up-to, decimal hourly pay, currency/basis/period, zero/negative/overflow/inverted range, hidden/custom-public-text modes, removal and old null periods. |
| T16 | Information exposure | Public REST/projection, rendered HTML, serialized Server Component payload, network responses, portal and logs expose no internal budgets/contacts/reasons/notes/evaluation text. |
| T17 | Criteria | Optional empty list; categories/details/order; required versus preferred; stable snapshots; no changed historical AI evidence or automatic decisions. |
| T18 | Question configuration | Zero/one/duplicate/blank choices; max limits; type change; reorder; required Boolean false; hidden options cleared; warnings and effort estimate. |
| T19 | Answer types | All 8 types valid/invalid/blank/required cases; URL scheme, date validity, decimal normalization, multi-select bounds/duplicates/unknown option, foreign/duplicate question IDs. |
| T20 | Intake/history | Synthetic answers of all supported types persist to the correct application, display in recruiter history, and remain compatible with screening readers. Full payload/file hash retries stay bound. |
| T21 | Library | Role gates, tenant bounds, search/empty/error, retry/version conflicts, archive and copy, origin metadata, existing published questions unaffected. |
| T22 | Preview parity | Public role/applicant control contract matches Review and saved preview; logo fallback/replacement, consent, résumé types/limit, help/options/required state, compensation visibility. |
| T23 | Preview non-submission | UI disabled submit plus server-boundary refusal before publication; inaccessible to other agency/portal/public users. |
| T24 | Dismissal/recovery | Close, Cancel, Escape, backdrop, Back/Forward, route return, reload; dirty changes including editor/options/removal; Save/Discard/Keep; network failure; in-flight requests. |
| T25 | Accessibility | Keyboard steps/date picker/options/editor/dialog; associated errors/labels; scoped first-error and summary focus; live async state; launcher focus return; real screen-reader run. |
| T26 | Responsive rendering | 375px, landscape, tablet, desktop, 200% zoom/reflow, long content, contained scroll, focus visibility above footer, reduced motion/high contrast. |
| T27 | Complete recruiter journey | Overview and Jobs entry; scratch/template; saved and inline organization; multiple openings; save/edit/preview/publish; copy job and apply links; public synthetic submission; correct inbox. |
| T28 | Providers/history | AI/email/enrichment disabled in local browser fixtures; provider failure cannot undo valid application. No publication/stage-change automatic emails or screening decisions. |
| T29 | Request conversion | Optional request converts once to editable draft; provenance, same-org/headcount, readiness, permissions and history remain correct. |
| T30 | Workspace race | Open forms in two workspaces, switch preference elsewhere, save original job/defaults/library/contact against original explicit tenant only. |
| T31 | Migration/replay | Clean local replay, upgrade with representative legacy fixtures, forward constraints, generated types, function lint/advisors, no hosted-helper portability regression. |
| T32 | Operational regression | Summary card definitions/filters unchanged, quiet/first-use states preserved, old queues visible, safe empty deletion and revoked collaboration remain correct. |

Use Vitest for schemas/predicates/meaningful component behavior, pgTAP/database assertions for authority/constraints/atomicity, integration checks for API/receipt contracts, and Playwright for the complete authenticated/public workflows. Run axe on creation/review/apply and manually test keyboard/screen-reader behavior; axe alone does not establish WCAG conformance.

## 10. Release gates and verification commands

Before handing off the complete feature:

```text
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run db:test
npm run test:e2e:local
npm run build
```

The project lists `npm run test:e2e`; authenticated fixtures must use the isolated `test:e2e:local` repository wrapper so providers and real staging data are excluded. Report this substitution explicitly. Discover Supabase CLI commands with `--help`, use repository local start/reset scripts, and ensure the complete disposable local stack is available before browser fixtures; the lightweight `db:start` excludes API/Auth/Storage and cannot alone satisfy that wrapper. Never reset staging. Run worker tests when answer readers/processing change.

Release gates:

1. Approved policies reflected in master PRD, technical PRD and the relevant new ADR; no unrecorded exception.
2. P1 authorization tests and T16 exposure tests pass before new private fields can be used.
3. Schema and application deploy compatibility rehearsed using legacy fixtures and exact generated types.
4. All supported question types verified through receipt hashing, intake, stored answers, reviewer history and compatible worker parsing before enablement.
5. Complete scratch/template/saved/inline/publish/apply journey recorded with synthetic browser evidence at phone and desktop widths.
6. Deadline cutover report reviewed; invalid old questions/workflows/currencies addressed without fabricating data or erasing history.
7. Required checks pass; failures and environment blocks listed with exact commands/reasons. Unrun checks are never reported passed.
8. Final scope register marks each item delivered or names an explicit separately approved deferral. No recommendation disappears into an untracked “later.”

## 11. Rollout and rollback

1. Finish local implementation and tests in dependency order. Preserve all existing dirty files and distinguish user changes from this program's edits.
2. Prepare additive migrations, compatible readers/writers and the raw-public-access transition before enabling new private data. Use local-only work for rehearsals.
3. Security fixes ship independently when verified; do not hide a known authorization repair behind a UX flag.
4. Gate new content UI/question types through a small server-side capability setting only if staged rollout is needed. A flag controls exposure, never authorization. Do not add a general feature-flag service.
5. Pilot with synthetic jobs in an opted-in workspace; recruit actual recruiter feedback using approved data. Any live deployment or provider evaluation is a separate release action.
6. Release deterministic improvements, then richer types and library only after their readers are deployed. Record exactly which packages are enabled.
7. Roll back UI capability if save/publish/intake errors or unintended exposure appear. Retain additive schema/receipts/history; use forward repair migrations. Never restore broad table-write grants or raw private-field exposure as a rollback tactic.
8. Preserve historical answer readers for disabled question types. Do not hide or corrupt already submitted answers when UI creation of that type is disabled.

## 12. Risks, dependencies, and assumptions

| Risk | Assessment | Mitigation |
| --- | --- | --- |
| Scope makes a quick form overwhelming | High usability risk | Minimal draft; conditional details; collapsible optional content; warnings distinct from blockers; pilot task timing. |
| New private data shares a public-readable table | High security risk | Safe public projection plus separately protected private relations; test raw REST and serialized payloads. |
| Revoking writes breaks hidden callers | High engineering risk | Inventory all writers first; supply RPC replacements and integration regression tests before revoke rollout. |
| Legacy jobs fail new completeness requirements | High compatibility risk | Read-only impact report, legacy maps, new-publication enforcement and explicit repair path, no invented values. |
| Workflow UI promises behavior the app does not implement | Medium product risk | Show actual snapshot/type semantics; keep current applicant operation contract; do not imply custom stage engine. |
| New answers break workers/retries/history | High engineering risk | Version contract, canonical payload binding, compatibility deploy and full typed round trip before enablement. |
| “Required” criteria or questions imply automated rejection | Medium product risk | Evidence-only guidance and tests preserving human decisions. |
| Compliance copy creates false assurance | Medium viability risk | General privacy/content guidance; no legal certification or global rule engine. Obtain jurisdiction review separately if required. |
| Dirty worktree overlaps most implementation files | High coordination risk | Read diffs before every overlapping edit; preserve user changes; no reset/checkout cleanup. |
| Provider availability mistaken for dependency | Low/medium operational risk | Manual entry always available; no new providers or geocoding; tests disable external services. |

Dependencies are the existing Next.js 16.4/React 19/TypeScript/Tailwind/Base UI stack and local Supabase/test runtime. Reuse current OpenAI/Resend adapters without expanding their use. No additional background runner, job-board integration, external directory license, or analytics service is needed for the proposed deterministic implementation.

## 13. Master-document changes at implementation time

Update both masters as each approved slice is implemented, keeping one coherent description rather than appending contradictory notes:

- Product §§5.1–5.2, F02–F04: minimal drafting, employment/hours model, restored optional department, conditional role fields, question rules/types/library, compensation visibility, exact preview, deadline behavior and unsaved recovery.
- Product roles/access: creator/assignment publication policy, manager defaults/library access and contact-versus-membership distinction.
- Technical §§4.2/4.4, 5.2–5.3, 8.1–8.3: storage/public projection, transactional publication/receipts, effective privileges, deadlines/time zones and answer contracts.
- Technical testing sections and implemented workspace details: actual modal dimensions, safe local verification, full journey and migration compatibility.
- New decision record: rationale and trade-offs for draft config, public/private separation, publication/lifecycle authority, retry receipts and cutoff semantics. Cross-reference ADRs 0001/0002/0004/0005 without rewriting their historical implementation evidence.
- Resolve stale organization-lookup text saying provider access is unresolved when later sections document implemented Brandfetch behavior; describe current capability and explicit storage permission consistently.

## 14. Complete audit coverage register

`A` references the complete-flow audit; `B` references the form-content audit. “Implement” covers the full program; “Preserve/test” records existing strengths that must not regress. “Separate gate” is an explicit disposition, not an overlooked finding.

| ID | Original finding/recommendation | Disposition and package | Acceptance |
| --- | --- | --- | --- |
| A01 | Broad direct table writes bypass services | Implement P1; inventory/revoke and replace callers | T01–T02 |
| A02 | Agency-wide recruiter publication and duplicate publication events | Implement P1–P3; job authority, first publish vs resume, receipt | T01, T06–T08, T11 |
| A03 | Expired roles published/accepting applications | Implement P3; calendar already helps, all boundaries need cutoff | T09–T10 |
| A04 | Save draft uses complete schema | Approved policy change D01–D02, P2/P4 | T03–T04 |
| A05 | Silent discard / autosave suggestion | Implement explicit recovery P4; autosave separate gate after receipt model | T24 |
| A06 | Employment/location/owner/workflow readiness | Implement P2–P3/P6; retain default owner; optional deadline deliberate | T08, T13–T14 |
| A07 | Impossible empty single-select | Implement P3/P8 | T18–T20 |
| A08 | Preview not exact / agency identity omitted | Implement P9 | T22–T23 |
| A09 | Generic building icon instead of agency logo | Implement P9; shared agency header and fallback | T22, T26 |
| A10 | Weak public content guidance/generic templates | Implement deterministic warnings/guided content P6/P9; AI assistance separate gate | T08, T13 |
| A11 | Near-duplicate organization guidance | Implement P5; normalized bounded advisory matching, no auto merge | T05, T12 |
| A12 | Progress generic div semantics | Implement P4 | T25 |
| A13 | Document-wide invalid-field selector | Implement P4; scoped linked summary/errors | T24–T25 |
| A14 | Autocomplete consistency | Implement P4/P9 | T25 |
| A15 | Hardcoded NGN/monthly | Implement P7; workspace defaults, existing-job preservation | T15, T30 |
| A16 | Salary public policy unclear | Implement P7; explicit disclosure and DB privacy | T15–T16 |
| A17 | Employment strings not stable codes | Implement P6 with compatibility | T14, T31 |
| A18 | Full recruiter create-to-apply browser flow absent | Implement across P1–P12 | T27 |
| A19 | Unassigned recruiter negative tests absent | Implement P1 | T01–T02 |
| A20 | Expiry/single-select/unsaved/preview tests absent | Implement P3–P9 | T09–T10, T18, T22–T25 |
| A21 | Mobile/zoom/incomplete-draft tests absent | Implement P2/P4/P12 | T03, T26 |
| A22 | Broad grants require DB-negative tests | Implement P1/P12 | T01–T02, T31 |
| A23 | Atomic organizations/headcount/private docs/idempotency strengths | Preserve/test all packages | T05–T06, T16, T27–T29 |
| B01 | Country code technical language | Implement country selector P5 | T12 |
| B02 | Head-office vs public job location | Implement wording/conditional prefill P5–P6 | T12–T13 |
| B03 | Bare domain rejected | Implement safe normalization P5 | T12 |
| B04 | Hiring contact/account manager/status/agreement/confidentiality context | Implement optional contact and context P5; agreement reference/status only; full agreement lifecycle separate gate | T05, T13, T16 |
| B05 | Public title guidance | Implement P5 | T13 |
| B06 | Internal requisition/reference | Implement private field P5 | T13, T16 |
| B07 | Openings default/high-value warning/review | Preserve and improve P5/P9; proposed warning threshold 100+ | T05, T13, T27 |
| B08 | Hiring reason/confidential replacement | Implement internal context P5 | T13, T16 |
| B09 | Target start / flexible | Implement P5 | T09, T13 |
| B10 | Hiring manager/contact with optional draft | Implement optional contact P5; never require account to publish | T01, T05, T13 |
| B11 | Oversized undirected description | Implement guided optional sections P6 | T13, T25–T26 |
| B12 | Generic role templates | Implement reviewed structural examples P6 | T13, T27 |
| B13 | Content quality, unresolved prompts, discriminatory wording | Deterministic factual warnings and concise inclusive-content guidance P6/P9; automated linguistic/AI classification separate gate | T08, T13 |
| B14 | Department omitted | Intentional existing policy, proposed optional restoration D08/P6 | T04, T13–T14 |
| B15 | Employment type mixes duration/hours | Implement two-dimension model P6 | T14 |
| B16 | Remote countries/time zone/attendance/travel unknown | Implement conditional eligibility/time-zone/detail fields P6 | T13, T22 |
| B17 | Hybrid days/location | Implement P6; required location, recommended attendance detail | T08, T13 |
| B18 | Exact address/public location | Implement public location wording and private address separation P5–P6 | T13, T16 |
| B19 | Closing date inclusive/time zone/auto-close/reopen semantics | Implement D04–D05/P3; intake cutoff, no invented filled/closed lifecycle | T09–T11 |
| B20 | Compensation visibility | Implement P7 | T15–T16 |
| B21 | Gross/net | Implement P7 | T15 |
| B22 | Commission/bonus/equity/allowances/benefits | Implement optional factual text P7 | T13, T15–T16 |
| B23 | Workspace currency default | Implement P7 | T15, T30 |
| B24 | Exact/range/from/up-to | Implement P7 | T15 |
| B25 | Experience as guidance not decision | Implement copy and preserve human screening boundary P6 | T13, T17, T28 |
| B26 | Broader seniority choices | Implement stable optional taxonomy P6 | T14, T31 |
| B27 | Contract duration | Implement conditional field P6 | T08, T13–T14 |
| B28 | Shift/working schedule | Implement optional details P6 | T13, T26 |
| B29 | Travel expectations | Implement P6 | T13 |
| B30 | Work authorization/sponsorship/relocation | Implement factual optional policy P6; no automatic rejection | T13, T28 |
| B31 | Reporting line | Implement role-title field P6 | T13, T16 |
| B32 | Benefits should not be unpredictably buried | Implement structured optional public text P7 | T13, T22 |
| B33 | Criterion detail/evidence missing from UI | Implement P8 | T17 |
| B34 | Criteria categories | Implement P8 | T17 |
| B35 | Criteria ordering | Implement accessible reorder P8 | T17, T25 |
| B36 | Required vs preferred guidance | Implement P8 | T17 |
| B37 | Internal sourcing vs public requirements | Implement private brief P8 | T16–T17 |
| B38 | Questions' purpose and duplicate standard fields | Implement concise help P8 | T18, T22 |
| B39 | Reusable question bank | Implement full library P11 | T21 |
| B40 | Number/date/URL/multi-select / multiple-choice terminology | Implement P10; single-choice already represents multiple-choice-one-answer | T19–T20 |
| B41 | Knockout questions / no silent rejection | Preserve evidence-only boundary P8/P10; no rejection engine | T20, T28 |
| B42 | Excess required long answers / effort estimate | Implement warnings P8/P9 | T18, T22 |
| B43 | Empty/duplicate/blank/ordered options; type changes | Implement P8/P10 | T18–T19 |
| B44 | Sensitive/protected information guidance | Implement concise privacy/data-minimization help P8; local legal policy approval separate | T18, T25 |
| B45 | Internal per-question rationale | Implement protected optional evaluation note P8 | T16–T17 |
| B46 | Lead owner helper/default/assign later/active validation | Implement P1–P4/P8 | T01, T03, T08 |
| B47 | Recruiter availability / separate sourcer | Active state included P8; workload availability/routing and separate sourcing ownership need separate gate | T01, T08 |
| B48 | Workflow stage preview/default/snapshot explanation | Implement P3/P8 | T04, T08, T22 |
| B49 | Priority meanings/internal/date context | Implement P8/P9 | T13, T16 |
| B50 | Four-step structure with conditional details | Implement P4–P9 | T24–T27 |
| B51 | Internal setup summary/review publishing consequences | Implement P9 | T16, T22 |
| B52 | Optional collaborators | Reuse existing explicit post-save controls P5/P9; no automatic invite | T01, T28–T29 |
| B53 | Publication blockers distinct from recommendations | Implement P3/P9 | T08, T22 |
| B54 | Capture incomplete vacancy quickly, deliberate publish | Implement D01–D03 and validate usability hypothesis | T03, T08, T27 |

Additional findings discovered during planning and required for the earlier recommendations to work:

| ID | Integration concern | Planned response |
| --- | --- | --- |
| C01 | PATCH-save followed by independent publish can leave stale retry/version state | Atomic orchestrator and receipt/version handling, P2. |
| C02 | Current retry keys can return earlier successful edits without binding changed payload | Actor/resource/operation/payload-bound receipts, P2. |
| C03 | Reopen can set status open without restoring `accepting_applications` | Explicit resume transaction, eligibility/concurrency tests, P3. |
| C04 | Preview organization name may use initial options instead of selected search result | Hydrate/use full selected organization regardless of initial pagination, P5/P9. |
| C05 | New internal budgets/notes cannot safely share existing public raw-select exposure | Public projection and private relations before UI/data entry, P1/P7. |
| C06 | Existing editor accepts more Markdown than simplistic public renderer handles | Shared safe supported renderer and semantic lists/headings, P4/P9. |
| C07 | Metadata/workflow/answer changes can misrepresent current screening capability | Preserve snapshot contracts, version inputs, compatible readers before enablement, P8/P10. |
| C08 | Public query selects new experience/seniority/period columns without explicit anonymous grants in the adding migrations | P1 tests clean-replay public reads and aligns only intended public columns/projection; no table-wide grant shortcut. Static finding, pending runtime verification. |
| C09 | Lifecycle assignment branch can authorize an old assignment without a live active membership check | P1 requires active actor/agency/role as well as assignment and includes revoked-member negative tests. |
| C10 | Conversion returns prior job before authorization and auto-grants employer members access | P1 authorizes before receipt and preserves explicit grants; P2/P3 coordinate converted drafts/readiness. See P0 baseline for exact current function. |

### Explicit separate gates

These suggestions are retained with concrete prerequisites. They are not required to complete the deterministic scope P0–P12, and approval of that scope does not claim they have shipped.

| Capability | Prerequisite / proposed next design |
| --- | --- |
| Autosave | After P2/P4: decide save trigger/debounce, conflict handling, recoverability, retention and cross-device behavior; use same version/receipt contract. No browser-local persistence of private briefs by default. |
| AI content suggestions | Explicit opt-in, approved data use and evaluation; suggestions only, recruiter acceptance required; no new automatic stage/email behavior. Deterministic guidance ships first. |
| Anonymous-employer publication | Define public employer identity policy, organization RLS/projection and portal effects; internal “confidential replacement” flag alone must not promise anonymous ads. |
| Full recruitment agreements | Current plan supports optional reference/status. Upload/signature/version/expiry/fees and mandatory authorization-to-recruit checks need their own domain policy. |
| Recruiter availability/workload routing | Define workload source, availability ownership, reassignment authority and queue semantics; active-member validation is included now. |
| Separate sourcing recruiter | Define secondary assignment role/permissions and ownership notifications; current primary/collaborator semantics remain intact. |
| Formal knockout/eligibility flags | Define human-review flagging only, candidate messaging and jurisdiction rules; no automated rejection or stage movement. |
| Job-board distribution/reporting expansion | Stable codes prepare for it; no syndication provider, pricing, mapping or posting contract is authorized here. |
| Interviews, offers, placements, automatic merger | Existing separate milestones; preserve data compatibility and operational history. |

## 15. Approval and open items

The owner authorized P0, P1, and continued local implementation of the improved flow. The owner may amend a decision by ID before implementation. Separate release and provider gates remain explicit.

- [x] Project owner authorizes first phase P0 (2026-10-30).
- [x] Project owner authorizes continued local product implementation.
- [ ] At release: review legacy deadline/question/salary impact report before applying changed public-intake/privacy policies to existing records.
- [ ] At pilot: collect timing/completion baselines; no analytics targets are fabricated in advance.

There are no unresolved engineering choices requiring a new service or paid provider. If runtime evidence contradicts the current static findings or a package requires broader authorization, update this document with the evidence and obtain direction only for that specific change.

### P0 execution evidence

- [ADR 0006](../decisions/0006-job-drafting-publication-and-data-boundaries.md): target authority matrix, draft/publication/storage/receipt/deadline/answer decisions and release order.
- [P0 inventory and baseline](../verification/create-job-p0-baseline.md): current callers/writers, expected source privileges, fixture dependencies, compatibility findings and exact checks/limits.
- [Pre-edit worktree manifest](../verification/create-job-p0-preexisting-worktree.json): 100 original changed/untracked files with SHA-256 and status; an integrity record, not a content backup.
- [Read-only catalog inventory](../verification/create-job-p0-permission-inventory.sql): prepared for disposable local runtime inspection; not executed while Docker/Postgres are unavailable.
- P0 complete with evidence limits: lint, TypeScript, production build and 186 unit tests passed (14 skipped); all 97 original non-overlapping files match the preservation manifest. New/touched documentation passes formatting/whitespace checks. Repository-wide formatting has two pre-existing failures. DB/browser/catalog verification requires a running disposable Docker/Supabase stack and remains a P1 prerequisite.

## References and change log

- Repository master PRDs and `docs/decisions/0005-recruiter-hardening-and-collaboration.md` establish product, history and safe verification constraints.
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) and [database functions](https://supabase.com/docs/guides/database/functions) support the grant/RLS and privileged-operation review. Consult current docs again before implementing database changes. The changelog Markdown fetch was unavailable through the browsing tool during planning; no schema changes were attempted.
- The create-prd skill structured goals, decisions, scope, testing, rollout and sign-off; its generic company-context placeholders are superseded by this repository's master documents and AGENTS.md.

| Date | Version | Change |
| --- | --- | --- |
| 2026-10-30 | 0.1 | Consolidated both audits, qualified existing policy decisions, added full field/technical/test specifications, package dependencies and complete traceability register. Awaiting approval. |
| 2026-10-30 | 0.2 | First-phase P0 authorized; added master PRD/ADR target contracts, preservation manifest, writer/grant/compatibility inventory, runtime inspection SQL and baseline evidence. P1–P12 remain pending. |

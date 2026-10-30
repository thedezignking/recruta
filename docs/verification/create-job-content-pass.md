# Job-content priority pass

October 30, 2026. Local implementation of the owner's fourteen priority content changes. No remote deployment is claimed.

| Request | Implemented behavior |
| --- | --- |
| 1. Arrangement versus hours | Separate stable arrangement and hours fields. Legacy Full-time/Part-time maps to hours without inventing permanent employment. |
| 2. Physical location | On-site/hybrid publication requires location in UI validation and the database RPC. Drafts may remain incomplete. |
| 3. Remote eligibility | Explicit anywhere/restricted choice, with required details for restricted locations/time zones. Rendered publicly and in preview. |
| 4. Department/team | Restored optional field remains persisted and visible in the role presentation. |
| 5. Hiring reason/start | Optional hiring-reason choice and calendar start date in the protected internal brief; restored in drafts. |
| 6. Contract duration | Conditional duration/end-point text for fixed-term/temporary arrangements, required on publication. |
| 7. Salary visibility/basis | Show amount, keep internal, or show Salary negotiable; Gross/Net/Not specified. Hidden amounts live in a protected brief; public amount columns are null and constrained. Existing public salaries retain visibility. |
| 8. Criterion descriptions | Optional evidence/detail inputs remain saved and rendered with public criteria. |
| 9. Question guardrails | Job-relevance/privacy guidance, optional defaults, long-form warnings, maximum counts, 2–20 distinct nonblank choices, newline-separated options preserving commas, and confirmation before removing choices on type change. |
| 10. Workflow preview | Ordered stage names and approval markers in Hiring setup; stage summary in Review. |
| 11. Priority definitions | Concrete Low/Normal/High/Urgent guidance beside the selector and in internal review. |
| 12. Readiness checklist | Linked field issues and ready state check role content, conditional location/duration/eligibility, questions, active lead and usable workflow. New-job RPCs enforce those conditions. |
| 13. Agency library | Role-gated Settings editor; create/edit/archive, categories/search, starter examples and version conflicts. Job copies remain independent snapshots. Explicit workspace IDs, retry receipts, uniqueness and audit protect writes. Uses the existing four answer types. |
| 14. Sourcing brief | Internal sourcing text separate from public description, with job-scoped RLS and no anonymous/employer access. |

## Storage and compatibility

Forward migration: `20261030163606_job_content_and_question_library.sql`. Public role fields remain in `jobs`; private details/budgets use `job_internal_briefs`; reusable questions use `screening_question_library`; mutation receipts use the unexposed private schema. Direct authenticated writes remain revoked. Database types were regenerated locally.

Legacy published roles are not forcibly unpublished. Employment text is retained; canonical hours/arrangement backfill is explicit. A legacy draft must have its missing arrangement and conditional content reviewed before publication. Candidate stages, hiring decisions, providers and emails do not change.

This is not the entire audit program. Atomic job save-and-publish receipts, browser Back/Forward recovery, frozen-zone deadline cutoffs, complete compensation amount-shape/custom-text controls, additional role fields, richer answer types and broader library pagination remain tracked in the plan.

## Verification

- Clean local replay passed. All 347 database assertions passed across 11 files, including direct-RPC publication checks, private-budget isolation and editing/visibility transitions, employer/anonymous denial, library retry/conflict/authorization, archive snapshot protection and stale versions.
- Local security advisor: no issues at warning/error level.
- Full unit suite: 209 passed, 14 skipped across 54 passing files and one skipped file. Lint and production build passed. Repository formatting retains one pre-existing failure in `.claude/launch.json`; modified implementation files and whitespace checks pass.
- Complete desktop content journey passed, including Settings editing, library copy/archive, private brief/budget restoration, public salary isolation and candidate question rendering.
- Visual review found retained scroll position on step changes and overlapping mobile navigation. Review now starts at the checklist, and the mobile form uses an explicit navigation row above its scrollable content. The scroll reset has a passing component regression test.
- Final form regression subset: all 5 tests passed, including the new review-scroll check. Final production rebuild and TypeScript passed after the mobile layout correction.
- Final full browser suite: all 26 tests passed across desktop and mobile (3.0 minutes). Coverage includes Settings editing, library use/archive, private salary and brief persistence, public projection, contract duration, candidate questions, applicant operations, collaboration and workspace switching/access revocation. Desktop and mobile review screenshots were visually inspected.

Browser fixtures use synthetic records in disposable local Supabase with external providers disabled.

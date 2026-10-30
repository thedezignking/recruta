# Build gap checklist

Date: October 30, 2026. Purpose: a single actionable list of the gaps between the current local build and the product defined in the two master PRDs and the ADRs. Derived from an audit of the working tree, migrations, and verification records — not a deployment claim.

Severity key:
- **S1** — blocks trusting or shipping the current work (operational / integrity).
- **S2** — required by the active target contract (ADR 0006) but not yet built.
- **S3** — on the roadmap, correctly deferred; listed so nothing is forgotten.

Status key: `[ ]` open · `[~]` partial · `[x]` done.

---

## 1. Operational and hygiene (S1)

- [ ] **Commit the in-flight work.** ~36 modified + ~34 new files (all of Milestone 4 collaboration and the entire create-job / ADR 0006 slice) sit uncommitted on `main`'s working tree. Checkpoint to a branch before anything else. (Risk: a single reset/checkout loses it.)
- [ ] **Coordinate the parallel editor.** The tree changed mid-session (migrations renamed, three new ones landed); the repo is owned by `CodexSandboxOffline`. Two writers on one tree can clobber each other — agree on who owns which files, or commit frequently to checkpoint.
- [ ] **Remove workspace litter before committing.** ~47 `build*.out`, 11 `typecheck*.out`, and scratch `*.txt` files in the repo root. Gitignore or delete.
- [ ] **Run DB + e2e on a real stack.** `npm run db:test` and `npm run test:e2e` did not run this session because Docker Desktop would not start. The verification docs report them passing on disposable local Supabase; re-confirm on a running stack before treating green as current.
- [ ] **Resolve the `.claude/launch.json` format-check failure** (local tool config, not project code — gitignore or format). Verification docs also note a second pre-existing formatting failure in `new-job-form.test.tsx` to confirm resolved.
- [ ] **Decide on `src/app/preview/`.** Confirmed in the build as the authenticated read-only draft preview (`/preview/jobs/[id]`), not debug code — just confirm it ships gated.

## 2. Create-job / ADR 0006 — remaining target packages (S2)

Boundary work already landed and verified locally: revoked direct writes on job aggregate tables, `job_internal_briefs` with RLS, DB-enforced `hidden_salary_projection` constraint, draft capture, arrangement-vs-hours split, conditional location/remote eligibility, readiness checklist, question library with snapshot semantics, deadline picker. Remaining:

- [ ] **Atomic save-and-publish receipts** (ADR 0006 Decision 3). The two-request PATCH-then-publish partial-success path still exists; replace with one atomic operation returning a payload-bound receipt (same key/same payload → original receipt; same key/different payload → conflict).
- [ ] **Explicitly unassigned / ownerless drafts** (Decision 2). "Assign later" and organization-free/auto-untitled drafts are still out of scope; current `create_manual_job` defaults the lead to the actor.
- [ ] **Full closing-date cutoff semantics** (Decision 5). Frozen per-job IANA zone, exclusive next-local-day UTC cutoff, DST/race enforcement in list/job/apply reads and authoritative submission; versioned deadline extension with audit. Impact review of existing deadline instants before cutover.
- [ ] **Browser Back/Forward recovery** for an in-progress draft (native unload warning exists; history recovery pending).
- [ ] **Richer answer types** — number/date/URL/multi-select (Decision 6). Must reach forms, parser/schema, SQL persistence, canonical receipt hashing, history/correction UI, intake validation, and screening readers *before* they can be published. Only the four base types ship today.
- [ ] **Shared faithful candidate-control preview** reused between Review and the public apply page (currently separate renderings).
- [ ] **Complete compensation controls** — exact/range/from/up-to shapes, recruiter-authored public text, benefits/additional compensation, workspace defaults/settings prefill.
- [ ] **Question library pagination** for large libraries.
- [ ] **Confirm historical direct-write grants are fully closed.** Static inspection shows aggregate-table revokes in place; the plan flags that *deployed* privileges, inherited/PUBLIC grants, and overloaded function signatures still need negative-authorization verification on a real stack (plan items C08, and finding at line 38).
- [ ] **Release verification T01–T32** (plan acceptance criteria). Highest-risk gates: direct table/API/RPC negative authorization, revoked/cross-tenant access, request-conversion receipt authorization, exact receipt replay/conflict, stale publication, legacy draft recovery, raw public/private projection reads, date/DST/cutoff races, pause/resume, typed-answer history/worker compatibility.

## 3. Product milestones not yet built (S3 — deferred by design)

- [ ] **Public agency website hiring-request CTA + anti-abuse** (PRD §5.7, F10, M4 "still separate"). Portal intake exists; the public-website inbound path and rate-limiting/spam controls do not.
- [ ] **Organization matching on request-to-job conversion** (F10, ADR 0006 line 335). Conversion is idempotent; smarter org matching is pending.
- [ ] **Duplicate candidate/application merge workflow** (F05, M3A). Related applications link to the same candidate without merging; advanced identity merge + bulk operations are explicitly separate.
- [ ] **Milestone 5 — Interviews, offers, placements** (F11). Not started. Placement-confirmation workflow must exist before placements become a dashboard metric ("a filled job is not a confirmed placement").
- [ ] **Milestone 6 — Reporting + integrations** (F12). Not started: time-to-review, time-in-stage, source effectiveness, fill rate, workload; calendar/mailbox/job-board integrations.
- [ ] **Talent-pool / cross-job candidate navigation** as a primary destination (PRD §7.1, open decision).
- [ ] **WhatsApp / SMS channel adapters** (F08, open decision). Email-only today; keep workflow state channel-neutral.

## 4. Release and compliance gates (S1 for real-data use)

- [ ] **Jurisdiction-specific privacy / retention / deletion / lawful-basis policy** before processing real candidate data at scale (PRD §9, Open Decision). Currently synthetic data only.
- [ ] **AI provider live activation** remains gated by configuration, human-reviewed quality evaluation, and privacy review (PRD §11 3B, Open Decision). GPT-6 Luna passed a *smoke* evaluation only — not production accuracy approval.
- [ ] **Worker scheduler activation** stays off without `RECRUTA_WORKERS_ENABLED=true` (ADR 0004). Provider/service keys deliberately not transferred to CI.
- [ ] **Candidate consent copy** reflects the agency role and intended data use per deployment jurisdiction (PRD §9).
- [ ] **No live candidate email / external invitations** until an authorized recipient and deployment gate are cleared (AGENTS.md). Screening never changes stages or sends email — keep that invariant.

---

## Quick-win order

1. Checkpoint the tree (branch + commit), clear litter, resolve format failures — Section 1.
2. Re-run DB + e2e on Docker to confirm the verification docs' current green.
3. Then pick up ADR 0006 Section 2 in the plan's order: receipts → deadline cutoff → richer answer types → shared preview → T01–T32.

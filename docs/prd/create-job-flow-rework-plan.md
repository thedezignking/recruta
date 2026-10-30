# Create-job flow — rework plan

Date: October 30, 2026. Plain-language plan. Borrows Manatal's *calm, less-overwhelming feel* — not its layout. Recruta keeps its preview, private/public data boundary, AI screening, scoped collaboration, and agency/in-house adaptivity.

Decisions locked with the owner:
- **Structure:** one screen + a single "More details" disclosure.
- **Create vs publish:** create light, publish later from the job's own page.
- **Audience:** adapt to team type (agency vs in-house).

## Phase 1 — Light one-screen create (no backend change)

The backend already supports light drafts (`jobDraftSchema`, `publish:false`; create via `POST /api/v1/jobs`). So this phase is UI only.

- New single-screen create form replaces the four-step wizard.
- **Always visible:** Job title (required); organization (agency: pick/create inline; in-house: auto, hidden — see Phase 0).
- **"+ More details"** (collapsed, optional, same screen): location (+ Remote), openings, one employment field, salary (min–max + currency + frequency), short description.
- **Create job** → posts a draft (`publish:false`) → lands on the job page. Keeps inline org creation, idempotency, unsaved-changes guard.
- Everything else (criteria, questions, workflow, priority, lead recruiter, internal brief, experience/seniority, salary privacy/basis, deadline) leaves the create moment.
- Build as a new component, preview live, iterate on feel, then swap in and retire the old wizard.

## Phase 0 — Team type (needs a migration; Docker/Supabase to verify)

- Add `workspace_kind` ('agency' | 'in_house') to agencies, default 'agency'; existing workspaces stay 'agency'.
- Capture it at onboarding; let owners/admins change it in Settings.
- For in-house, `onboard_agency` seeds one default organization (their own company) so jobs still attach to an org under the hood — the user never picks a "client."
- Vocabulary helper keyed by kind (client→company, etc.). Pure TS, build first.

## Phase 2 — Job page becomes "finish & publish"

Everything removed from the create modal has to live here. A draft job's page becomes the job's workspace. Most of this UI already exists (it was in the modal) — Phase 2 is mostly **relocating** those pieces into inline job-page sections, not building from scratch (`publication-readiness`, `publish-job-button`, `job-lifecycle-actions`, `job-collaborators`, `question-library-picker`, `job-content-fields`, `job-description-editor`).

The job page has two modes:

- **Draft mode (setup focus):**
  1. **Header** — title, organization/client, Draft status, openings; title/org editable.
  2. **Readiness-to-publish checklist** (top) — shows exactly what's still needed to publish, each item deep-links to the section that fixes it. Replaces the modal's publish gating.
  3. **Role details** (inline editable) — description (rich editor), employment, workplace + location/remote, contract duration, department, experience, salary + privacy toggle, deadline.
  4. **Application setup** — screening questions (+ library), required candidate fields, optional criteria/requirements.
  5. **Workflow** — pick/confirm the stage pipeline.
  6. **Team & ownership** — lead recruiter / hiring team; hiring-manager collaboration.
  7. **Internal brief** (collapsed, private) — hiring reason, target start, contact, sourcing notes, reference, priority.
  8. **Publish** — one action; enforces the real publish requirements + the public/private boundary at the DB (unchanged). Public preview + copyable job/apply links on success.

- **Published mode (operations focus):** applications, pipeline/stages, activity, lifecycle (pause/reopen/close), links — with details still editable.

**Open design choice:** the cleanest pattern is a readiness checklist at the top that deep-links to inline-editable sections, with Publish gated on readiness (vs. a separate guided "setup wizard", or purely free-form sections). Recommend the checklist + inline sections.

## Phase 3 — Collapse over-built fields

- One employment field for input (legacy mapping kept, no history rewrite).
- Salary simple by default; "Hide / Negotiable" + gross/net behind a small toggle.
- One optional experience signal instead of years + seniority.

## After

- Reconcile ADR 0006 / master PRDs to this flow (it intentionally diverges from "atomic save-and-publish").

## Sequencing

Phase 1 first (biggest visible win, no backend risk, agency mode works today) → Phase 0 (team type, when Docker is up) → wire in-house adaptivity → Phase 2 → Phase 3.

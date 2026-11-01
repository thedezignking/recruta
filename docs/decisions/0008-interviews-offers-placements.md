# ADR 0008: Interviews, offers and placements

Status: Accepted, in progress (November 1, 2026)

Built in the first slice: the `interviews`, `offers`, `placements` and `placement_fees` tables with RLS; `manage_pipeline` for every write; the Interviews tab and the Offer/Placement card on the application page; and the Openings panel on the job page. Interviewers are agency members plus free-text guests. Still to do: email templates and `.ics`, portal visibility, Needs attention items, the Overview placements metric and the Playwright journey.

## Context

The pipeline already has `interview`, `offer` and `placed` stages, but they are labels only. A recruiter cannot book an interview, record what was offered, or say which opening a person filled. `review_application` refuses to mark a placement because nothing would prove it. Jobs carry `positions_required`, so a job with three openings needs three placements before it is filled.

This milestone completes the loop agencies are paid for, and it unlocks a placements metric on Overview.

## Decisions

### 1. Interviews

New table `interviews` (tenant-owned, RLS through `private.can_review_application`):

- `application_id`, `round` (1, 2, 3…), `title` ("First interview", "Client panel")
- `starts_at`, `ends_at`, `timezone`
- `format`: `video`, `phone` or `in_person`; `location_or_link`
- `status`: `scheduled`, `completed`, `cancelled`, `no_show`
- `participants`: agency members, plus client contacts or portal users who have access to the job
- `outcome`: `advance`, `hold` or `decline`, with a required note when completed. The outcome is a recommendation; it never moves the stage.

Rules:

- Scheduling is allowed from `shortlisted`, `client_review` and `interview`. The first scheduled interview offers (not forces) a move to `interview`.
- Rescheduling keeps one row and records the change in activity history. Cancelling needs a reason.
- An `.ics` invite is attached to the candidate email. Calendar sync is Milestone 6.
- Portal reviewers see interviews for candidates shared with them and can leave structured feedback through the existing `submission_feedback` path.

### 2. Offers

New table `offers`, one active offer per application:

- `status`: `draft`, `extended`, `accepted`, `declined`, `withdrawn`, `expired`
- `salary_amount`, `currency`, `salary_period`, `start_date`, `expires_at`, `notes`
- Every status change is audited. Accepting needs a confirmed start date.
- Extending an offer is allowed from `interview` or `offer` and moves the application to `offer` in the same transaction, with a reason.
- Offer letters stay outside Recruta in this milestone. The recruiter records the terms, and an optional "Offer sent" email template is queued only on confirmation.

### 3. Placements

New table `placements`:

- `application_id` (unique), `job_id`, `opening_number` (1…`positions_required`, unique per job), `offer_id`
- `start_date`, `status`: `pending_start`, `started`, `fell_through`
- Optional `fee_amount` and `fee_currency`, visible only to owners and administrators. Invoicing is out of scope.

Rules:

- A placement can be created only from an `accepted` offer. Creating it moves the application to `placed` through `review_application`, which now accepts `placed` only with a placement id.
- When placements with `pending_start` or `started` equal `positions_required`, the job moves to `filled`. A placement that falls through reopens the opening and the job.
- `fell_through` keeps the row for history, needs a reason, and moves the application back to `offer` or `withdrawn` as the recruiter chooses.

### 4. Interface

- Application page: an **Interviews** section with Schedule interview, upcoming and past rounds, and the outcome form. An **Offer** card in the review rail shows terms, status and the next action (Extend, Mark accepted, Record placement).
- Job page: an openings bar ("2 of 3 filled") and a Placements list.
- A new **Interviews** item in the sidebar only after this ships, showing this week's interviews across jobs.
- Overview: Placements becomes a metric once a confirmed start exists. Needs attention adds interviews with no outcome 24 hours after they end, and offers expiring within 48 hours.

### 5. Communications

Three new templates, all queued only after the recruiter confirms: interview invitation (with `.ics`), interview change or cancellation, and offer sent. Stage changes still never send email automatically.

## Delivery order

1. Migration: `interviews`, `offers`, `placements`, RLS, audit triggers, `review_application` change for `placed`. pgTAP for tenancy, one placement per opening, job auto-fill and reopen.
2. Services and `/api/v1/applications/{id}/interviews|offer|placement` routes with stale-version checks and idempotency keys.
3. Application page UI, then the job openings bar.
4. Email templates and `.ics`.
5. Needs attention items and the Overview placements metric.
6. Playwright: schedule → complete → offer → accept → place → job filled.

## Out of scope

Calendar and video integrations, offer letter generation and e-signature, invoicing, and candidate self-scheduling. These belong in Milestone 6.

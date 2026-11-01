# ADR 0009: Website hiring requests

Status: Proposed (November 1, 2026)

## Context

Hiring requests exist today only for invited portal users: `hiring_requests` needs a `client_id` and a signed-in `submitted_by`. Most agency clients will never accept a portal invitation. They find the agency online and want to say "we need two accountants". That lead currently arrives by email and is retyped into a job.

The PRD keeps hiring requests optional. A recruiter can always create a job directly, and nothing here changes that.

## Decisions

### 1. A separate inbound record

Website submissions are untrusted and anonymous, so they do not write to `hiring_requests`. A new table, `hiring_inquiries`, holds them:

- Company: `company_name`, `company_website`
- Contact: `contact_name`, `contact_email`, `contact_phone`, `contact_role`
- Role: `role_title`, `positions_required`, `location`, `work_arrangement`, `employment_type`, `salary_text`, `start_by`, `details`
- `status`: `new`, `in_review`, `converted`, `declined`, `spam`
- Matching and conversion: `matched_client_id`, `converted_request_id`, `converted_job_id`
- Bookkeeping: `consent_at`, `source_url`, `idempotency_key`

Anonymous users have no table access. Submission goes through a `SECURITY DEFINER` function, `submit_hiring_inquiry`, like public applications. Agency managers read inquiries under RLS; recruiters do not.

### 2. Public form

- **Where it lives.** A "Hiring? Tell us about the role" call to action on the agency's careers page leads to `/careers/{agencySlug}/hire`. The page uses the same framed layout as the careers page. Agencies can also link to it from their own website.
- **What it asks.** About the company (name, website). About you (name, work email, phone, role). The role (title, number of hires, location, arrangement, type, budget, start by, details). A consent checkbox.
- **Contacts.** One inquiry can list up to five roles, so a client never has to submit the form twice.
- **Spam protection.**
  - A honeypot field and the per-agency limits in `private.public_intake_limits`, keyed by IP hash and email.
  - Inquiries from free mail domains are allowed but flagged.
  - Spam is cheap to dismiss with a single "Mark as spam" action.
- **After submitting.** A thank-you screen appears, and a confirmation email goes to the contact.
- **Turning it off.** The form is disabled when the agency turns off "Accept hiring requests" in Settings, and that setting is off by default.

### 3. Triage in the workspace

- **Where inquiries appear.** The existing Hiring requests page gains a "Website" tab. New inquiries show in Needs attention and on Overview's hiring requests list, and notify managers.
- **What the page shows.** An inquiry page shows the submission and, from the company name and website domain, suggests matching existing organizations.
- **Actions.**
  - **Create job.** Opens the normal job form prefilled with the role. The recruiter picks or creates the organization inline with the shared company picker and saves a draft job. The inquiry becomes `converted` and links to the job.
  - **Convert to request.** Creates an organization (if needed), an optional contact and a `hiring_requests` row with `submitted_by` null and `source = 'website'`. Use this when the agency wants the request and approval history before opening a job.
  - **Invite to portal.** Optional. Sends a portal invitation to the contact for that organization, so later requests can come through the portal.
  - **Decline** (with an optional email) or **Mark as spam.**
- **Duplicate safety.** Conversion is idempotent, so one inquiry can never create two organizations or two jobs.

### 4. Schema changes to existing tables

- `hiring_requests.submitted_by` stays nullable, and a new column, `source`, takes `portal` or `website`.
- `clients` gains a nullable `website_domain` to improve matching.

## Delivery order

1. Migration: `hiring_inquiries`, `submit_hiring_inquiry`, conversion functions, the `hiring_requests.source` column, the settings flag, RLS and pgTAP (anonymous isolation, limits, idempotent conversion).
2. Public `/careers/{slug}/hire` page, the API route and the confirmation email.
3. Website tab, inquiry page, organization matching and the conversion actions.
4. Needs attention, Overview and notification entries.
5. Playwright: submit inquiry → convert to job → publish.

## Out of scope

Embeddable widgets for other websites, CRM pipelines, quotes and fee agreements, and automatic organization creation without a person reviewing it.

# Create-job flow audit

Date: October 30, 2026. Purpose: audit our current create-job flow against the product goal — simple and easy for both recruitment agencies and in-house hiring teams — using Manatal as a reference competitor. Written in plain language, not PRD contract language.

## 1. What Manatal does (reference)

Observed in Manatal's live app (`app.manatal.com`), "Create Job":

- **One screen, not a wizard.** Create Job opens a single modal. Two entry choices: **Complete a Form** or **Use a Template**.
- **Three things to start.** Only **Position Name**, **Client**, and **Job team** (team optional) are shown by default. Job pipeline defaults to "Default Job Pipeline".
- **Everything else is behind "+ Advanced options"**, inline on the same screen: location (+ a Remote checkbox), Headcount, **Contract Details** (one dropdown, e.g. Full-time), min/max salary + currency + frequency, and an optional rich-text **Add description**.
- **One field per idea.** Employment is a single "Contract Details" dropdown. Salary is just min–max, currency, frequency. No separate "visibility/basis", no "arrangement vs working hours", no experience/seniority inputs, no structured criteria, no screening questions at creation.
- **Create light, enrich later.** "Continue" creates the job; advertising to the career page / job boards, screening questions, and pipeline work happen **after** creation on the job's own page. Creating a job and publishing it publicly are separate acts.
- A short plain sentence explains what a job is; microcopy is minimal.

**The lesson:** the fastest ATSes make "create a job" nearly frictionless (a name + where it belongs), defer everything optional behind one disclosure, use one control per concept, and separate *create* from *advertise*.

## 2. What our flow does today

A four-step modal (`Essentials → Role details → Hiring setup → Review`), opened from an entry choice (from scratch / use a template), ~1,950 lines in `new-job-form.tsx` plus `job-content-fields`, `job-role-details`, `publication-readiness`, `question-library-picker`.

Fields collected across the steps:

- **Essentials:** organization (pick or create inline), job title, openings — plus optional internal job reference, hiring reason, target start date, hiring contact.
- **Role details:** rich description; **employment arrangement** *and* **working hours** (two fields); workplace type; conditional location; remote eligibility + details; contract duration; department; experience (min years); seniority level; salary **min/max + currency + pay period + visibility (public/hidden/negotiable) + basis (gross/net/not specified)**; application deadline.
- **Hiring setup:** structured requirements/criteria (label + evidence text + required/preferred); screening questions (4 types + agency question library); workflow stage snapshot; priority (low/normal/high/urgent); lead recruiter / assignment; sourcing brief.
- **Review:** full public preview + readiness checklist, then publish.

Draft needs only org + title + openings. **Publishing** needs org, title, a real description, employment arrangement, workplace type, conditional location/eligibility, an active lead recruiter, a usable workflow snapshot, and answerable required questions.

## 3. Faults in our current flow

Ranked by how much they hurt "simple and easy for everyone."

1. **No progressive disclosure.** Every field is laid out across four steps; nothing is collapsed. Manatal shows 3 fields and hides the rest behind one "Advanced options". We overwhelm on first contact.
2. **Create and publish are fused, and publish is heavy.** A long list of required fields stands between the user and a live job. There's no quick "create the job now, finish it later" path that actually feels quick. The gap between "save draft" (3 fields) and "publish" (9+ requirements) is large and not obvious.
3. **Two fields for one idea — employment.** "Employment arrangement" + "working hours" is a data-modeling distinction (avoiding inferring permanence) leaking into the UI. Users think "Full-time / Part-time / Contract." Manatal uses one dropdown.
4. **Salary is over-engineered.** Six controls: min, max, currency, period, visibility, basis. Most users want min–max + currency + frequency. Visibility and gross/net are rare needs that belong behind disclosure.
5. **Overlapping experience signals.** Both "experience (min years)" and "seniority level" are collected, both optional, both add noise and neither drives behavior.
6. **Structured criteria at creation.** Required/preferred criteria with evidence text duplicate the description for most users and are a power feature, not a creation-time need.
7. **Screening questions + question library during creation.** Powerful, but heavy for the moment of creating a job. Manatal defers all of this to after creation.
8. **Agency ops config surfaced during creation.** Priority, workflow snapshot, lead-recruiter assignment, sourcing brief, hiring reason, hiring contact, internal reference — these are agency back-office concepts shown while someone is just trying to open a role.
9. **In-house teams are second-class.** "Client/Organization" is required and prominent. An in-house hiring team has no "client" — it's their own company. Forcing an organization pick is friction for that audience, and the vocabulary ("client", "organization", "lead recruiter") reads as agency-only.
10. **Four-step modal is long and scroll-heavy.** Conditional fields make steps expand unpredictably; the team already hit scroll-position and mobile-navigation issues here. A wizard implies each step is necessary, which raises the perceived cost of creating a job.
11. **Cognitive load from conditionality.** Arrangement → duration, workplace → location/eligibility, salary visibility → amount behavior: many "if this then that" branches a simple creator never needs.

## 4. What we should keep (do not regress)

- **Inline organization creation** and duplicate-aware company picker.
- **Preview before publish** and copyable job/apply links on success.
- **Idempotent create/publish** (no duplicate jobs on retry/double-click).
- **The public/private data boundary.** Private brief/budget/sourcing stay off public columns at the database (ADR 0006). Simplifying the *UI* must not move private data into public-selectable fields. This is data safety, not UX, and it stays.
- Markdown description with light formatting and faithful public rendering.

## 5. Direction this points to

- Collapse "create a job" to the few things that truly identify it (title + where it belongs + openings), and put everything else behind one clear "More details" disclosure on the same surface.
- Separate **create** from **advertise/publish**: let a job exist immediately, then enrich and publish it from its own page.
- One control per concept: a single employment field; salary as min–max + currency + frequency with privacy behind disclosure; one experience signal, optional.
- Move criteria, screening questions, workflow, priority, and the internal brief **out of the creation moment** to post-create configuration.
- Adapt vocabulary and required fields for in-house teams vs agencies (e.g., default or hide "client").

Open product decisions for these are tracked separately; this document records the audit only.

# RECRUTA

## Master Product Requirements Document

**Version:** 4.1\
**Date:** October 30, 2026\
**Company:** Evenkore  
**Product:** Recruta  
**Category:** Recruitment Operations and Automation  
**Primary market:** Recruitment and staffing agencies  
**Future market:** Internal recruitment teams  
**Platform:** Web application  
**Status:** Revised product source of truth  
**Supersedes:** Recruta Master PRD v4.0

Create-job revision status: the owner authorized P0, then P1 and continued implementation of the improved product flow. The local implementation now includes minimal draft capture, private unfinished criteria/questions, optional Department or team, criterion evidence, save/discard protection on modal close, and mutation-boundary repairs. The [complete implementation plan](prd/create-job-flow-and-content-implementation-plan.md) distinguishes this slice from remaining work; these changes are not a deployment claim. [ADR 0006](decisions/0006-job-drafting-publication-and-data-boundaries.md) records the full target contract.

---

# 1. Executive Summary

October 30 content implementation: the fourteen priority changes are implemented locally, including arrangement/hours, conditional location/duration, remote eligibility, private hiring/sourcing details, salary visibility/basis, workflow-stage preview, priority guidance, readiness and the four-type agency question library. See [content-pass evidence](verification/create-job-content-pass.md) for exact scope and remaining audit work. Requirements elsewhere remain broader than this pass.

## 1.1 What Recruta Is

Recruta is a recruiter-first operating system for recruitment and staffing agencies. It helps a recruiter open a job, publish a professional application experience, collect and organize applicants, screen them with evidence, communicate at scale, collaborate with hiring managers, and move successful candidates toward placement.

The product is built around one practical promise:

> **Help recruiters fill more roles while doing less repetitive administrative work.**

Recruta is not primarily a client request portal and it is not a passive applicant database. A recruiter must be able to start work immediately, whether a vacancy arrived through a phone call, email, existing client relationship, the agency's website, or a structured hiring request.

## 1.2 Primary Product Loop

The primary loop is:

**Create or select an organization → open a job → publish it → share the job or application link → receive applications → process and screen applicants → communicate and collaborate → interview → offer → placement**

A second, optional intake loop is:

**Employer submits a hiring request from the agency website or invited workspace → agency reviews it → clarifies or approves it → converts it into a job**

The second loop may create a job, but it must never block the first.

## 1.3 Product Vision

To become the operational layer that lets a recruitment agency run each hiring assignment from first vacancy to confirmed placement, while Recruta handles as much safe, repeatable coordination and data work as possible.

## 1.4 Product Principles

1. **Recruiter-first.** The agency workspace and recruiter work queue are the centre of the product.
2. **Direct work must be fast.** A recruiter can create an organization while opening a job and publish it without first creating a hiring request.
3. **One job can contain multiple openings.** Two openings are a `positions required` value on one job, not two jobs and not two organizations.
4. **Capture once, reuse everywhere.** Candidate, organization, and job data should not be repeatedly re-entered.
5. **Automation prepares; people decide.** AI may extract, compare, summarize, prioritize for review, and suggest actions. It must not make irreversible hiring decisions or silently reject candidates.
6. **Every automated action is inspectable.** Recruiters need evidence, status, history, and a recovery path.
7. **Candidates should not need accounts to apply.** Applying must be simple, mobile-friendly, accessible, and trustworthy.
8. **Collaboration is scoped.** Hiring managers see only the jobs, candidates, and requests explicitly shared with them.
9. **Communication is part of the workflow.** Email is the first supported channel; channel adapters may add WhatsApp and SMS later.
10. **The dashboard is a work surface.** It should show what needs attention, not decorative vanity metrics.

---

# 2. Problem and Opportunity

Recruitment agencies manage many organizations, vacancies, candidates, documents, emails, interviews, and decisions at once. Their work is fragmented across inboxes, spreadsheets, forms, job boards, calendars, and generic applicant tracking systems.

The most expensive problem is not simply storing applicant records. It is the repeated work around every applicant and every job:

- Creating job and application forms.
- Copying data from resumes.
- Checking whether applications are complete.
- Reviewing the same baseline requirements repeatedly.
- Following up for missing information.
- Sending acknowledgements, updates, reminders, and rejections.
- Preparing candidate summaries for hiring managers.
- Chasing feedback and coordinating interviews.
- Keeping operational records up to date.

Recruta should reduce that workload without removing recruiter judgment or damaging the candidate experience.

## 2.1 Target Customer

The first customer is a small or mid-sized recruitment or staffing agency that:

- Serves multiple employer organizations.
- Opens jobs directly from conversations and briefs.
- Needs a credible public application experience without building custom software.
- Receives enough applications that manual triage and follow-up are costly.
- Wants team accountability and controlled client collaboration.
- Values practical automation more than a complex enterprise ATS implementation.

## 2.2 Jobs to Be Done

### Agency owner or administrator

- Set up the agency workspace and public identity.
- Invite the team and control permissions.
- See whether work is moving and where attention is needed.
- Protect client and candidate information.

### Recruitment manager

- Open and assign jobs.
- Review workload across recruiters.
- Approve sensitive actions and monitor service delivery.
- Invite hiring managers when collaboration is useful.

### Recruiter

- Open a role quickly, even for a new organization.
- Share a job and application link.
- See new applicants in a clear inbox.
- Review the resume, answers, evidence, and history in one place.
- Move candidates through a job-specific workflow.
- Contact candidates without repetitive manual composition.
- Know what to do next.

### Hiring manager or reviewer

- Receive an invitation scoped to relevant work.
- View selected candidates or authorized jobs.
- Give structured feedback without learning a full ATS.

### Candidate

- Understand the role and agency.
- Apply without creating an account.
- Upload a resume and answer relevant questions.
- Receive timely, clear communication about the process.

### Prospective employer

- Visit the agency's public website.
- Submit a hiring request from a clear call to action.
- Receive confirmation and continue through an appropriate agency-led process.

---

# 3. Product Model and Vocabulary

Clear language prevents duplicate records and confusing workflows.

## 3.1 Agency

The recruitment business using Recruta. An agency is the top-level tenant and owns its data, settings, team memberships, organizations, jobs, candidates, and communications.

## 3.2 Organization

An employer, client, prospect, or business associated with a job or hiring request. The interface should use **Organization** as the general label. Internally, existing database and route names may continue to use `client` until a deliberate migration is performed.

Creating an organization does not require inviting anyone. A recruiter can create it inline while opening a job. The system should warn about likely duplicates before creating another organization with the same or very similar identity.

## 3.3 Job

A recruitment assignment for one role at one organization. A job contains the role brief, number of openings, requirements, public listing, application questions, recruitment workflow, assigned team, applicants, and eventual placement results.

One job may have multiple openings. `positions_required = 2` means two hires are needed for the same job; it must not duplicate the organization or job record.

## 3.4 Candidate

A person known to the agency. A candidate is agency-scoped and may have multiple applications over time.

## 3.5 Application

A candidate's submission to one job. Application status and job-specific answers belong to the application, not to the candidate's permanent identity.

## 3.6 Hiring Request

An inbound employer brief that may come from the agency's public website or an invited hiring manager. It is an intake channel, not a prerequisite for direct job creation.

## 3.7 Opening and Placement

An opening is one available headcount within a job. A placement records one candidate filling one opening. Later phases must prevent placements from exceeding the number of openings unless an authorized user deliberately expands the job.

---

# 4. Users, Roles, and Access

## 4.1 Agency Roles

### Owner

Complete agency control, including settings, members, organizations, jobs, applicants, communications, billing when introduced, and ownership transfer or safe workspace closure.

### Administrator

Operational administration, including settings, members, organizations, requests, jobs, and authorized candidate data. Destructive ownership actions remain owner-only.

### Recruitment Manager

Manages organizations, jobs, recruiter assignments, request approval, candidate workflow, and hiring-manager collaboration.

### Recruiter

Creates and works on organizations and jobs, reviews and communicates with applicants, and manages assigned recruitment work. A recruiter cannot manage agency membership or perform reserved administrative actions.

## 4.2 External Collaboration Roles

### Client Administrator

Manages the invited organization team and sees explicitly authorized requests and jobs.

### Hiring Manager

Can submit or manage relevant hiring requests and collaborate on granted jobs and candidates.

### Reviewer

Read-only or feedback-only access to specifically granted records.

External collaborators are not the primary product operator. Their experience should be focused, responsive, and free of irrelevant agency controls.

## 4.3 Access Rules

- Authorization comes from active database memberships and job grants, never editable profile metadata.
- Suspended or revoked memberships lose access immediately while historical actions remain attributed.
- Candidate documents are private and opened only through short-lived authorized URLs.
- Hiring managers see only records explicitly granted to them.
- Public visitors can read only published, open, application-accepting jobs.
- Public applicants can submit only to an eligible job and cannot enumerate private records.

Create-job target authority: active owners, administrators, and recruitment managers may manage and publish agency-wide jobs. An active recruiter may create a job, edit/publish an owned unpublished draft, and manage an explicitly assigned job; creator status alone does not retain access to applicants after reassignment. Managers control reassignment to another recruiter. Hiring contacts do not receive portal membership or job access merely by being selected. Private briefs, budget, contacts, hiring reasons, sourcing notes, and evaluation rationale are excluded from public and employer-portal projections. Direct table mutations must not bypass the authorized job operations. These are P1–P12 target rules; see ADR 0006 for the exact authority matrix and current gaps.

---

# 5. Core Product Workflows

## 5.1 Direct Job Creation — Primary Workflow

This is the create-job target workflow established during P0; implementation and release status are tracked by package in the linked plan.

1. An authorized agency user selects **Open a job**.
2. They select an existing organization or create a new organization inline.
3. Organization and a working title of 2–160 characters are sufficient to save a draft; openings default to one. Description, workplace type, lead recruiter, workflow, and unfinished custom questions may remain incomplete. Safe types, lengths, bounds, and tenant relationships are always validated. Organization-free or automatically untitled drafts are outside this scope.
4. They develop the public role: description, employment arrangement separate from working hours, workplace type, conditional public location/remote eligibility, optional department, duration, schedule, travel, authorization/relocation policy, reporting line, compensation, benefits, and experience guidance. They add required/preferred structured criteria only when useful; retyping the description is never mandatory. Internal hiring reason, reference, target start, contact, priority, and sourcing guidance remain separate.
5. They configure application questions in addition to Recruta's standard applicant fields.
6. Before publishing, Recruta shows a complete preview of the public role and application experience, including all fields already collected.
7. The user saves a draft at any step or publishes the reviewed version. Publication requires a valid organization/title/description, employment arrangement, workplace type, on-site/hybrid location or explicit remote eligibility, active eligible lead recruiter, usable workflow snapshot, and answerable required questions. Closing date is optional. Recommendations for richer content do not become arbitrary blockers. Closing or navigating away with changes offers Save draft, Discard changes, and Keep editing.
8. Publishing produces:
   - A public job page.
   - A dedicated application page.
   - Copyable job and application links.
   - An open job in the agency workspace.
9. Repeated submission caused by a retry or double click must not create duplicate organizations or jobs.

### Create-job content and publication contract

- Essentials adds optional internal job reference, hiring reason (including confidential replacement), target start date or flexible state, and hiring contact. A confidential replacement flag does not promise anonymous-employer publication. Contacts and portal accounts remain separate.
- Country inputs show country names and store validated codes. Bare website domains normalize to HTTPS. Organization address and public job location are distinct. Initial location autofill never overwrites a recruiter edit. Duplicate guidance includes bounded near-name matches; no silent merge or persistence of search results.
- Employment arrangement uses stable values: permanent, fixed-term, temporary, contract, freelance/consulting, internship, apprenticeship, volunteer, other. Working hours separately records full-time, part-time, variable, or not specified. Relevant fixed-duration engagements require a duration or explicit to-be-agreed state at publication. Legacy full-time never silently implies permanent.
- Department or team is optional under additional details. Remote roles require an explicit eligibility state; hybrid roles can describe office attendance. Working schedule, travel, work authorization/sponsorship, relocation, reports-to role title, benefits, and experience/seniority guidance are optional and conditional. Experience never automatically rejects candidates or changes stages.
- Compensation supports exact/range/from/up-to amounts, validated currency and pay period, gross/net/not-specified basis, benefits and additional compensation. Workspace defaults may prefill new jobs. New compensation remains internal until deliberately disclosed as amount or recruiter-authored public text; existing published salaries retain their visibility through a reviewed compatibility migration. Public/private protection must hold at the database boundary.
- Public criteria support categories, detail/evidence guidance, required/preferred classification, and accessible ordering. Internal sourcing and evaluation notes remain private. Optional criteria never force duplication of the description.
- Candidate questions support short/long text, yes/no, single choice, then compatible number/date/URL/multi-select types. Choice questions need 2–20 distinct nonempty options. Maximum 20 questions; warn above five total or two required long answers. Required means an answer is needed, not that Yes is needed. Questions never automatically reject, move stages, or send email. Concise guidance discourages requesting sensitive information and identity/financial documents.
- The agency question library lives in existing Settings. Owners/admins/managers manage items; recruiters copy/use them. Job questions are snapshots unaffected by later library edits/archive. Private evaluation rationale is not candidate-facing.
- Lead recruiter defaults to the actor when eligible; Assign later is allowed for drafts. Workflow selection shows actual ordered stages and snapshot behavior. Priority is internal: Low (no immediate deadline), Normal (standard timeline), High (active client need), Urgent (immediate attention).
- Review renders the actual public role and application controls with agency branding, consent, upload requirements, required states, help and choices, plus a separately labeled internal setup summary. Success exposes both stable job and apply links and actual acceptance state. Publishing is not an instruction to email candidates or invite contacts.
- A selected application closing date includes the whole date in the job's saved time zone. Intake stops at the exclusive start of the next local day, without marking the job filled/closed. No date means open until paused/closed. Extension is a deliberate versioned action and does not automatically resume a paused job. Existing deadline instants require an impact review before cutover.

Detailed field lengths, options, visibility, compatibility, accessibility, and acceptance tests are specified in the implementation plan. Autosave, AI writing, anonymous-employer publication, full agreement management, workload routing, separate sourcing ownership, formal eligibility flags, and job-board distribution retain explicit separate gates.

## 5.2 Public Job and Application Experience

The public role page must show the agency identity, organization and role details appropriate for publication, requirements, working arrangement, application deadline, and a clear **Apply** action.

The apply action opens a dedicated route rather than expanding an oversized form inside the listing. A modal may be considered later for embedded partner sites, but the canonical application experience is its own accessible page.

Standard application fields are:

- Full name.
- Email.
- Phone, optional unless configured otherwise.
- LinkedIn URL, optional.
- Resume, PDF or DOCX, maximum 10 MiB.
- Short note, optional.
- Consent acknowledgement.
- Configured screening questions.

After submission, the candidate receives an on-screen confirmation and an acknowledgement email. Duplicate submission to the same job should be handled deliberately and explain the outcome instead of creating silent duplicate applications.

## 5.3 Applicant Operations

Applications enter a recruiter inbox. The next product increment must make this a working operations surface with:

- Search by candidate, job, organization, or email.
- Filters for status, processing state, job, assignee, source, and age.
- Saved or practical default views such as **New**, **Needs review**, **Missing information**, and **Waiting**.
- Bulk selection for safe, reversible actions.
- Candidate/application detail with resume, answers, contact details, notes, owner, history, and possible duplicates.
- Job-specific stage transitions with required reasons for rejection or withdrawal.
- An immutable activity timeline.
- Counts and queues based on actionable work, not raw totals alone.

The initial application lifecycle is:

`Received → In review → Shortlisted → Client review → Interview → Offer → Placed`

Terminal alternatives are `Rejected` and `Withdrawn`. Stages may later become template-driven, but core reporting must continue to use normalized lifecycle categories.

## 5.4 AI-Assisted Processing and Screening

When an application arrives, Recruta should asynchronously:

1. Validate and securely store the document.
2. Extract resume text and structured facts.
3. Compare evidence with the job's required and preferred criteria.
4. Identify missing or uncertain information.
5. Detect possible duplicate candidate records.
6. Prepare an evidence-backed review summary.
7. Recommend the next review action or follow-up question.

The recruiter sees the source evidence and can correct extracted data. AI output must include version, status, timestamps, confidence or uncertainty where useful, and the criteria used.

AI must not:

- Make final hiring decisions.
- Automatically reject a candidate solely from a score.
- Infer protected or sensitive traits.
- Hide the evidence behind a recommendation.
- Fabricate experience, qualifications, or explanations.

If AI fails, the application remains usable and enters a visible retry or manual-review state.

## 5.5 Candidate Communication and Automation

Email is the first supported channel. Recruta should support:

- Application acknowledgements.
- Missing-information requests.
- Recruiter-composed messages with templates.
- Interview invitations and reminders.
- Status updates.
- Rejection and closure messages requiring appropriate human control.
- Delivery state, failure state, retry, and communication history.

Automations must be event-driven, idempotent, and stoppable. Examples include acknowledging an application, reminding a recruiter about an unreviewed applicant, or prompting a hiring manager for overdue feedback.

WhatsApp and SMS are later channel adapters. The product model should avoid embedding email-only assumptions into workflow state.

## 5.6 Hiring Manager Collaboration

An agency user may invite a hiring manager in the same general way they invite an agency team member, but access is organization- and job-scoped.

The hiring manager experience should initially support:

- Accepting an invitation.
- Viewing authorized job context.
- Reviewing candidates intentionally submitted by the recruiter.
- Recording structured feedback.
- Seeing interview details relevant to them.

The client experience must not expose the agency's private notes, internal ranking, unrelated candidates, unrelated jobs, or team administration.

## 5.7 Website Hiring Requests — Optional Inbound Workflow

Recruta will be paired with a future public website that looks and behaves like a credible recruitment or staffing agency website. Calls to action such as **Hire talent**, **Request staff**, or **Start a search** should send structured requests into Recruta.

The website request flow should:

- Carry agency identity or tenant context securely.
- Collect employer contact and organization details.
- Collect role, openings, location, work arrangement, timing, and brief requirements.
- Allow supporting PDF or DOCX documents within limits.
- Protect against spam and abuse.
- Confirm receipt to the requester.
- Create or match the organization without silent duplication.
- Put the request into the agency's action queue.

An agency may then clarify, decline, approve, or convert the request to a job. Inviting the employer into Recruta is optional and should happen only when continued collaboration benefits from it.

The request state machine is:

`Draft → Submitted → Under review → Clarification requested → Submitted → Approved`

`Declined` and `Cancelled` are terminal. Each submission or post-submission edit creates an immutable revision, and approval references a specific revision. Conversion is idempotent and creates at most one job for the request.

---

# 6. Functional Requirements

Priority meanings:

- **P0:** required for a recruiter to complete the core workflow.
- **P1:** required for an effective pilot and meaningful automation.
- **P2:** valuable after the primary operating loop is proven.

## F01 — Authentication and Agency Setup (P0)

- Email/password signup, verification, login, logout, and password reset.
- Atomic onboarding that creates the agency, owner membership, profile, and default workflows.
- Expiring and revocable agency invitations.
- Safe handling of multiple workspace memberships.
- A compact workspace dropdown lists the person's active workspaces and marks the current one. A person may create additional agency workspaces and becomes the owner of each new workspace, without gaining access to any other agency. Reuse the known personal profile details; workspace creation must not overwrite them. Workspace URLs are unique, and retrying creation with the same owned URL returns that workspace without creating duplicates or overwriting its settings.
- Immediate access removal for suspended or revoked memberships.

## F02 — Organizations and Contacts (P0)

- Create an organization independently or inline during job creation.
- Store primary contact, industry, website, location, account manager, and internal notes.
- Search and filter organizations.
- Warn about likely duplicates.
- Delete only empty organizations that have no dependent operational history.
- Archive or deactivate organizations with history instead of erasing records.

### Company search and autofill

Organization entry should support company-name search with matching suggestions showing the company name, logo, website/domain, and location. Selecting a company prefills available website, address, industry, and logo details. The recruiter reviews and edits those details before saving. When no company matches, manual entry remains available immediately, including organizations without a public directory listing. Use the same interaction in the standalone organization form and inline job-creation form.

Suggestions must not create records automatically. Show likely matches already in the agency before external suggestions to help prevent duplicates. Keep loading, unavailable-provider, and no-results states clear and preserve manual input. Company-data provider/API access, coverage, licensing, and cost must be verified before implementation; LinkedIn-like interaction does not assume unrestricted LinkedIn data access. External lookup should run only for an explicit company search and must not send private contacts or internal notes.

The current implementation shares a picker between standalone organization creation and New job. Saved organizations are searched across the agency, not just the initially loaded list. Primary contacts are optional; organization and contact creation is transactional and retry-safe. Exact active name matches reuse the saved organization without overwriting its details or adding an unsolicited contact. Matching websites are shown as a reuse suggestion rather than assumed to identify the same legal entity.

Optional Brandfetch search and Brand API enrichment are integrated behind credentials and an explicit storage-permission setting. Search results are live browser-only autocomplete data, never persisted. Only separately retrieved, recruiter-reviewed enrichment is saved. Available location, industry, website, and logo fields may be filled; missing street addresses remain manual. Directory lookup is not a dependency for creating or publishing a job.

### Workspace utilities and personal account

Keep organization entry free of a manual logo-URL field; imported company logos may be previewed and removed. Job creation does not include a separate Candidate note introduction field. Use the job description and screening questions for relevant candidate-facing information.

The desktop workspace has a slim top toolbar with the current destination, a boxed notification bell, and inline workspace search. Overview and Jobs place New job beside the date-range control in their first section header. Record pages show a breadcrumb in the toolbar. Personal accounts can upload a profile photo, shown in the sidebar profile control and Team list. Search supports Ctrl/Cmd+K on desktop and leads to authorized jobs, applicants, and organizations.

The top sidebar identity represents the active agency workspace: its menu lists only the user's active workspace memberships, marks the current one, and offers Create workspace. The bottom bordered account row represents the signed-in person. Its compact menu groups the user's avatar, name, email, role in the current workspace, and personal account actions in a quiet inset panel; the current agency's public careers page and separated destructive Log out follow. Do not repeat the agency name in the personal menu or put personal account actions in the workspace switcher. Role-gated Team and Settings appear beneath the workflow destinations, separated by a faint line without a group label. Mobile uses the same account menu in the header. My account edits the profile name and password without giving recruiters access to agency administration.

Recruta's identity is a charcoal (#272A32) rounded square containing an off-white (#F4F7F2) abstract fit symbol formed by two complementary corners. Pair it with a clean Geist wordmark throughout the app; use the symbol alone for compact branding and the favicon. No gradients or 3D effects. Previous supplied logos are legacy assets, not active branding.

The default lockup pairs a 28 px square mark with a 22 px semibold wordmark and a 10 px gap. The sidebar header instead pairs the active agency's dark name with its public 24 px logo or a purple initial placeholder, followed by a dark compact up/down switcher glyph. Evenkore's purple fit-symbol artwork is a local logo assigned to that workspace, not the generic fallback. The mark's corner radius is proportional (8 units on a 40-unit square). Controls/navigation use 6 px corners and cards/overlays use 10 px corners. The workspace selector supports switching and creating workspaces on desktop, collapsed navigation, and mobile; the personal profile remains a separate control at the sidebar foot.

## F03 — Jobs and Openings (P0)

- Direct job creation is available to every authorized recruitment role.
- Application deadline uses a compact calendar picker in the job modal. It opens at the saved date or current month, prevents choosing past days, supports keyboard day navigation, offers month selection and Today/Tomorrow shortcuts, and can clear the date.
- New job opens in a spacious, centered modal over the current Overview or Jobs page. Its opening screen asks whether to create the role from scratch or use an editable template; editing an existing draft skips this choice. The opening choice has no step sidebar. The four stages remain Essentials, Role details, Hiring setup, and Review, with conditional optional details under the content contract in §5.1. The description editor renders headings, emphasis, and lists while storing portable Markdown; public rendering must preserve supported formatting. Templates are reviewed structural starting points, never promises about an employer. Direct links to the former New job route open the same modal on Jobs. The local implementation now permits Save draft from Essentials without a description or workplace type, restores incomplete criteria/questions privately, and includes optional Department or team. Modal close offers Keep editing, Discard changes or Save draft; unload warns about unsaved changes. Publication still requires complete role and question content.
- The description is the source of truth for the public role brief. Structured criteria are optional and should be added only when the recruiter needs individual requirements available for screening and comparison; never require users to re-enter description text as criteria. The form should explain this distinction in plain language. Review presents the role and application form in clear, separate sections, with missing publication information called out before publish.
- One job records one or more openings.
- Draft, preview, publish, pause, reopen, fill, cancel, and close-unfilled lifecycle actions.
- A draft job detail offers Edit draft and Review & publish. Editing reopens the four-step job modal with saved values; publishing follows the review preview. Drafts do not show a copyable application link or an “applications open” state. The detail toolbar shows Jobs as a breadcrumb followed by the current role title. Drafts also offer an authenticated, read-only preview of the actual candidate application page; it cannot accept a submission before publication.
- Configured job stages appear as a compact numbered workflow. Hiring-manager access is displayed separately from pending invitations; adding a person opens a focused dialog with existing organization members and email invitation. Job lifecycle controls sit in the detail page's More menu; permanent deletion requires a separate confirmation.
- Requirements, screening questions, workflow snapshot, priority, deadline, and assignments.
- Job detail shows link state, application count, filled count, owners, and recent activity.
- Destructive deletion is allowed only for safe empty manual jobs; otherwise close or archive.
- Creation and publication actions are idempotent and resistant to double submission.
- Jobs shows exact, agency-scoped open, draft, on-hold, and next-seven-day deadline counts. The list supports status tabs and title search, uses role, organization, recruiter, applicant, openings, deadline, and status cells, and opens a job in a right-side overview panel. The panel shows real application stages and configured workflow, with draft edit/publish or application review actions alongside the full job link.

## F04 — Public Career and Application Pages (P0)

- Agency career index for open jobs.
- Stable public job URL and dedicated application URL.
- Responsive, accessible job and form pages.
- Only open, published, application-accepting jobs are publicly readable.
- Private resume upload with file-type and size validation.
- Application acknowledgement and clear error recovery.

## F05 — Candidate and Application Records (P0)

- Agency-scoped candidate identity and job-specific applications.
- One candidate may apply to multiple jobs.
- Duplicate detection and merge workflow must preserve application history.
- Resume, answers, notes, tags, source, owner, status, and activity.
- Authorized signed document access.
- Search, filters, pagination, and deterministic sorting.

## F06 — Recruiter Inbox and Pipeline (P0)

- Action-oriented queues and filters.
- Candidate/application detail page.
- Validated application status transitions.
- Bulk actions limited to safe operations.
- Reason and actor recorded for consequential transitions.
- Job pipeline counts derive from current application state.

## F07 — AI Review Assistance (P1)

- Asynchronous resume parsing and structured extraction.
- Evidence-backed comparison against job requirements.
- Missing-information and uncertainty flags.
- Retryable processing state.
- Human correction and override.
- Versioned prompt/model/output metadata for audit and improvement.

## F08 — Communications and Automations (P1)

- Email templates and one-off recruiter messages.
- Delivery tracking, attempts, provider ID, and idempotency key.
- Email failure never rolls back the authoritative recruitment action.
- Authorized resend and manual fallback.
- Event-driven automation rules with visible status and safe cancellation.
- Candidate contact preference and opt-out handling where legally required.

## F09 — Team and Hiring Manager Collaboration (P1)

- Invite agency members and scoped external collaborators.
- Grant hiring managers access by organization and job.
- Candidate submission packages and structured feedback.
- Internal notes remain private.
- Revocation takes effect immediately.

## F10 — Hiring Requests and Website Intake (P1)

- Public website CTA intake and authenticated portal intake may use the same domain service with different authorization.
- Organization matching/creation, request revision history, clarification messages, and attachments.
- Approval and idempotent conversion into a job.
- The workflow remains optional; direct job creation is never removed.

## F11 — Interviews, Offers, and Placements (P2)

- Interview scheduling, participants, location/video details, reminders, and feedback.
- Offer status and outcome tracking.
- Placement records tied to openings.
- Start date, fee details where appropriate, and confirmed-start status.

## F12 — Reporting and Integrations (P2)

- Time to first review, time in stage, source effectiveness, conversion, fill rate, and recruiter workload.
- Job board distribution, calendar, mailbox, and communication integrations only after the core data model is stable.

---

# 7. Dashboard and Information Architecture

## 7.1 Agency Navigation

The primary agency navigation is:

- Overview.
- Jobs.
- Applications.
- Organizations.
- Hiring requests.
- Team, role-restricted.
- Settings, role-restricted.

Candidates may become a separate navigation destination when cross-job rediscovery and talent-pool workflows are ready. Interviews, placements, reports, and automations should not occupy primary navigation before those modules are useful.

## 7.2 Overview

The overview answers: **What needs a human decision today?**

Below the four existing summary cards, show only relevant work. Needs attention appears only for real exceptions. The application inbox prioritizes the oldest received/in-review submissions and uses the actual outstanding count; it is hidden before any published job or application exists. A published role awaiting its first application offers a direct copy-link action. Active jobs are queried independently of the newest jobs; draft continuation belongs beside the jobs it relates to. First-use owners get one starting point, while recruiters with no visible assignments get assignment-aware guidance. Hiring requests appear only for managers with unconverted submitted/under-review/approved requests; omit the empty secondary column and permanent Up next card. An established quiet workspace is not first use. The four summary cards, zero values, date rules, and links remain unchanged by this refinement.

Preferred content:

- New or aging applications to review.
- AI processing failures or missing-information cases.
- Candidate replies and delivery failures.
- Jobs with no recent progress.
- Hiring manager feedback overdue.
- Upcoming interviews when that phase exists.
- Compact operational counts linked to the relevant queue.

Keep the top metric cards linked to operational destinations. Their small charts may show real intake by date for the selected period; avoid invented growth percentages or a hiring funnel that implies unavailable interview and placement workflows. Richer reporting belongs in its own module once sufficient data exists.

---

# 8. Experience and Visual Direction

## 8.1 Brand

- Primary accent: `#5C5AED`.
- Ink: `#17182B`.
- Canvas and sidebar: neutral `#F5F5F5`.
- Paper: `#FFFFFF`.
- Attention: `#C97812`.
- Success: `#137A5A`.
- Product typeface: Geist Sans.
- Operational metadata: Geist Mono where helpful.

Brand purple is for primary actions, links, focus, and active workflow markers. Selected sidebar navigation keeps a white surface, dark solid icon, and dark text. Purple must not replace semantic success, warning, or destructive colors.

Overview omits the greeting. A slim desktop toolbar pairs its title with notifications and workspace search; New job sits beside the date-range control; the profile is anchored at the sidebar foot. Hiring activity is subordinate to the Overview title. A compact segmented date-range control sits above the four summary cells, defaulting to Last 30 days with All time explicit. Each cell shows its label, count, a one-line comparison against the preceding period, and a compact bar chart of real intake counts that strengthens toward recent buckets, alternating violet and peach across cells. All-time charts span the full recorded history; the small metric separately shows recent 30-day intake. Chart buckets reveal a compact count and date span on hover or keyboard focus. Headline counts stay dark; directional small metrics use semantic green for increases, red for decreases, and neutral color for zero. Agency settings includes a public logo preview with upload, replace, and remove actions for owners and administrators. Accept PNG/JPG/WebP images up to 2 MiB. Changing a logo must not affect other agency details or private candidate documents.

## 8.2 Iconography

Use `@solar-icons/react` version `2.3.3` with per-icon imports.

- Use **Linear** icons for routine navigation, table actions, metadata, fields, and low-emphasis controls.
- Use **Bold solid** icons for selected sidebar navigation on a quiet gray background, product identity, major empty states, and high-salience success or confirmation moments.
- Do not use duotone icons.
- Use the plain `Add` icon for ordinary create actions; a circled add icon is reserved for contexts where the container itself has meaning.
- Decorative icons are hidden from assistive technology.
- Icon-only controls require an accessible name and tooltip.
- The default icon size is approximately 20 px; compact controls may use 16 px.

## 8.3 Interaction Quality

The workspace fills the browser edge to edge, with a compact neutral `#F8F8F8` sidebar, a slim white toolbar, and a white main work area. There is no outer padding, rounded application frame, or enclosing border. Borders (`#E8E8E8`) and elevation stay quiet; broad surfaces and selected navigation are neutral rather than purple. Overview summary counts sit in a single bordered strip with clear cell dividers and true intake mini charts. Recent jobs, applications, and next actions carry the page. Interface copy is concise: retain task guidance and meaningful metadata, and omit taglines and repeated descriptions. The surface direction and component guidance are documented in `docs/Recruta Design Direction.md`.

Overview summary cards are ordered Active jobs, Applications received, In review, Shortlisted. In review counts only applications currently in review, not unreviewed arrivals; Shortlisted counts the current shortlisted stage. These are job-specific submissions, not unique people. A shared All time / 24h / 7d / 14d / 30d filter applies rolling received-date windows to applications and created-date windows to jobs, combined with current status. Detailed queues remain unfiltered to retain older outstanding work. Hiring requests remain in their own panel; confirmed placements are deferred until a real placement-confirmation workflow exists. The profile menu separates identity, personal controls, utilities, and destructive logout with comfortable row spacing.

The Overview active-jobs preview follows the Jobs table's compact row styling and shows the organization, applicant and review counts, openings, deadline, and status. Its heading, like Application inbox, sits above the bordered content. Real attention items appear in a compact inline banner with the affected application, a direct review action, and a dismissal control. Dismissal hides the banner for that user and workspace during the current browser session; the underlying issue remains in the attention queue.

- The agency workspace is compact and desktop-efficient, with responsive fallbacks.
- Omit the redundant visible “Workspace” sidebar heading and the divider above the account menu. Use a faint divider only between workflow navigation and the role-gated Team and Settings group. Reserve filled primary buttons for the page's main action or a form's main submission. Supporting and repeated actions (including empty-state CTAs and Save draft) use outline, not filled secondary. Keep lightweight navigation ghost/link and destructive actions semantically destructive.
- Public and external experiences are mobile-first.
- Forms preserve entered data when validation fails.
- Publishing always includes a review/preview step.
- Buttons show pending state and prevent accidental duplicate submission.
- Destructive actions explain what will happen and whether history prevents deletion.
- Keyboard navigation, visible focus, accessible errors, reduced motion, and WCAG 2.2 AA contrast are mandatory.

---

# 9. Trust, Privacy, and Responsible AI

- Candidate data is sensitive personal information and must be minimized, access-controlled, encrypted in transit and at rest by the infrastructure provider, and retained only as long as policy permits.
- Synthetic candidate data is used in development and staging.
- A jurisdiction-specific privacy, retention, deletion, and lawful-basis policy must be completed before processing real candidate data at scale.
- Candidate consent copy must reflect the agency's role and intended data use.
- AI outputs are advisory and visibly labelled.
- AI processing must avoid protected-trait inference and use job-relevant evidence only.
- Important decisions must record the human actor.
- Public forms require abuse controls, rate limits, and upload validation.
- Activity history is append-only for material actions.

---

# 10. Success Measures

The product should be evaluated by work reduced and workflow outcomes, not feature count.

Initial pilot measures:

- Median time from starting job creation to a shareable application link.
- Percentage of published jobs receiving at least one valid application.
- Median time from application receipt to first human review.
- Percentage of applications successfully processed without manual data entry.
- Recruiter correction rate for extracted facts.
- Number of manual candidate follow-ups avoided or assisted.
- Communication delivery and failure rates.
- Duplicate organization, job, candidate, and application rates.
- Percentage of active jobs with a clear next action and owner.
- Recruiter-reported hours saved per live job.

Pilot targets should be set after baseline observation with real agencies; the PRD must not invent target values without evidence.

---

# 11. Delivery Roadmap

## Milestone 1 — Foundation and Workspace (substantially complete)

- Authentication, verification, reset, and SSR sessions.
- Agency onboarding and active memberships.
- Team and external invitations.
- Organization management.
- Hiring request foundation and conversion.
- RLS, audit events, communications foundation, CI, and staging configuration.

## Milestone 2 — Direct Jobs and Application Intake (substantially complete)

- Create a job without a hiring request.
- Create an organization inline.
- Multiple openings on one job.
- Draft/publish lifecycle and safe deletion rules.
- Public agency career page and job detail.
- Dedicated application page, questions, resume upload, and acknowledgement.
- Basic application inbox and public-read security.

Remaining hardening includes richer preview, duplicate guidance, loading/confirmation polish, and expanded regression coverage.

## Milestone 3 — Applicant Operations (in progress)

### 3A: Recruiter inbox and application detail

Core implemented: server-side candidate/email/job/organization search, stage/job/ownership filters, exact matching totals, stable cursor pagination, application detail with private document actions and screening answers, append-only internal notes, owner assignment, audited stage transitions, and exact per-job stage counts. Related applications link to the same existing candidate identity without merging records.

Managers review agency-wide; recruiters review assigned jobs, can claim unassigned applications, and cannot delegate another recruiter's ownership. Rejection, withdrawal, and reopening require reasons. Changes detect stale versions; a retry of the same note cannot create a second note. Stage changes do not send candidate email in this slice, and review cannot fabricate a placement.

Hardening adds received-date filters in the agency timezone, a searchable paginated job picker, independently paginated notes/activity, faithful public-job previews, bounded PDF/DOCX intake, payload-bound application retries, and per-job abuse limits. Each application retains its submitted identity without overwriting the agency candidate's name. Advanced identity merging and bulk operations remain separate work.

- Search, filters, pagination, queues, and actionable empty states.
- Application detail with resume, answers, profile, notes, ownership, and timeline.
- Validated lifecycle transitions and audit entries.
- Duplicate candidate/application detection and safe resolution.
- Job pipeline counts and recruiter assignment context.

### 3B: AI-assisted screening

The screening backend and evidence UI are implemented with per-agency opt-in, automatic intake preparation, extraction checkpoints, retries, and append-only corrections. Owner-authorized GPT-6 Luna evaluations passed six screening cases, simple PDF/DOCX checks, and the deployed application-to-screening-to-email pilot, including a real Delivered callback. Deployed workers are configured; workspace screening remains opt-in. Broader human-reviewed quality evaluation and real-data privacy approval remain prerequisites for real candidate operation. ADRs 0001, 0002, and 0004 describe execution and gated scheduling. Screening never changes stages or sends email.

- Document extraction pipeline.
- Structured candidate facts and evidence references.
- Requirement comparison and missing-information flags.
- Processing retry, failure, and correction experience.
- Human-controlled review outcome.

### 3C: Communication and work queue

Implemented: queued recruiter email composition/templates, delivery history, retry/cancel actions, verified/deduplicated provider callbacks, candidate email suppression after bounce/complaint, durable application acknowledgement preparation, configurable review reminders, and a job-authorized Needs attention queue. Replies go to the agency contact mailbox. The owner activated deployed workers after a synthetic pilot verified screening, acknowledgement, and a signed Delivered callback. Workspace AI remains opt-in. Inbound mailbox synchronization, WhatsApp/SMS, and custom automation builders remain separate. See ADRs 0002 and 0004 for activation and history limits.

- Candidate email composer, templates, delivery history, and resend.
- Acknowledgement hardening and missing-information flow.
- Attention queue for unreviewed applications, failed processing, and failed messages.
- Safe first automations with explicit triggers and stop conditions.

## Milestone 4 — Hiring Manager Collaboration and Website Intake

Implemented locally: job-scoped hiring-manager/reviewer invitations, existing-member access controls, a real employer portal, intentional recruiter-written candidate submissions, optionally shared private résumés, and append-only structured feedback. Reviewers cannot write feedback. Withdrawal or revocation removes external access immediately; invitation receipts cannot restore removed access. No stage or candidate email changes occur implicitly. Portal requests support real drafts, submission, clarification, messages, and cancellation. See ADR 0005 for boundaries and deployment prerequisites.

Still separate:
- Public agency website hiring-request CTA and anti-abuse controls.
- Organization matching and request-to-job conversion improvements.

## Milestone 5 — Interviews, Offers, and Placements

In progress (ADR 0008): interviews, offers and opening-level placements are recorded through one audited database function. Interview outcomes are recommendations and never move the stage. Candidate emails, reminders and the placements metric follow.

- Scheduling, reminders, feedback, offers, opening-level placements, and candidate communication.

## Milestone 6 — Reporting, Integrations, and Pilot Scale

- Operational reporting, calendar/mailbox integrations, job distribution where justified, retention tools, and pilot-derived improvements.

---

# 12. Out of Scope for the Current Milestone

- Autonomous rejection or hiring decisions.
- General-purpose workflow builder.
- Visual workflow-template editor.
- Public job-board marketplace.
- Payroll, timesheets, or contractor management.
- Full CRM and sales pipeline.
- Native mobile applications.
- Broad sourcing automation or scraping.
- Complex billing and placement-fee accounting.
- Advanced analytics before reliable operational data exists.

These exclusions protect the core objective: make the recruiter job-to-applicant workflow genuinely useful before widening the platform.

---

# 13. Acceptance Scenarios

The revised direction is proven when these scenarios work end to end:

1. An owner signs up, verifies email, and creates an agency.
2. The owner invites a recruiter, and revoked access stops immediately.
3. A recruiter opens a job for an existing organization.
4. A recruiter creates a new organization while opening a job.
5. Setting two openings creates one organization and one job with `positions_required = 2`.
6. Double submission or retry does not create duplicate jobs or organizations.
7. The recruiter previews the public role and application fields before publishing.
8. Publishing creates working job and dedicated application links.
9. A candidate applies without an account, uploads a valid resume, and receives confirmation.
10. The application appears in the correct agency inbox and job pipeline.
11. An unauthorized tenant cannot read the applicant or resume.
12. A recruiter reviews evidence, changes status, records notes, and sends an email.
13. Failed AI or email processing is visible and retryable without losing the application.
14. A hiring manager sees only a job and candidate intentionally shared with them.
15. An employer request from the future agency website enters the request queue and can be converted once into a job.

---

# 14. Open Decisions

The following require product validation rather than silent implementation assumptions:

- Exact pilot segment and country-specific privacy obligations.
- Candidate retention periods and deletion/export workflow.
- Background workflow provider and operational cost limits.
- OpenAI model selection, evaluation set, and acceptable extraction accuracy. OpenAI is the selected provider; live activation remains gated by configuration, evaluation, and privacy review.
- WhatsApp/SMS provider and consent model.
- Whether job application questions need conditional logic in the first pilot.
- When a separate talent-pool experience is valuable enough to enter primary navigation.
- Whether the public agency website is a configurable Recruta surface or a separately deployed marketing product using Recruta APIs.

---

# 15. Product Decision Summary

Recruta's centre of gravity is the recruiter, the live job, and the applicant queue. Hiring requests, client access, AI, and automation support that operating loop; they do not replace it or make it harder to begin. Every build decision should be judged by whether it helps a recruiter publish work, understand applicants, communicate clearly, and move a hiring assignment forward with less manual effort.

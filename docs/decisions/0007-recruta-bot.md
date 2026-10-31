# ADR 0007 — Recruta bot: match grading, information requests and Ask Recruta

Date: October 31, 2026. Status: proposed; owner decisions recorded below.

## Context

Screening (ADR 0001) already returns one verdict per job requirement (`supported`, `not_found`, `contradicted`, `unclear`) with quoted evidence and an optional `followUp` question. Candidate email (ADR 0002) has a durable queue, templates (including `missing_information`), delivery tracking and suppression. Recruiters still triage every applicant by hand and chase missing details themselves.

## Owner decisions (October 31, 2026)

1. **Grading** is shown as explainable bands with reasons (Strong / Partial / Weak, e.g. "4 of 5 required met"), not a 0–100 score.
2. **Information requests** for a defined list of common gaps are sent automatically once a workspace opts in. Anything outside that list becomes a draft a recruiter approves.
3. **Ask Recruta** answers questions and drafts content; any change (stage move, email) requires a confirm click.
4. **Provider** stays OpenAI, behind the existing server-only adapter and data-use gates.

These change two ADR 0002 rules: "screening never sends email" and "acknowledgements are the only automatic candidate messages". The other invariants stand: AI never moves a stage, rejects a candidate, or makes a hiring decision.

## Plan

### A. Match grading (no new model calls)

- Derive a band per application from its latest succeeded screening run plus recruiter corrections (corrections win):
  - **Strong**: every required criterion supported.
  - **Partial**: no required criterion contradicted, at least one not found or unclear.
  - **Weak**: any required criterion contradicted, or fewer than half supported.
  - **Not graded**: no successful run yet.
- Reasons list the required/preferred counts and each gap, linking to the evidence.
- Stored on the application by a database function when a run succeeds or a correction is added, so lists can sort and filter server-side.
- Shown in the inbox, the job page, the review header and Overview ("N strong matches waiting"). Grades never filter anyone out automatically.

### B. Information requests

Common gaps eligible for automatic requests (each can be switched off per workspace):

| Gap | Detected from |
| --- | --- |
| Résumé unreadable or empty | extraction `readable: false` or no text |
| Required screening question left blank | submitted answers |
| No evidence for a required requirement | verdict `not_found` with a `followUp` question |

Everything else (contradicted or unclear evidence, preferred requirements) becomes a draft request awaiting approval.

Guards:
- Workspace opt-in plus `RECRUTA_CANDIDATE_EMAIL_ENABLED`.
- At most one automatic request per application per 72 hours, and one per gap ever.
- A daily cap per workspace.
- Stop when the application is terminal, the job closes, or the candidate is suppressed.
- Messages are labelled "Sent by Recruta bot" in history and the audit log.

Follow-up B2: a private, expiring link where the candidate adds the missing answer or document, which re-runs screening.

### C. Recruta bot section

- A "Recruta bot" sidebar destination at `/app/bot`, styled apart from ordinary navigation, with two tabs:
  - **Chat** answers questions about jobs, applicants and the pipeline, and drafts emails and summaries.
  - **Work** shows the workflows the bot runs on its own (screening, match grading, acknowledgements, review reminders), whether each is on, and what it did in the last 30 days.
- `POST /api/v1/assistant` uses the OpenAI Responses API (`store: false`) with function tools that run with the signed-in user's database client, never the service role, so RLS and job-scoped access apply:
  - `search_jobs`
  - `list_applications` (by job, stage, match band or search term)
  - `get_application` (answers, match grade and gaps)
  - `list_needs_attention`
  - `propose_stage_change`
- The assistant cannot change anything. A stage change comes back as an action card; confirming it calls the existing application review API with the proposal's `expectedUpdatedAt`, so transitions, reasons, stale-write protection and audit history apply unchanged. No email is sent.
- Drafted emails are text for the recruiter to use. The bot does not send email from chat.
- Tool results (CV text, answers, notes) are untrusted data; the instructions forbid following them and forbid reasoning about protected characteristics. Tool rounds are capped at six.
- Version 1 does not store conversations: the browser keeps the transcript for the session and sends at most 20 messages per request. Stored history, streaming and per-user daily limits are later work.
- Gated by `RECRUTA_AI_ENABLED`, `RECRUTA_AI_DATA_USE_APPROVED`, `RECRUTA_ASSISTANT_ENABLED=true`, an explicit `OPENAI_ASSISTANT_MODEL` (no default) and the workspace AI opt-in. When any gate is off the Chat tab says why and the Work tab still works.

### D. Bot activity

Overview and Needs attention show what the bot did (graded, requested, drafts waiting) so its work stays inspectable.

## Verification

- Unit tests for band rules and gap detection.
- pgTAP for grade storage, request limits and RLS on conversations.
- Fake-provider tests for the assistant's tool calls and confirm flow.
- Synthetic-data evaluation before any live use.
- Real candidate data still requires the privacy review in ADR 0001.

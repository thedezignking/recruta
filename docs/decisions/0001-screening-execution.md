# ADR 0001 — Screening execution and provider boundary

Date: October 25, 2026. Updated October 26. Status: backend and recruiter review UI implemented; app processing disabled pending pilot activation. Initial fake-provider testing was followed by owner-authorized live synthetic evaluation of GPT-6 Luna. See [ADR 0002](0002-applicant-processing-and-communication.md) for current activation state, intake, correction UI, extraction checkpoints, and email execution.

## Decision

Use OpenAI (selected by the product owner) through a server-only adapter and the Responses API. Pin SDK `openai` to `7.43.0`; require an explicitly selected/evaluated `OPENAI_SCREENING_MODEL`, with no silent default. Keep extraction and assessment contracts provider-independent.

Use Postgres `screening_runs` as a durable queue and versioned assessment store rather than adding a workflow service now. A protected Next.js worker processes one run per invocation. A deployment scheduler must call `POST /api/internal/screening` with `Authorization: Bearer <SCREENING_WORKER_SECRET>`. No scheduler, paid subscription, or recurring automation is provisioned by this change. This is at-least-once work, not exactly-once provider billing.

`POST /api/v1/applications/[id]/screening` accepts `{ documentId }` and a UUID `Idempotency-Key`. It requires current reviewer access and enabled server configuration. The database rechecks access and snapshots the job, explicit criteria, submitted answers, and résumé metadata atomically with the queue/audit record. Only open jobs and non-terminal applications are eligible. Concurrent requests coalesce; alias keys remain bound to the returned run. Successful identical snapshots are reused. Limits: five new runs/application/day and 100/agency/hour. Direct RPC access cannot bypass worker model/configuration checks.

`GET /api/v1/applications/[id]/screening` returns the twenty latest authorized runs with sanitized evidence context and recruiter corrections. Recruiters see assigned-job applications; managers see their agency. Lease tokens and raw input snapshots are not granted to authenticated callers. Results are internal, never exposed through the portal or public routes.

Workers claim with `FOR UPDATE SKIP LOCKED`, a five-minute lease, and a fresh completion token. Maximum three attempts; transient failures wait 60 then 120 seconds. Expired workers cannot overwrite a later attempt. Revocation and closed/terminal work cancel pending processing and discard late results. Provider timeouts are 90 seconds/call; SDK automatic retries are disabled. Worker deployment must support a 240-second request duration and enough memory for a 10 MiB base64 file. Scheduling interval, concurrency, backlog alerts, operating budget, deployment region, and provider regional settings still require operator configuration before activation.

## Document and evidence handling

The worker checks live tenant/application document metadata, downloads from private Storage, verifies size and a basic PDF/ZIP signature, and passes PDF/DOCX bytes inline with a generic filename. This signature check is not malware scanning or full document validation. It does not publish a signed résumé URL or create a persistent OpenAI Files resource.

Two versioned calls extract professional text, then map evidence to explicit requirements. Extraction limits are 40 sections, 12,000 characters/section, and 120,000 total source characters including answers. The assessment includes job-relevant facts, a summary, and exactly one result per criterion: `supported`, `not_found`, `contradicted`, or `unclear`. Facts and affirmative/contradictory verdicts require exact source quotes. Runtime validation rejects invented quotes, duplicate/unknown/missing criterion IDs, extra score/decision/stage fields, and incomplete/refused output.

Quotes are verified against the model-extracted text and submitted answers, **not independently against the original file**. Transcription can still be wrong. Section labels are not verified page references. Results must be labelled advisory and reviewed beside the original résumé. No hiring decision, lifecycle transition, placement, or candidate email is automated.

Prompt instructions treat files, questions, requirements, and answers as untrusted data, prohibit protected-trait assessment and proxy ranking, and distinguish missing evidence from an absent qualification. These safeguards reduce risk but do not prove model correctness or injection immunity. Human correction must be a separate record; never rewrite the original model output.

## Privacy and activation

`store: false` disables Responses application-state storage; it does **not** assert zero retention, regional processing, or an approved data-processing agreement. Full résumé bytes, including any personal data in the original file, reach OpenAI for extraction. The second call excludes candidate identity/contact fields, internal notes, storage paths, and agency identity, but source text/answers may still contain personal information. Configure the provider account's retention, regional/privacy controls and spending limits before activation.

Required server variables: `OPENAI_API_KEY`, `OPENAI_SCREENING_MODEL`, `SCREENING_WORKER_SECRET` (at least 32 random characters), `RECRUTA_AI_ENABLED=true`, and `RECRUTA_AI_DATA_USE_APPROVED=true`. Defaults remain disabled; `.env.local` is not modified. Local/staging uses synthetic candidate data only. Candidate consent, retention/deletion/export requirements and legal review remain prerequisites for real-data operation.

## Verification and remaining scope

Unit tests cover schema/evidence rules, safe request construction, disabled configuration, worker failures, and lost leases. pgTAP covers RLS, private lease data, idempotency, immutable snapshots, retries, exhaustion, revocation, and lifecycle separation. Browser tests cover unauthenticated screening and worker denial.

The Windows test configuration uses two thread workers because fork workers stalled during this implementation's full regression run. The equivalent explicit thread-pool run passed all 82 unit/component tests; six billable live evaluations were skipped. All 112 database assertions passed using rollback-only staging fixtures (local Postgres was unavailable). Browser verification passed 16 scenarios initially and the two desktop timeouts on a sequential rerun. Formatting, lint, type checks, and production build passed. These checks do not establish live extraction/model accuracy.

Six synthetic live screening evaluations cover support, absence, contradiction, prompt injection, protected criteria, and ambiguity. Set `RECRUTA_RUN_AI_EVAL` to `1` and run `npm run test:screening:live` after configuring the key/model. This incurs provider usage. These evaluations are **not** document-extraction accuracy tests or a sufficient production safety benchmark. Add human-reviewed PDF/DOCX/scanned/long-document fixtures, measure extraction correctness, citation precision and per-verdict accuracy, record model/prompt versions, then approve a pilot model. No live quality/accuracy claim is made without running these evaluations.

Recruiter evidence/retry/correction UI, opt-in intake enqueue, per-agency activation, extraction checkpoints, and communication automations are implemented in [ADR 0002](0002-applicant-processing-and-communication.md). Remaining activation work includes scheduler deployment/backlog monitoring, a selected model and broader extraction/fairness evaluations, and verified live email delivery. History is bounded to twenty runs; older-run pagination is deferred. Live providers remain disabled by the owner's choice.

## Sources

- [OpenAI file inputs](https://developers.openai.com/api/docs/guides/file-inputs)
- [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security)

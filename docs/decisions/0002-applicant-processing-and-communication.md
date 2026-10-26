# Applicant processing and candidate email

Date: October 25, 2026.

## Execution and activation

Application creation writes an `application_intake_tasks` row in the same database transaction. The public submission response does not call an email or AI provider. Acknowledgements and optional screening are prepared by a leased intake worker; manual recruiter email is saved to `communications` before delivery. A provider failure cannot roll back a valid application or stage change. Screening preparation runs in a separate subtransaction: unavailable AI configuration retains the queued acknowledgement and retries only the unfinished intake work, without duplicating either operation.

Initial verification used fake providers. On October 26 the owner authorized model selection and live synthetic evaluation. `gpt-6-luna` is configured as the local pilot candidate: six screening verdict cases and two simple PDF/DOCX extraction-to-evidence checks passed. These smoke checks do not establish production accuracy, fairness, scanned-document support, or a completed real-data privacy review. App-level AI and automatic intake remain disabled pending pilot activation. No real candidate material was transmitted, recurring scheduler provisioned, or candidate email sent. The configured Resend key is sending-only, so domain/webhook configuration cannot be inspected through that key.

Configure the existing screening environment separately, then enable screening per workspace in Agency settings. Automatic screening is a second opt-in. Intake chooses an active authorized reviewer from database memberships; owner/administrator/manager or assigned recruiter access is rechecked by the queue and worker. Disabling workspace screening prevents further provider processing. Screening cannot change lifecycle stages or send email.

Candidate email requires `RECRUTA_CANDIDATE_EMAIL_ENABLED=true`, a verified `RECRUTA_EMAIL_FROM`, `RESEND_API_KEY`, and an independent `AUTOMATION_WORKER_SECRET` of at least 32 random characters. `RECRUTA_AUTOMATIONS_ENABLED=true` enables intake preparation. Defaults remain false. Add `RESEND_WEBHOOK_SECRET` and configure Resend to send delivery events to `/api/webhooks/resend`. Replies go to the agency contact email; inbound mailbox synchronization is not part of this milestone.

The operator must schedule authenticated POST requests to `/api/internal/automations`, `/api/internal/messages`, and `/api/internal/screening`. `node --env-file=.env.local scripts/process-applicants.mjs` is a bounded runner when `RECRUTA_WORKER_BASE_URL` is configured. Keep secrets server-side; run one bounded invocation per scheduler tick and alert on nonzero exit. These routes require bearer secrets and expose no browser worker controls. The script does not install a scheduler.

## Safety and delivery

Messages have immutable recipients/content and stable logical/provider idempotency keys, database leases, bounded attempts, and sanitized failure codes. Retries within the provider deduplication window reuse the same key. Records older than 23 hours require operator reconciliation rather than an automatic resend that may duplicate an accepted email. A user may cancel pending messages, but not already claimed deliveries. Provider acceptance means Sent; only a verified callback means Delivered. Callbacks are signature-checked, deduplicated, and ordered; an early callback receives a retryable response until the provider ID is saved. Bounces and complaints pause candidate email. Other provider failures do not imply candidate opt-out.

Missing-information messages stop when an application becomes terminal or its job closes. Revoked senders lose pending delivery eligibility. Rejection messages require a recruiter-confirmed message and an already rejected application; no automatic rejection messages or stage-change emails exist. New-application acknowledgements are the only automatic candidate messages. Review reminders appear in Needs attention and do not email candidates.

Screening displays model/version/date, requirement evidence, source excerpts, uncertainty, extracted text, and bounded run history. Recruiter corrections are append-only separate records and never overwrite model output. Extraction checkpoints survive transient assessment failures. Candidate documents remain private. History currently shows 20 runs, 200 recent corrections, and 50 messages. Needs attention shows up to 20 oldest items per category; it ignores Overview date filters.

## Database portability

The historical RLS optimization migration now conditionally revokes the hosted-only `public.rls_auto_enable()` helper when it exists. This is a narrow replay-portability correction: it creates no replacement helper and changes no existing application data. All new application schema changes remain forward migrations. Clean local reset now includes organization, applicant, screening, workspace, branding, and processing migrations.

## Operator readiness

Before live activation: verify the sending domain and signed callback, deploy/schedule workers with appropriate timeouts, set provider spend limits, check queue lag and exhausted failures, run human-reviewed synthetic document evaluations against the selected model, and complete candidate-data consent/retention review. Fake-provider tests prove orchestration and UI behavior, not live extraction accuracy or actual email deliverability.

Staging advisor review found no missing-RLS findings. Signed-in `SECURITY DEFINER` RPC warnings are expected for the deliberately exposed, membership-checked transactional APIs; authorization and revoked-access behavior are covered by database tests. [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) remains disabled in staging and should be configured before a live pilot. [Foreign-key index advisories](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys) remain performance follow-up work; unused queue indexes are retained because processing is intentionally inactive.

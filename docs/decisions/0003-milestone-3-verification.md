# Milestone 3B/3C verification

Date: October 26, 2026.

Implemented screening evidence/history, append-only recruiter corrections, extraction checkpoints, workspace opt-in, durable intake preparation, candidate email composition/templates/history/retry/cancel, signed delivery callbacks, acknowledgement automation, and Needs attention. See [execution and activation](0002-applicant-processing-and-communication.md).

Verification on the final implementation:

- Clean local migration replay: passed, including the hosted-helper portability guard.
- Local database suite: 179 assertions across seven files passed. Includes job/tenant access, revocation, worker leases, message idempotency, callbacks, corrections, and acknowledgement persistence when AI configuration is unavailable.
- Unit/component suite: 141 passed; six billable live AI evaluations deliberately skipped.
- Playwright: all 22 desktop/mobile scenarios passed against a local production server and approved disposable synthetic staging fixtures. Includes evidence correction, failed-message history, disabled provider controls, workspace creation/switching, logo settings, revoked access, and accessibility checks.
- Formatting, lint, TypeScript, diff whitespace check, and production build: passed.
- Staging migrations applied through `20261026093935_isolate_intake_screening_failures`. Generated database types refreshed.
- Synthetic staging workspaces cleaned up; final remaining fixture count: zero.

These are locally executed checks, not a claim that remote GitHub CI or a deployed staging frontend has run. Live AI/email remained disabled. No model was selected, scheduler provisioned, or real candidate data sent. Live model/document evaluations and verified sending-domain/webhook delivery remain activation work requested for later. The staging advisor follow-ups are recorded in ADR 0002.

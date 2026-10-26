# Applicant worker scheduling

Date: October 26, 2026.

The deployed webhook at `https://userecruta.vercel.app/api/webhooks/resend` rejects unsigned requests and accepts an ignored signed synthetic event. Initial workers reported disabled configuration; the owner corrected the Production environment and redeployed. All three workers then returned healthy empty-queue responses.

The deployed synthetic pilot passed: an owner created an agency, one organization, and a published job with two openings; the public job was reachable; a synthetic PDF application was accepted; intake automatically queued screening and acknowledgement; GPT-6 Luna extracted and supported TypeScript evidence; Resend accepted the acknowledgement; and its actual signed callback marked the communication Delivered. One job and one organization remained for two openings. The isolated agency, dependent rows, private résumé object, screening request keys, and synthetic auth user were removed afterward. Existing agency data was untouched.

Use the existing GitHub Actions repository for bounded worker ticks with `.github/workflows/applicant-workers.yml`. The workflow requests a tick every five minutes, serializes invocations with a concurrency group, and processes at most two items per target per tick. It has read-only repository permissions and a fifteen-minute timeout. It installs no application dependencies. GitHub scheduling is best effort, so this is suitable for the staging pilot, not a delivery-time guarantee. See [GitHub schedule behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).

Activation requires repository variable `RECRUTA_WORKERS_ENABLED=true`, origin variable `RECRUTA_WORKER_BASE_URL=https://userecruta.vercel.app`, and encrypted repository secrets `AUTOMATION_WORKER_SECRET` and `SCREENING_WORKER_SECRET` matching Vercel. No OpenAI, Resend, or Supabase service keys belong in this workflow. The gate is off when absent or false. Set it false to stop worker ticks without cancelling in-flight provider work.

Automatic approval review initially rejected copying the worker secrets to GitHub. The user then explicitly approved that transfer to `thedezignking/recruta`. The two encrypted secrets and origin variable are configured; the completed deployed pilot permits enabling the gate after this workflow reaches main. Provider API keys and the Supabase service key were not transferred.

The runner treats all HTTP errors (including disabled-worker 503 responses), malformed responses, task failures, and lost leases as failures. It exits nonzero so failed runs remain visible. It accepts HTTPS deployment origins or local HTTP origins, rejects redirect responses, bounds the batch size, and never logs credentials or provider payloads. `npm run test:workers` verifies these behaviors without network access.

The initial GitHub browser job failed because no Supabase public client configuration existed in CI. The anonymous browser job now uses a synthetic localhost URL and placeholder publishable key. Its tests require no live project or secret keys. Database-backed synthetic scenarios remain explicit opt-in tests; authorization expectations are unchanged.

Verification: five offline runner tests, the production build with synthetic CI configuration, formatting, and lint passed. All eighteen anonymous desktop/mobile scenarios passed, with one desktop cold-navigation timeout passing on an isolated rerun. This change adds no database schema or application route changes. Check GitHub Actions for remote CI and subsequent worker runs; scheduling can be delayed.

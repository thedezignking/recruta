# Create-job draft implementation evidence

Date: October 30, 2026. Scope: local implementation following the owner's direction to prioritize the actual improved job flow. No remote deployment is claimed.

## Recruiter-facing behavior

- Save draft from Essentials with an organization, title and positive openings, without inventing a description or workplace type.
- Resume the draft with optional Department or team, criterion evidence and unfinished criteria/questions intact. Incomplete configuration is private and compiled into public child records only after publication validation.
- Closing an edited modal offers Keep editing, Discard changes and Save draft. Failed saves preserve the form. Browser unload warns about unsaved work; browser Back/Forward recovery remains pending.
- Publication errors identify fields and offer links back to them. Pending requests prevent duplicate submission and form edits. Review has keyboard-accessible scrolling and semantic progress.

## Data and authorization

Forward migrations `20261030121249_job_mutation_boundary.sql` and `20261030123506_job_draft_capture.sql` were replayed on disposable local Supabase. Database types were regenerated. Job mutations bind the verified workspace and use authorized RPC operations. Direct authenticated writes to job aggregates are revoked; primary assignments remain consistent; conversion authorizes before returning an existing job and does not silently grant employer access.

Private draft configuration has tenant/job integrity, RLS and no anonymous access. Published configuration stays subject to its stricter schema. This slice does not implement atomic save-and-publish receipts, ownerless drafts, the complete deadline contract, compensation privacy, richer role/question models or the shared faithful preview. The full plan retains those findings.

## Verification

- Full unit suite: 199 passed, 14 skipped before final accessibility adjustments; subsequent targeted form/dialog checks passed (8 tests), and the final dialog suite passed all 4 cases, including Save draft from the close confirmation.
- Database suite: 10 files, 312 assertions passed, including actual authenticated write-denial tests, revoked access, conversion retries, primary assignment and incomplete-draft publication tests.
- Production build and TypeScript passed; lint passed. The complete new draft/publication journey passed on desktop and mobile, including serious/critical accessibility checks and candidate-facing question rendering. Both review screenshots were visually inspected.
- Repository formatting reports two existing failures: `.claude/launch.json` and `src/components/jobs/new-job-form.test.tsx`. These unrelated existing files were preserved. Modified implementation files pass formatting; `git diff --check` passed.
- First full browser run: 20 passed, 6 failed. Failures exposed account-avatar contrast, mobile progress/scroll accessibility, and an old publication fixture lacking workplace type. All three causes were corrected before the final rerun.
- Second full browser run: 24 passed, 2 failed because an existing Overview test expected a dropdown after the product had changed to segmented buttons. The test now uses the existing labeled button and verifies its pressed state.
- Final full browser run: all 26 tests passed across desktop and mobile (4.8 minutes), including applicant operations, collaboration, draft capture/restoration/publication, public-form rendering, workspace switching and access revocation. Final standalone TypeScript and lint checks passed.

All authenticated fixtures use the isolated local wrapper, synthetic records and disabled external providers. The wrapper accepts `RECRUTA_E2E_PORT` so verification does not stop an existing development server.

## Discard close regression

Discard previously requested route replacement while leaving both controlled dialogs mounted. Closing now unmounts the form and confirmation immediately, clears the unsaved-page warning, and ignores late close callbacks while returning to the originating page. Five dialog regression tests pass, including an Overview discard with navigation deliberately left pending and no save request. Browser coverage also checks Overview discard creates no job, alongside saved-draft discard on desktop and mobile.

The targeted desktop and mobile browser journeys both passed, as did the production build, TypeScript, targeted lint and formatting. The initial browser attempt timed out at sign-in before reaching the form; allowing the local sign-in navigation 20 seconds resolved it. The initial Vitest thread worker did not start; all five dialog tests passed using the forks pool.

import { test, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
loadEnvConfig(process.cwd());
const expect = baseExpect.configure({ timeout: 20000 });
test.describe("recruiter and hiring manager collaboration", () => {
  test.skip(
    process.env.RECRUTA_E2E_DATABASE !== "1",
    "Requires a disposable synthetic fixture database.",
  );
  test.setTimeout(240000);
  test("shares intentionally, collects feedback, and removes access", async ({
    page,
    browser,
  }, testInfo) => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false } },
    );
    const namespace = crypto.randomUUID();
    const agencyId = crypto.randomUUID();
    const clientId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const hiddenJob = crypto.randomUUID();
    const appId = crypto.randomUUID();
    const hiddenApp = crypto.randomUUID();
    const candidateId = crypto.randomUUID();
    const hiddenCandidate = crypto.randomUUID();
    const users: string[] = [];
    const emails = [0, 1, 2].map(
      (i) => `collaboration-${namespace}-${i}@example.invalid`,
    );
    const password = `Synthetic-${crypto.randomUUID()}!`;
    const extra = await browser.newContext();
    const hirer = await extra.newPage();
    async function insert(
      table: string,
      value: Record<string, unknown> | Record<string, unknown>[],
    ) {
      const r = await admin.from(table).insert(value);
      if (r.error) throw new Error(`${table}: ${r.error.message}`);
    }
    async function signIn(target: typeof page, email: string) {
      await target.goto("/login");
      await target.getByLabel("Work email", { exact: true }).fill(email);
      await target.getByLabel("Password", { exact: true }).fill(password);
      await target
        .getByRole("button", { name: "Sign in", exact: true })
        .click();
    }
    try {
      for (const email of emails) {
        const r = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (r.error || !r.data.user) throw r.error;
        users.push(r.data.user.id);
      }
      await insert("agencies", {
        id: agencyId,
        name: `Collaboration E2E ${namespace}`,
        slug: `collaboration-${namespace}`,
        contact_email: emails[0],
        country_code: "NG",
        timezone: "Africa/Lagos",
      });
      await insert("agency_processing_settings", {
        agency_id: agencyId,
        screening_enabled: false,
        acknowledge_applications: false,
      });
      await insert(
        "user_profiles",
        users.map((id, i) => ({
          id,
          full_name: [
            "Fixture Recruiter",
            "Fixture Hiring Manager",
            "Fixture Reviewer",
          ][i],
        })),
      );
      await insert("agency_memberships", {
        agency_id: agencyId,
        user_id: users[0],
        role: "owner",
        status: "active",
      });
      await insert("clients", {
        id: clientId,
        agency_id: agencyId,
        name: "Synthetic employer",
      });
      await insert("client_memberships", [
        {
          agency_id: agencyId,
          client_id: clientId,
          user_id: users[1],
          role: "hiring_manager",
          status: "active",
        },
        {
          agency_id: agencyId,
          client_id: clientId,
          user_id: users[2],
          role: "reviewer",
          status: "active",
        },
      ]);
      await insert("jobs", [
        {
          id: jobId,
          agency_id: agencyId,
          client_id: clientId,
          title: "Synthetic shared role",
          description:
            "This job is used only for isolated collaboration testing.",
          positions_required: 2,
          created_by: users[0],
        },
        {
          id: hiddenJob,
          agency_id: agencyId,
          client_id: clientId,
          title: "Unshared private role",
          description:
            "A synthetic private role that is not shared with the employer.",
          positions_required: 1,
          created_by: users[0],
        },
      ]);
      await insert("candidates", [
        {
          id: candidateId,
          agency_id: agencyId,
          full_name: "Shared Synthetic Candidate",
          email: `candidate-${namespace}@example.invalid`,
        },
        {
          id: hiddenCandidate,
          agency_id: agencyId,
          full_name: "Unshared Synthetic Candidate",
          email: `hidden-${namespace}@example.invalid`,
        },
      ]);
      await insert("applications", [
        {
          id: appId,
          agency_id: agencyId,
          job_id: jobId,
          candidate_id: candidateId,
          status: "shortlisted",
        },
        {
          id: hiddenApp,
          agency_id: agencyId,
          job_id: jobId,
          candidate_id: hiddenCandidate,
          status: "shortlisted",
        },
      ]);
      await insert("application_notes", {
        agency_id: agencyId,
        application_id: appId,
        author_user_id: users[0],
        body: "PRIVATE-AGENCY-NOTE-MUST-NEVER-APPEAR-IN-PORTAL",
      });
      const resume = await readFile(
        "tests/fixtures/screening/synthetic-resume.pdf",
      );
      const documentPath = `${agencyId}/${jobId}/${appId}/synthetic.pdf`;
      const uploaded = await admin.storage
        .from("candidate-documents")
        .upload(documentPath, resume, { contentType: "application/pdf" });
      if (uploaded.error) throw uploaded.error;
      await insert("candidate_documents", {
        id: crypto.randomUUID(),
        agency_id: agencyId,
        candidate_id: candidateId,
        application_id: appId,
        document_type: "resume",
        file_name: "synthetic.pdf",
        storage_path: documentPath,
        content_type: "application/pdf",
        size_bytes: resume.length,
      });
      await signIn(page, emails[0]);
      await expect(page).toHaveURL(/\/app$/);
      await page.goto(`/app/jobs/${jobId}`);
      await expect(
        page.getByText("Hiring managers", { exact: true }),
      ).toBeVisible();
      const access = await page.request.patch(
        `/api/v1/jobs/${jobId}/collaborators`,
        {
          headers: { "x-agency-id": agencyId },
          data: { userId: users[1], action: "grant" },
        },
      );
      expect(access.status()).toBe(200);
      const readerAccess = await page.request.patch(
        `/api/v1/jobs/${jobId}/collaborators`,
        {
          headers: { "x-agency-id": agencyId },
          data: { userId: users[2], action: "grant" },
        },
      );
      expect(readerAccess.status()).toBe(200);
      await page.goto(`/app/applications/${appId}`);
      await page
        .getByLabel("Summary to share", { exact: true })
        .fill("Recruiter-selected relevant experience for this role.");
      await page
        .getByRole("checkbox", { name: "Include synthetic.pdf", exact: true })
        .check();
      await page
        .getByRole("button", { name: "Share candidate", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Withdraw submission", exact: true }),
      ).toBeVisible();
      await signIn(hirer, emails[1]);
      await expect(hirer).toHaveURL(/\/portal$/);
      await hirer.goto(`/portal/jobs/${jobId}`);
      await expect(
        hirer.getByText("Shared Synthetic Candidate", { exact: true }),
      ).toBeVisible();
      const download = await hirer.request.get(
        `/api/v1/portal/submissions/${(await admin.from("candidate_submissions").select("id").eq("application_id", appId).single()).data!.id}/resume`,
        { headers: { "x-client-id": clientId } },
      );
      expect(download.status()).toBe(200);
      const downloadUrl = (await download.json()).data.downloadUrl;
      expect((await hirer.request.get(downloadUrl)).status()).toBe(200);
      await expect(
        hirer.getByText("Unshared Synthetic Candidate", { exact: true }),
      ).toHaveCount(0);
      await expect(
        hirer.getByText("PRIVATE-AGENCY-NOTE-MUST-NEVER-APPEAR-IN-PORTAL", {
          exact: true,
        }),
      ).toHaveCount(0);
      await hirer
        .getByLabel("Feedback", { exact: true })
        .fill("Please arrange a discussion about this experience.");
      await hirer
        .getByLabel("Strengths", { exact: true })
        .fill("Clear evidence of relevant work");
      await hirer
        .getByRole("button", { name: "Share feedback", exact: true })
        .click();
      await expect(
        hirer.getByText("Feedback shared with your agency.", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByText("Please arrange a discussion about this experience.", {
          exact: true,
        }),
      ).toBeVisible();
      const direct = await hirer.request.get(`/api/v1/applications/${appId}`);
      expect([403, 404]).toContain(direct.status());
      await hirer.goto(`/portal/jobs/${hiddenJob}`);
      await expect(
        hirer.getByRole("heading", { name: /not found|404/i }),
      ).toBeVisible();
      await hirer.goto(`/portal/jobs/${jobId}`);
      const accessibility = await new AxeBuilder({ page: hirer })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(
        accessibility.violations.filter((v) =>
          ["serious", "critical"].includes(v.impact ?? ""),
        ),
      ).toEqual([]);
      await hirer.screenshot({
        path: testInfo.outputPath("hiring-manager-feedback.png"),
        fullPage: true,
      });
      // Save a real draft; no submit notification, candidate email, or AI request.
      await hirer.goto("/portal/requests/new");
      await hirer
        .getByLabel("Job title", { exact: true })
        .fill("Synthetic requested role");
      await hirer
        .getByLabel("Role description", { exact: true })
        .fill("A synthetic role description used to test a saved draft.");
      await hirer
        .getByLabel("Requirements", { exact: true })
        .fill("Relevant professional experience");
      await hirer
        .getByRole("button", { name: "Save draft", exact: true })
        .click();
      await expect(hirer).toHaveURL(/\/portal\/requests\/[a-f0-9-]+$/);
      await expect(
        hirer.getByRole("button", { name: "Submit request", exact: true }),
      ).toBeVisible();
      const revoke = await page.request.patch(
        `/api/v1/jobs/${jobId}/collaborators`,
        {
          headers: { "x-agency-id": agencyId },
          data: { userId: users[1], action: "revoke" },
        },
      );
      expect(revoke.status()).toBe(200);
      await hirer.goto(`/portal/jobs/${jobId}`);
      await expect(
        hirer.getByRole("heading", { name: /not found|404/i }),
      ).toBeVisible();
      await admin
        .from("client_memberships")
        .update({ status: "revoked" })
        .eq("client_id", clientId)
        .eq("user_id", users[1]);
      const denied = await hirer.request.get("/api/v1/portal/jobs", {
        headers: { "x-client-id": clientId },
      });
      expect(denied.status()).toBe(403);
      const reader = await extra.newPage();
      await signIn(reader, emails[2]);
      await expect(reader).toHaveURL(/\/portal$/);
      await reader.goto(`/portal/jobs/${jobId}`);
      await expect(
        reader.getByText("You have read-only access.", { exact: true }),
      ).toBeVisible();
      await expect(
        reader.getByRole("button", { name: "Share feedback", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Withdraw submission", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Share candidate", exact: true }),
      ).toBeVisible();
      await reader.reload();
      await expect(
        reader.getByText("Shared Synthetic Candidate", { exact: true }),
      ).toHaveCount(0);
      // Generated one-time link verifies SSR invite cookies without sending mail.
      const invitedEmail = `new-collaborator-${namespace}@example.invalid`;
      const authInvite = await admin.auth.admin.generateLink({
        type: "invite",
        email: invitedEmail,
      });
      if (
        authInvite.error ||
        !authInvite.data.user ||
        !authInvite.data.properties
      )
        throw new Error("Synthetic invite setup failed.");
      users.push(authInvite.data.user.id);
      const invitationToken = crypto.randomUUID() + crypto.randomUUID();
      await insert("client_invitations", {
        id: crypto.randomUUID(),
        agency_id: agencyId,
        client_id: clientId,
        job_id: jobId,
        email: invitedEmail,
        role: "hiring_manager",
        token_hash: createHash("sha256").update(invitationToken).digest("hex"),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        invited_by: users[0],
      });
      const invited = await extra.newPage();
      const next = `/invitations/${invitationToken}?kind=client&setup=1`;
      await invited.goto(
        `/auth/callback?${new URLSearchParams({ token_hash: authInvite.data.properties.hashed_token, type: "invite", next })}`,
      );
      await invited
        .getByLabel("Full name", { exact: true })
        .fill("New Synthetic Hiring Manager");
      await invited
        .getByLabel("Create password", { exact: true })
        .fill(password);
      await invited
        .getByRole("button", { name: "Accept invitation", exact: true })
        .click();
      await expect(invited).toHaveURL(/\/portal$/);
      await invited.goto(`/portal/jobs/${jobId}`);
      await expect(
        invited.getByRole("heading", {
          name: "Synthetic shared role",
          exact: true,
        }),
      ).toBeVisible();
      // Public retries keep one application/document and never overwrite a receipt.
      const publication = await admin
        .from("jobs")
        .update({
          status: "open",
          published_at: new Date().toISOString(),
          public_slug: `synthetic-${namespace}`,
          accepting_applications: true,
        })
        .eq("id", jobId);
      if (publication.error) throw publication.error;
      const endpoint = `/api/v1/public/agencies/collaboration-${namespace}/jobs/synthetic-${namespace}/applications`;
      const intakeKey = crypto.randomUUID();
      const multipart = {
        fullName: "Public Synthetic Applicant",
        email: `public-${namespace}@example.invalid`,
        consent: "true",
        answers: "[]",
        resume: {
          name: "synthetic.pdf",
          mimeType: "application/pdf",
          buffer: resume,
        },
      };
      const applied = await page.request.post(endpoint, {
        headers: { "Idempotency-Key": intakeKey },
        multipart,
      });
      expect(applied.status()).toBe(201);
      const receipt = await applied.json();
      const retried = await page.request.post(endpoint, {
        headers: { "Idempotency-Key": intakeKey },
        multipart,
      });
      expect(retried.status()).toBe(201);
      expect((await retried.json()).data.applicationId).toBe(
        receipt.data.applicationId,
      );
      const changed = await page.request.post(endpoint, {
        headers: { "Idempotency-Key": intakeKey },
        multipart: { ...multipart, fullName: "Different Synthetic Applicant" },
      });
      expect(changed.status()).toBe(409);
      const duplicate = await page.request.post(endpoint, {
        headers: { "Idempotency-Key": crypto.randomUUID() },
        multipart,
      });
      expect(duplicate.status()).toBe(409);
    } finally {
      await extra.close();
      const agency = await admin
        .from("agencies")
        .select("name")
        .eq("id", agencyId)
        .maybeSingle();
      if (agency.error) throw agency.error;
      if (agency.data) {
        if (agency.data.name !== `Collaboration E2E ${namespace}`)
          throw new Error("Refusing non-fixture cleanup.");
        const documents = await admin
          .from("candidate_documents")
          .select("storage_path")
          .eq("agency_id", agencyId);
        if (documents.error) throw documents.error;
        const paths = (documents.data ?? []).map((d) => d.storage_path);
        if (paths.some((path) => !path.startsWith(`${agencyId}/`)))
          throw new Error("Refusing non-fixture storage cleanup.");
        if (paths.length) {
          const removed = await admin.storage
            .from("candidate-documents")
            .remove(paths);
          if (removed.error) throw removed.error;
        }
        for (const table of [
          "submission_feedback",
          "candidate_submissions",
          "client_job_access",
          "client_invitations",
          "application_intake_tasks",
          "communications",
          "application_notes",
          "candidate_documents",
          "application_answers",
          "activity_events",
          "applications",
          "candidates",
          "hiring_request_requirements",
          "hiring_request_messages",
          "hiring_request_attachments",
          "hiring_requests",
          "job_assignments",
          "job_requirements",
          "job_workflow_stages",
          "jobs",
          "client_memberships",
          "clients",
          "agency_processing_settings",
          "agency_memberships",
        ]) {
          const r = await admin.from(table).delete().eq("agency_id", agencyId);
          if (r.error) throw new Error(`Cleanup ${table}: ${r.error.message}`);
        }
        const r = await admin.from("agencies").delete().eq("id", agencyId);
        if (r.error) throw r.error;
      }
      for (const id of users) {
        await admin.from("user_profiles").delete().eq("id", id);
        const r = await admin.auth.admin.deleteUser(id);
        if (r.error) throw r.error;
      }
    }
  });
});

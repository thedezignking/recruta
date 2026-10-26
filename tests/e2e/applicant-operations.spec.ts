import { test, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  screeningFixture,
  screeningOutputFixture,
} from "../../src/server/screening/fixtures";

loadEnvConfig(process.cwd());
const expect = baseExpect.configure({ timeout: 20_000 });
test.describe("applicant operations with isolated synthetic data", () => {
  test.skip(
    process.env.RECRUTA_E2E_DATABASE !== "1",
    "Set RECRUTA_E2E_DATABASE=1 to use the configured staging database.",
  );
  test.setTimeout(180_000);

  test("recruiter review, notes, ownership, stale edits, and revoked access", async ({
    page,
  }, testInfo) => {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const agencyId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const candidateId = crypto.randomUUID();
    const applicationId = crypto.randomUUID();
    const organizationId = crypto.randomUUID();
    const password = `Synthetic-${crypto.randomUUID()}!`;
    const email = `recruta-e2e-${agencyId}@example.invalid`;
    const users: string[] = [];
    async function insert(
      table: string,
      rows: Record<string, unknown> | Record<string, unknown>[],
    ) {
      const { error } = await admin.from(table).insert(rows);
      if (error) throw new Error(`Fixture ${table}: ${error.message}`);
    }
    try {
      for (const address of [email, `recruiter-${agencyId}@example.invalid`]) {
        const { data, error } = await admin.auth.admin.createUser({
          email: address,
          password,
          email_confirm: true,
        });
        if (error || !data.user)
          throw new Error(`Synthetic user setup: ${error?.message}`);
        users.push(data.user.id);
      }
      await insert("agencies", {
        id: agencyId,
        name: `Recruta E2E ${agencyId}`,
        slug: `e2e-${agencyId}`,
        contact_email: email,
        country_code: "NG",
        timezone: "Africa/Lagos",
      });
      await insert(
        "user_profiles",
        users.map((id, index) => ({
          id,
          full_name: index ? "Fixture Recruiter" : "Fixture Manager",
        })),
      );
      await insert(
        "agency_memberships",
        users.map((user_id, index) => ({
          agency_id: agencyId,
          user_id,
          role: index ? "recruiter" : "recruitment_manager",
          status: "active",
        })),
      );
      await insert("clients", {
        id: organizationId,
        agency_id: agencyId,
        name: "Synthetic Review Studio",
      });
      await insert("jobs", {
        id: jobId,
        agency_id: agencyId,
        client_id: organizationId,
        title: "Synthetic Designer",
        positions_required: 2,
        created_by: users[0],
        status: "open",
      });
      await insert("job_assignments", {
        agency_id: agencyId,
        job_id: jobId,
        user_id: users[1],
        assignment_role: "primary",
      });
      await insert("candidates", {
        id: candidateId,
        agency_id: agencyId,
        full_name: "Ada Fixture",
        email: `ada-${agencyId}@example.invalid`,
      });
      await insert("applications", {
        id: applicationId,
        agency_id: agencyId,
        job_id: jobId,
        candidate_id: candidateId,
      });
      const questionId = crypto.randomUUID();
      await insert("job_application_questions", {
        id: questionId,
        agency_id: agencyId,
        job_id: jobId,
        label: "Describe your portfolio",
        question_type: "long_text",
      });
      await insert("application_answers", {
        agency_id: agencyId,
        job_id: jobId,
        application_id: applicationId,
        question_id: questionId,
        answer: "Synthetic portfolio evidence for review.",
      });
      const documentId = crypto.randomUUID();
      const runId = crypto.randomUUID();
      await insert("candidate_documents", {
        id: documentId,
        agency_id: agencyId,
        candidate_id: candidateId,
        application_id: applicationId,
        file_name: "synthetic-evidence.pdf",
        storage_path: `${agencyId}/synthetic-evidence.pdf`,
        content_type: "application/pdf",
        size_bytes: 8,
      });
      await insert("screening_runs", {
        id: runId,
        agency_id: agencyId,
        application_id: applicationId,
        document_id: documentId,
        requested_by: users[0],
        request_id: "synthetic-browser-fixture",
        idempotency_key: crypto.randomUUID(),
        input_fingerprint: `synthetic-${runId}`,
        model: "synthetic-test-provider",
        prompt_version: "screening-v1",
        extractor_version: "extraction-v1",
        status: "succeeded",
        attempts: 1,
        input_snapshot: {
          ...screeningFixture,
          job: { id: jobId, title: "Synthetic Designer", description: null },
          document: {
            ...screeningFixture.document,
            id: documentId,
            storage_path: `${agencyId}/synthetic-evidence.pdf`,
          },
        },
        extraction: {
          readable: true,
          sections: [{ label: "Experience", text: "Built TypeScript APIs" }],
          warnings: [],
        },
        assessment: screeningOutputFixture,
      });
      await insert("communications", {
        agency_id: agencyId,
        application_id: applicationId,
        sender_user_id: users[0],
        recipient_email: `ada-${agencyId}@example.invalid`,
        message_type: "status_update",
        related_entity_type: "application",
        related_entity_id: applicationId,
        idempotency_key: `synthetic-email:${runId}`,
        subject: "Synthetic application update",
        body: "A synthetic message for UI verification. No email was sent.",
        status: "failed",
        failure_code: "provider_unavailable",
      });

      await page.goto("/login");
      await page.getByLabel("Work email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      const signInResponse = page.waitForResponse(
        (response) =>
          response.url().includes("/auth/v1/token") &&
          response.request().method() === "POST",
      );
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      expect((await signInResponse).status()).toBe(200);
      await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
      await page.goto("/app/applications");
      await expect(
        page.getByRole("link", { name: "Ada Fixture", exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("Search applications", { exact: true })
        .fill("Not a matching person");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page.getByText("No matching applications")).toBeVisible();
      await page
        .getByLabel("Search applications", { exact: true })
        .fill("Ada Fixture");
      await page.getByRole("button", { name: "Search", exact: true }).click();
      await page
        .getByRole("link", { name: "Review Ada Fixture", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Ada Fixture" }),
      ).toBeVisible();
      await expect(
        page.getByText("Synthetic portfolio evidence for review."),
      ).toBeVisible();
      await expect(
        page.getByText("The applicant reports building TypeScript APIs.", {
          exact: true,
        }),
      ).toBeVisible();
      await page.getByText("Correct this assessment", { exact: true }).click();
      await page
        .getByLabel("Reason and supporting evidence", { exact: true })
        .fill(
          "Recruiter verified this synthetic evidence against the original document.",
        );
      await page
        .getByRole("button", { name: "Save correction", exact: true })
        .click();
      await expect(page.getByText(/Recruiter correction ·/)).toBeVisible();
      await expect(
        page.getByText("Synthetic application update", { exact: true }),
      ).toBeVisible();
      await page.getByText("Write an email", { exact: true }).click();
      await expect(
        page.getByRole("button", { name: "Queue email", exact: true }),
      ).toBeDisabled();
      await page.getByText("Write an email", { exact: true }).click();
      const before = await admin
        .from("applications")
        .select("updated_at")
        .eq("id", applicationId)
        .single();
      await page
        .getByLabel("Internal note", { exact: true })
        .fill("Synthetic note: review portfolio evidence with the team.");
      await page.getByRole("button", { name: "Add note", exact: true }).click();
      await expect(
        page.getByText("Note added.", { exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByRole("listitem")
          .getByText(
            "Synthetic note: review portfolio evidence with the team.",
            { exact: true },
          ),
      ).toBeVisible();
      await page.getByRole("combobox", { name: "Move to stage" }).click();
      await page
        .getByRole("option", { name: "In review", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Update stage", exact: true })
        .click();
      await expect(
        page.getByText("Stage updated. No email was sent."),
      ).toBeVisible();
      const stale = await page.request.patch(
        `/api/v1/applications/${applicationId}`,
        {
          headers: { "x-agency-id": agencyId },
          data: {
            action: "transition",
            status: "shortlisted",
            expectedUpdatedAt: before.data!.updated_at,
          },
        },
      );
      expect(stale.status()).toBe(409);
      await page.getByRole("combobox", { name: "Application owner" }).click();
      await page
        .getByRole("option", { name: "Fixture Recruiter", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save owner", exact: true })
        .click();
      await expect(page.getByText("Owner updated.")).toBeVisible();
      await page.getByRole("combobox", { name: "Move to stage" }).click();
      await page.getByRole("option", { name: "Rejected", exact: true }).click();
      const reason = page.getByLabel("Reason (required)", { exact: true });
      await expect(reason).toHaveAttribute("required", "");
      await reason.fill(
        "Synthetic review outcome recorded for this test only.",
      );
      await page
        .getByRole("button", { name: "Update stage", exact: true })
        .click();
      await expect(
        page.getByText("Stage updated. No email was sent."),
      ).toBeVisible();
      await expect(
        page
          .getByRole("listitem")
          .getByText("Synthetic review outcome recorded for this test only.", {
            exact: true,
          }),
      ).toBeVisible();
      const saved = await admin
        .from("applications")
        .select("status,owner_user_id")
        .eq("id", applicationId)
        .single();
      expect(saved.data).toMatchObject({
        status: "rejected",
        owner_user_id: users[1],
      });
      await page.screenshot({
        path: testInfo.outputPath("application-detail.png"),
        fullPage: true,
      });
      const accessibility = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
        .analyze();
      expect(
        accessibility.violations.filter((violation) =>
          ["serious", "critical"].includes(violation.impact ?? ""),
        ),
      ).toEqual([]);
      await admin
        .from("agency_memberships")
        .update({ status: "revoked" })
        .eq("agency_id", agencyId)
        .eq("user_id", users[0]);
      const revoked = await page.request.patch(
        `/api/v1/applications/${applicationId}`,
        {
          headers: { "x-agency-id": agencyId },
          data: {
            action: "note",
            noteId: crypto.randomUUID(),
            body: "Must be denied after revocation",
          },
        },
      );
      expect(revoked.status()).toBe(403);
    } finally {
      await cleanupSyntheticFixture(admin, agencyId, users);
    }
  });
});

async function cleanupSyntheticFixture(
  admin: SupabaseClient,
  agencyId: string,
  users: string[],
) {
  const agency = await admin
    .from("agencies")
    .select("name")
    .eq("id", agencyId)
    .maybeSingle();
  if (agency.error) throw new Error("Cannot verify synthetic cleanup target.");
  if (agency.data && agency.data.name !== `Recruta E2E ${agencyId}`)
    throw new Error("Refusing cleanup of a non-test workspace.");
  if (agency.data) {
    for (const table of [
      "application_intake_tasks",
      "communications",
      "screening_corrections",
      "agency_processing_settings",
      "screening_runs",
      "application_notes",
      "candidate_documents",
      "application_answers",
      "activity_events",
      "applications",
      "candidates",
      "job_application_questions",
      "job_assignments",
      "job_workflow_stages",
      "job_requirements",
      "jobs",
      "clients",
      "agency_memberships",
    ]) {
      const { error } = await admin
        .from(table)
        .delete()
        .eq("agency_id", agencyId);
      if (error)
        throw new Error(`Synthetic cleanup ${table}: ${error.message}`);
    }
    const { error } = await admin.from("agencies").delete().eq("id", agencyId);
    if (error) throw new Error(`Synthetic agency cleanup: ${error.message}`);
  }
  for (const id of users) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error(`Synthetic user cleanup: ${error.message}`);
  }
}

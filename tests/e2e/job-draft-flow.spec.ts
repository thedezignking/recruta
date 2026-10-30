import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());
test.skip(
  process.env.RECRUTA_E2E_DATABASE !== "1",
  "Requires the isolated local test wrapper.",
);
test.setTimeout(180_000);
test.use({ actionTimeout: 20_000 });
test("capture, restore, protect and publish a recruiter job draft", async ({
  page,
}, testInfo) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!url.startsWith("http://127.0.0.1:"))
    throw new Error("This fixture requires disposable local Supabase.");
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false },
  });
  const actor = createClient(
    url,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const namespace = crypto.randomUUID();
  const email = `draft-${namespace}@example.invalid`;
  const password = `Synthetic-${crypto.randomUUID()}!`;
  const slug = `draft-${namespace}`;
  let userId: string | undefined;
  let agencyId: string | undefined;
  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error || !created.data.user)
      throw created.error ?? new Error("Missing fixture user");
    userId = created.data.user.id;
    const signedIn = await actor.auth.signInWithPassword({ email, password });
    if (signedIn.error) throw signedIn.error;
    const onboarded = await actor.rpc("onboard_agency", {
      p_name: `Draft fixture ${namespace}`,
      p_slug: slug,
      p_contact_email: email,
      p_country_code: "NG",
      p_timezone: "Africa/Lagos",
      p_full_name: "Synthetic recruiter",
    });
    if (onboarded.error) throw onboarded.error;
    agencyId = onboarded.data;
    await page.goto("/login");
    await page.getByLabel("Work email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/app$/, { timeout: 20_000 });
    await page.goto("/app?new=1");
    await page.getByRole("button", { name: "Create it myself" }).click();
    await page
      .getByLabel("Job title", { exact: true })
      .fill("Discard this unsaved role");
    await page
      .getByRole("button", { name: "Close new job", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page).toHaveURL(/\/app$/);
    const discarded = await actor
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId!);
    expect(discarded.error).toBeNull();
    expect(discarded.count).toBe(0);
    const libraryId = crypto.randomUUID();
    const libraryInput = {
      id: libraryId,
      expectedVersion: 0,
      category: "Availability",
      archived: false,
      question: {
        label: "Which shift can you work?",
        helpText: "Choose the shift that works for you.",
        questionType: "single_select",
        options: ["Day, including weekends", "Night"],
        isRequired: false,
      },
    };
    const libraryKey = crypto.randomUUID();
    const libraryResponse = await page.request.post(
      "/api/v1/screening-question-library",
      {
        headers: { "x-agency-id": agencyId!, "x-idempotency-key": libraryKey },
        data: libraryInput,
      },
    );
    expect(libraryResponse.ok()).toBe(true);
    const libraryRetry = await page.request.post(
      "/api/v1/screening-question-library",
      {
        headers: { "x-agency-id": agencyId!, "x-idempotency-key": libraryKey },
        data: libraryInput,
      },
    );
    expect((await libraryRetry.json()).data.version).toBe(1);
    await page.goto("/app/settings");
    const libraryPanel = page.getByRole("region", {
      name: "Agency screening question library",
    });
    await expect(
      libraryPanel.getByText("Which shift can you work?", { exact: false }),
    ).toBeVisible();
    await libraryPanel
      .getByRole("button", { name: "Edit", exact: true })
      .click();
    await libraryPanel
      .getByRole("textbox", { name: "Help text", exact: true })
      .fill("Choose one shift. An answer does not make a hiring decision.");
    await libraryPanel
      .getByRole("button", { name: "Save question", exact: true })
      .click();
    await expect(libraryPanel.getByRole("status")).toContainText(
      "Question saved",
    );
    await page.goto("/app/jobs?new=1");
    await page.getByRole("button", { name: "Create it myself" }).click();
    await page
      .getByRole("button", {
        name: "Can't find it? Enter details manually",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Organization name", { exact: true })
      .fill(`Synthetic employer ${namespace}`);
    await page
      .getByLabel("Job title", { exact: true })
      .fill("Customer support specialist");
    await page.getByLabel("Number of openings").fill("3");
    await page
      .locator("summary")
      .filter({ hasText: "Internal hiring brief" })
      .click();
    await page
      .getByLabel("Hiring reason (optional)", { exact: true })
      .selectOption("replacement");
    await page
      .getByLabel("Target start date (optional)", { exact: true })
      .fill("2027-01-05");
    await page
      .getByLabel("Internal sourcing brief (optional)", { exact: true })
      .fill("Private sourcing context for the agency only.");
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page).toHaveURL(/\/app\/jobs\/[a-f0-9-]+$/);
    const jobUrl = page.url();
    const jobId = jobUrl.split("/").at(-1)!;
    const saved = await actor
      .from("jobs")
      .select("description,work_arrangement,positions_required,status")
      .eq("id", jobId)
      .single();
    expect(saved.data).toMatchObject({
      description: "",
      work_arrangement: null,
      positions_required: 3,
      status: "draft",
    });
    await page.getByRole("link", { name: "Edit draft", exact: true }).click();
    await expect(page.getByLabel("Job title", { exact: true })).toHaveValue(
      "Customer support specialist",
    );
    await page
      .getByLabel("Job title", { exact: true })
      .fill("Changed but unsaved");
    await page
      .getByRole("button", { name: "Close edit draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await expect(page.getByLabel("Job title", { exact: true })).toHaveValue(
      "Changed but unsaved",
    );
    await page
      .getByRole("button", { name: "Close edit draft", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await expect(page).toHaveURL(jobUrl);
    await page.getByRole("link", { name: "Edit draft", exact: true }).click();
    await expect(page.getByLabel("Job title", { exact: true })).toHaveValue(
      "Customer support specialist",
    );
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .getByLabel("Employment arrangement", { exact: true })
      .selectOption("fixed_term");
    await page
      .getByLabel("Working hours", { exact: true })
      .selectOption("part_time");
    await page
      .getByLabel("Contract duration", { exact: true })
      .fill("Six months");
    await page
      .getByLabel("Department or team (optional)", { exact: true })
      .fill("Customer success");
    await page
      .locator("#description")
      .fill(
        "Help customers resolve account questions and work with our operations team to improve service.",
      );
    await page
      .getByRole("combobox", { name: "Workplace type", exact: true })
      .click();
    await page.getByRole("option", { name: "Remote", exact: true }).click();
    await page
      .getByLabel("Remote eligibility", { exact: true })
      .selectOption("restricted");
    await page
      .getByLabel("Eligible locations or time zones", { exact: true })
      .fill("Nigeria; WAT working hours");
    await page
      .getByRole("button", { name: "Add salary range", exact: true })
      .click();
    await page.getByLabel("Minimum", { exact: true }).fill("123456");
    await page.getByLabel("Maximum", { exact: true }).fill("234567");
    await page
      .getByLabel("Salary visibility", { exact: true })
      .selectOption("hidden");
    await page
      .getByLabel("Gross or net", { exact: true })
      .selectOption("gross");
    await page.screenshot({
      path: testInfo.outputPath("job-role-details.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page
      .locator("summary")
      .filter({ hasText: "Screening questions" })
      .click();
    await page
      .getByRole("button", { name: "Add screening question", exact: true })
      .click();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(page).toHaveURL(jobUrl);
    await page.getByRole("link", { name: "Edit draft", exact: true }).click();
    await page.getByRole("button", { name: /Hiring setup/ }).click();
    await expect(page.getByLabel("Question", { exact: true })).toHaveValue("");
    await page
      .getByLabel("Question", { exact: true })
      .fill("When could you start?");
    await page
      .locator("summary")
      .filter({ hasText: "Add from agency question library" })
      .click();
    await page
      .getByRole("button", { name: "Use question", exact: true })
      .click();
    await expect(
      page.getByRole("list", { name: "Selected workflow stages" }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Publication readiness" }),
    ).toContainText("Ready to publish");
    await page.getByRole("button", { name: "Review job", exact: true }).click();
    await expect(
      page.getByText("Public job and application preview", { exact: true }),
    ).toBeVisible();
    const a11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
      .analyze();
    expect(
      a11y.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath("job-review.png"),
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Publish job", exact: true })
      .click();
    await expect(page).toHaveURL(jobUrl);
    const published = await actor
      .from("jobs")
      .select("status,public_slug,department")
      .eq("id", jobId)
      .single();
    expect(published.data).toMatchObject({
      status: "open",
      department: "Customer success",
    });
    const brief = await actor
      .from("job_internal_briefs")
      .select("salary_min,hiring_reason,target_start_date,sourcing_brief")
      .eq("job_id", jobId)
      .single();
    expect(brief.data).toMatchObject({
      salary_min: 123456,
      hiring_reason: "replacement",
      target_start_date: "2027-01-05",
    });
    const anonymous = createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const publicSalary = await anonymous
      .from("jobs")
      .select("salary_min,salary_max")
      .eq("id", jobId)
      .single();
    expect(publicSalary.data).toEqual({ salary_min: null, salary_max: null });
    expect(
      (await anonymous.from("job_internal_briefs").select("salary_min")).error,
    ).toBeTruthy();
    const archived = await page.request.post(
      "/api/v1/screening-question-library",
      {
        headers: {
          "x-agency-id": agencyId!,
          "x-idempotency-key": crypto.randomUUID(),
        },
        data: { ...libraryInput, expectedVersion: 2, archived: true },
      },
    );
    expect(archived.ok()).toBe(true);
    const publicPage = await page.context().newPage();
    await publicPage.goto(
      `/careers/${slug}/jobs/${published.data!.public_slug}`,
    );
    await expect(
      publicPage.getByRole("heading", {
        name: "Customer support specialist",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      publicPage.getByText("Six months", { exact: true }),
    ).toBeVisible();
    await expect(publicPage.locator("body")).not.toContainText(
      "Private sourcing context",
    );
    await expect(publicPage.locator("body")).not.toContainText("123,456");
    await publicPage.goto(
      `/careers/${slug}/jobs/${published.data!.public_slug}/apply`,
    );
    await expect(
      publicPage.getByLabel("When could you start?", { exact: true }),
    ).toBeVisible();
    await expect(
      publicPage.getByRole("combobox", {
        name: "Which shift can you work?",
        exact: true,
      }),
    ).toBeVisible();
    await publicPage.close();
  } finally {
    if (agencyId) {
      const fixture = await admin
        .from("agencies")
        .select("slug")
        .eq("id", agencyId)
        .single();
      if (fixture.data?.slug !== slug)
        throw new Error("Refusing non-fixture cleanup");
      for (const table of [
        "job_draft_content",
        "screening_question_library",
        "job_application_questions",
        "job_requirements",
        "job_workflow_stages",
        "job_assignments",
        "activity_events",
        "jobs",
        "clients",
        "agency_processing_settings",
      ]) {
        const removed = await admin
          .from(table)
          .delete()
          .eq("agency_id", agencyId);
        if (removed.error) throw removed.error;
      }
      const templates = await admin
        .from("workflow_templates")
        .select("id")
        .eq("agency_id", agencyId);
      for (const template of templates.data ?? [])
        await admin
          .from("workflow_stages")
          .delete()
          .eq("workflow_template_id", template.id);
      await admin.from("workflow_templates").delete().eq("agency_id", agencyId);
      await admin.from("agency_memberships").delete().eq("agency_id", agencyId);
      const removed = await admin.from("agencies").delete().eq("id", agencyId);
      if (removed.error) throw removed.error;
    }
    if (userId) {
      await admin.from("user_profiles").delete().eq("id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

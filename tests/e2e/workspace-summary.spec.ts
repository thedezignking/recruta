import { test, expect as baseExpect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";

loadEnvConfig(process.cwd());
const expect = baseExpect.configure({ timeout: 20_000 });
test.describe("workspace summary and selection", () => {
  test.use({ actionTimeout: 20_000 });
  test.skip(
    process.env.RECRUTA_E2E_DATABASE !== "1",
    "Requires isolated synthetic fixtures in the configured staging database.",
  );
  test.setTimeout(180_000);
  test("filters, creates another workspace, switches, and denies revoked access", async ({
    page,
  }, testInfo) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, {
      auth: { persistSession: false },
    });
    const actor = createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const namespace = crypto.randomUUID();
    const email = `workspace-${namespace}@example.invalid`;
    const password = `Synthetic-${crypto.randomUUID()}!`;
    const slugs = [`ws-one-${namespace}`, `ws-two-${namespace}`];
    const names = [
      `Recruta E2E Workspace One ${namespace}`,
      `Recruta E2E Workspace Two ${namespace}`,
    ];
    let userId: string | undefined;
    try {
      const created = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (created.error || !created.data.user)
        throw new Error(
          `Synthetic auth setup failed: ${created.error?.message ?? "No user returned"}`,
        );
      userId = created.data.user.id;
      const login = await actor.auth.signInWithPassword({ email, password });
      if (login.error) throw login.error;
      const first = await actor.rpc("onboard_agency", {
        p_name: names[0],
        p_slug: slugs[0],
        p_contact_email: email,
        p_country_code: "NG",
        p_timezone: "Africa/Lagos",
        p_full_name: "Fixture Owner",
      });
      if (first.error) throw first.error;
      await page.goto("/login");
      await page.getByLabel("Work email", { exact: true }).fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/app$/);
      const summary = page.getByRole("region", { name: "Recruitment summary" });
      await expect(summary.getByRole("link")).toHaveText([
        /Active jobs/,
        /Applications received/,
        /In review/,
        /Shortlisted/,
      ]);
      await expect(
        page.getByText("Current workload", { exact: false }),
      ).toHaveCount(0);
      await page.getByRole("combobox", { name: "Summary date range" }).click();
      await page
        .getByRole("option", { name: "Last 7 days", exact: true })
        .click();
      await expect(page).toHaveURL(/range=7d/);
      await expect(
        page.getByRole("combobox", { name: "Summary date range" }),
      ).toContainText("Last 7 days");
      await expect(
        page.getByRole("link", { name: "View all in review", exact: true }),
      ).toHaveAttribute("href", "/app/applications?status=in_review");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page
        .getByRole("button", { name: "Switch workspace", exact: true })
        .click();
      await expect(
        page.getByRole("menuitem", {
          name: `${names[0]}, current workspace`,
          exact: true,
        }),
      ).toBeVisible();
      await page
        .getByRole("menuitem", { name: "Create workspace", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Create workspace", exact: true }),
      ).toBeVisible();
      await expect(page.getByLabel("Agency contact email")).toHaveValue(email);
      await expect(page.getByLabel("Your name", { exact: true })).toHaveCount(
        0,
      );
      await page.getByLabel("Workspace name", { exact: true }).fill(names[1]);
      await page.getByLabel("Workspace URL", { exact: true }).fill(slugs[1]);
      await page
        .getByRole("button", { name: "Create workspace", exact: true })
        .click();
      await expect(page).toHaveURL(/\/app$/);
      await page
        .getByRole("button", { name: "Switch workspace", exact: true })
        .click();
      await expect(
        page.getByRole("menuitem", {
          name: `${names[1]}, current workspace`,
          exact: true,
        }),
      ).toBeVisible();
      const selectionResponse = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/v1/workspaces/select") &&
          response.request().method() === "POST",
        { timeout: 20_000 },
      );
      await page.getByRole("menuitem", { name: names[0], exact: true }).click();
      const selection = await selectionResponse;
      // The old document navigates immediately after success; do not read an
      // evicted response body after navigation has discarded that document.
      expect(selection.status()).toBe(200);
      await expect(
        page.getByRole("button", { name: "Switch workspace", exact: true }),
      ).toHaveAttribute("title", names[0]);
      await page
        .getByRole("button", { name: "Switch workspace", exact: true })
        .click();
      await expect(
        page.getByRole("menuitem", {
          name: `${names[0]}, current workspace`,
          exact: true,
        }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      // Exercise logo storage only inside this disposable synthetic workspace.
      await page.goto("/app/settings");
      await expect(
        page.getByRole("button", { name: "Upload logo", exact: true }),
      ).toBeVisible();
      const image = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4R8AAAAASUVORK5CYII=",
        "base64",
      );
      await page
        .getByLabel("Upload agency logo", { exact: true })
        .setInputFiles({
          name: "synthetic-logo.png",
          mimeType: "image/png",
          buffer: image,
        });
      await expect(
        page.getByText("Logo updated.", { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(
        page.getByRole("img", { name: "Agency logo", exact: true }),
      ).toBeVisible();
      await page
        .getByLabel("Upload agency logo", { exact: true })
        .setInputFiles({
          name: "replacement-logo.png",
          mimeType: "image/png",
          buffer: image,
        });
      await expect(
        page.getByText("Logo updated.", { exact: true }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Remove", exact: true }).click();
      await expect(
        page.getByText("Logo removed.", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("img", { name: "Agency logo", exact: true }),
      ).toHaveCount(0);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.goto("/app");
      const denied = await page.request.post("/api/v1/workspaces/select", {
        data: { agencyId: crypto.randomUUID() },
      });
      expect(denied.status()).toBe(403);
      await admin
        .from("agency_memberships")
        .update({ status: "revoked" })
        .eq("agency_id", first.data)
        .eq("user_id", userId);
      const revoked = await page.request.get("/api/v1/jobs", {
        headers: { "x-agency-id": first.data },
      });
      expect(revoked.status()).toBe(403);
      await page.reload();
      await page
        .getByRole("button", { name: "Switch workspace", exact: true })
        .click();
      await expect(
        page.getByRole("menuitem", {
          name: `${names[1]}, current workspace`,
          exact: true,
        }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      const accessibility = await new AxeBuilder({ page }).analyze();
      expect(
        accessibility.violations.filter((violation) =>
          ["serious", "critical"].includes(violation.impact ?? ""),
        ),
      ).toEqual([]);
      await page.screenshot({
        path: testInfo.outputPath("workspace-summary.png"),
        fullPage: true,
      });
    } finally {
      if (userId) {
        const agencies = await admin
          .from("agencies")
          .select("id,name,slug")
          .in("slug", slugs);
        if (agencies.error)
          throw new Error("Cannot verify synthetic workspace cleanup.");
        for (const agency of agencies.data ?? []) {
          if (!names.includes(agency.name) || !slugs.includes(agency.slug))
            throw new Error("Refusing non-test workspace cleanup.");
          const objects = await admin.storage
            .from("agency-logos")
            .list(agency.id);
          if (objects.error) throw objects.error;
          if (objects.data.length) {
            const cleanup = await admin.storage
              .from("agency-logos")
              .remove(
                objects.data.map((object) => `${agency.id}/${object.name}`),
              );
            if (cleanup.error) throw cleanup.error;
          }
          const templates = await admin
            .from("workflow_templates")
            .select("id")
            .eq("agency_id", agency.id);
          if (templates.error) throw templates.error;
          const templateIds = (templates.data ?? []).map(
            (template) => template.id,
          );
          if (templateIds.length) {
            const stages = await admin
              .from("workflow_stages")
              .delete()
              .in("workflow_template_id", templateIds);
            if (stages.error) throw stages.error;
          }
          for (const table of [
            "agency_processing_settings",
            "workflow_templates",
            "activity_events",
            "agency_memberships",
          ]) {
            const result = await admin
              .from(table)
              .delete()
              .eq("agency_id", agency.id);
            if (result.error) throw result.error;
          }
          const removed = await admin
            .from("agencies")
            .delete()
            .eq("id", agency.id);
          if (removed.error) throw removed.error;
        }
        if (userId) {
          const removed = await admin.auth.admin.deleteUser(userId);
          if (removed.error) throw removed.error;
        }
      }
    }
  });
});

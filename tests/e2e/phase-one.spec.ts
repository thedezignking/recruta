import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("workspace utilities require authentication", async ({ request }) => {
  const responses = await Promise.all([
    request.get("/api/v1/search?q=designer"),
    request.get("/api/v1/clients/search?q=studio"),
    request.get("/api/v1/notifications"),
    request.get("/api/v1/agency/processing"),
    request.patch("/api/v1/agency/processing", { data: {} }),
    request.get(
      "/api/v1/applications/10000000-0000-4000-8000-000000000001/messages",
    ),
    request.post(
      "/api/v1/applications/10000000-0000-4000-8000-000000000001/messages",
      { data: {} },
    ),
    request.post(
      "/api/v1/applications/10000000-0000-4000-8000-000000000001/screening/corrections",
      { data: {} },
    ),
    request.post("/api/v1/messages/10000000-0000-4000-8000-000000000001/retry"),
    request.post("/api/v1/workspaces/select", {
      data: { agencyId: "10000000-0000-4000-8000-000000000001" },
    }),
    request.get(
      "/api/v1/applications/10000000-0000-4000-8000-000000000001/screening",
    ),
    request.post(
      "/api/v1/applications/10000000-0000-4000-8000-000000000001/screening",
      { data: {} },
    ),
    request.post("/api/v1/companies/lookup", {
      data: { domain: "example.com" },
    }),
    request.patch("/api/v1/account", {
      data: { fullName: "Unauthorized user" },
    }),
  ]);
  for (const response of responses) {
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("AUTHENTICATION_REQUIRED");
  }
});

test("screening worker rejects public requests", async ({ request }) => {
  const response = await request.post("/api/internal/screening");
  expect(response.status()).toBe(401);
  expect((await response.json()).error.code).toBe("WORKER_ACCESS_DENIED");
});

test("email and intake workers reject public requests", async ({ request }) => {
  for (const path of ["/api/internal/messages", "/api/internal/automations"]) {
    const response = await request.post(path);
    expect(response.status()).toBe(401);
    expect((await response.json()).error.code).toBe("WORKER_ACCESS_DENIED");
  }
});

test("uses the abstract fit mark and matching favicon", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  const brand = page.getByRole("img", { name: "Recruta", exact: true });
  await expect(brand).toBeVisible();
  const mark = brand.locator("img");
  await expect(mark).toHaveAttribute("src", "/brand/recruta-symbol.svg");
  await expect(mark).toHaveCSS("width", "28px");
  await expect(mark).toHaveCSS("height", "28px");
  await expect(brand).toHaveText("Recruta");
  const logo = await request.get("/brand/recruta-symbol.svg");
  expect(logo.ok()).toBe(true);
  expect(await logo.text()).toContain('fill="#111111"');
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toHaveCSS("border-radius", "6px");
  const icon = await request.get("/icon.svg");
  expect(icon.ok()).toBe(true);
  expect(await icon.text()).toBe(await logo.text());
  await expect(
    page.locator('link[rel="icon"][type="image/svg+xml"]'),
  ).toHaveAttribute("href", /icon\.svg/);
});

for (const { route, label } of [
  { route: "/login", label: "Password" },
  { route: "/signup", label: "Password" },
  { route: "/update-password", label: "New password" },
]) {
  test(`password visibility is keyboard accessible on ${route}`, async ({
    page,
  }) => {
    await page.goto(route);
    const input = page.getByLabel(label, { exact: true });
    await input.fill("Example-password-123");
    await input.focus();
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("button", { name: "Show password" }),
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveValue("Example-password-123");
    await page.keyboard.press("Enter");
    await expect(input).toHaveAttribute("type", "password");
    await expect(page).toHaveURL(new RegExp(`${route}$`));
  });
}

test("unauthenticated visitors are sent to the real sign-in flow", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("sign-in has no serious accessibility violations", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.filter((violation) =>
      ["critical", "serious"].includes(violation.impact ?? ""),
    ),
  ).toEqual([]);
});

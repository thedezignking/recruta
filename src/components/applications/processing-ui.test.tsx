// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { CandidateMessages } from "./candidate-messages";
import { ScreeningPanel } from "./screening-panel";
import { AttentionQueue } from "./attention-queue";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const props = {
  agencyId: "agency",
  applicationId: "application",
  email: "synthetic@example.invalid",
  replyTo: "agency@example.invalid",
  messages: [],
  available: true,
  suppressed: false,
  status: "in_review",
  timezone: "Africa/Lagos",
};
it("queues the reviewed email with workspace and retry-safe key", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: "message", status: "pending" } }),
  });
  vi.stubGlobal("fetch", fetch);
  render(<CandidateMessages {...props} />);
  fireEvent.click(screen.getByText("Write an email"));
  fireEvent.change(screen.getByLabelText("Subject"), {
    target: { value: "Application update" },
  });
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "A synthetic update." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Queue email" }));
  await screen.findByText("Email queued. Delivery status appears below.");
  expect(fetch).toHaveBeenCalledWith(
    "/api/v1/applications/application/messages",
    expect.objectContaining({
      headers: expect.objectContaining({
        "x-agency-id": "agency",
        "idempotency-key": expect.any(String),
      }),
    }),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    subject: "Application update",
    body: "A synthetic update.",
    kind: "custom",
  });
});
it("does not allow sends when provider or candidate email is disabled", () => {
  render(<CandidateMessages {...props} available={false} />);
  fireEvent.click(screen.getByText("Write an email"));
  expect(
    screen
      .getByRole("button", { name: "Queue email" })
      .hasAttribute("disabled"),
  ).toBe(true);
});
it("keeps manual review available when screening is off", () => {
  render(
    <ScreeningPanel
      agencyId="agency"
      applicationId="app"
      data={{ runs: [], context: {}, corrections: [] }}
      documents={[]}
      enabled={false}
      timezone="Africa/Lagos"
    />,
  );
  expect(screen.getByText(/Manual review remains available/)).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: "Screen résumé" })
      .hasAttribute("disabled"),
  ).toBe(true);
});
it("attention links lead to actual application work without future modules", () => {
  render(
    <AttentionQueue
      items={[
        {
          id: "email:message",
          applicationId: "app",
          label: "Email delivery failed",
          detail: "Synthetic update",
          at: "2026-10-25T10:00:00Z",
        },
      ]}
    />,
  );
  expect(screen.getByRole("link").getAttribute("href")).toBe(
    "/app/applications/app#messages",
  );
});

// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { AttentionBanner } from "./attention-banner";

const item = {
  id: "screening:application-1",
  applicationId: "application-1",
  label: "Application screening failed",
  detail: "Divine Ukanwa · Product Designer",
  at: "2026-10-27T12:00:00Z",
};

afterEach(() => {
  cleanup();
  sessionStorage.clear();
});

it("lets a user dismiss an actionable banner for this workspace session", () => {
  const props = { items: [item], agencyId: "agency-1", userId: "user-1" };
  const view = render(<AttentionBanner {...props} />);
  expect(
    screen.getByText(
      "Divine Ukanwa's application for Product Designer needs review.",
    ),
  ).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "Review screening" }).getAttribute("href"),
  ).toBe("/app/applications/application-1#screening");
  fireEvent.click(
    screen.getByRole("button", {
      name: "Dismiss application screening failed alert",
    }),
  );
  expect(screen.queryByText("Application screening failed")).toBeNull();

  view.unmount();
  render(<AttentionBanner {...props} />);
  expect(screen.queryByText("Application screening failed")).toBeNull();

  cleanup();
  render(<AttentionBanner {...props} agencyId="agency-2" />);
  expect(screen.getByText("Application screening failed")).toBeTruthy();
});

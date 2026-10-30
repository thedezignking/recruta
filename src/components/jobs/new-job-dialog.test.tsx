// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { NewJobDialog } from "./new-job-dialog";
const router = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
const organization = "dd72862a-5791-4f70-882e-e391ff94f21f";
function open(returnTo?: string) {
  render(
    <NewJobDialog
      agencyId="agency"
      clients={[{ id: organization, name: "Saved employer" }]}
      initialClientId={organization}
      currentUserId="87e74942-d83d-4c8c-aa2c-1cdfe3fa56bd"
      workflows={[]}
      recruiters={[]}
      returnTo={returnTo}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: /Create it myself/ }));
}
it("saves directly from Essentials without a description or workplace type", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: "saved-job" } }),
  });
  vi.stubGlobal("fetch", fetch);
  open();
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: "New sales role" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith("/app/jobs/saved-job"),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    title: "New sales role",
    description: "",
    publish: false,
    positionsRequired: 1,
  });
});
it("keeps edits when closing is cancelled and discards only on explicit confirmation", async () => {
  open();
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: "Keep this role" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close new job" }));
  expect(await screen.findByText("Save your job before leaving?")).toBeTruthy();
  expect(router.replace).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(screen.getByLabelText("Job title")).toHaveProperty(
    "value",
    "Keep this role",
  );
  fireEvent.click(screen.getByRole("button", { name: "Close new job" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Discard changes" }),
  );
  expect(router.replace).toHaveBeenCalledWith("/app/jobs");
  await waitFor(() =>
    expect(
      screen.queryByRole("dialog", { name: "Save your job before leaving?" }),
    ).toBeNull(),
  );
  expect(screen.queryByLabelText("Job title")).toBeNull();
});
it("preserves the form and shows an actionable error when saving fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  open();
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: "Unsent role" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
  expect(
    await screen.findByText(
      "We could not reach the server. Check your connection and try again.",
    ),
  ).toBeTruthy();
  expect(screen.getByLabelText("Job title")).toHaveProperty(
    "value",
    "Unsent role",
  );
  expect(router.push).not.toHaveBeenCalled();
});

it("discards from Overview immediately while navigation is still pending and removes the unload warning", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  open("/app");
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: "Unsaved Overview role" },
  });
  const before = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(before);
  expect(before.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Close new job" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Discard changes" }),
  );
  await waitFor(() => expect(screen.queryByLabelText("Job title")).toBeNull());
  expect(screen.queryByRole("dialog")).toBeNull();
  expect(router.replace).toHaveBeenCalledWith("/app");
  expect(fetch).not.toHaveBeenCalled();
  const after = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(after);
  expect(after.defaultPrevented).toBe(false);
});

it("saves the current edits from the close confirmation", async () => {
  const fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { id: "saved-from-close" } }),
  });
  vi.stubGlobal("fetch", fetch);
  open();
  fireEvent.change(screen.getByLabelText("Job title"), {
    target: { value: "Save this role before leaving" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Close new job" }));
  const confirmation = await screen.findByRole("dialog", {
    name: "Save your job before leaving?",
  });
  fireEvent.click(
    within(confirmation).getByRole("button", { name: "Save draft" }),
  );
  await waitFor(() =>
    expect(router.push).toHaveBeenCalledWith("/app/jobs/saved-from-close"),
  );
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({
    title: "Save this role before leaving",
    publish: false,
  });
  expect(router.replace).not.toHaveBeenCalled();
});

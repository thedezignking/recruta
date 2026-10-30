// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ApplicationForm } from "./application-form";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("shows the draft application form without allowing a submission", () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  render(
    <ApplicationForm
      agencySlug="preview"
      jobSlug="draft-job"
      jobTitle="Designer"
      agencyName="Evenkore"
      questions={[]}
      preview
    />,
  );
  expect(screen.getByText(/Preview only/)).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Publish job to accept applications" }),
  ).toHaveProperty("disabled", true);
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Publish job to accept applications" })
      .closest("form")!,
  );
  expect(fetch).not.toHaveBeenCalled();
});

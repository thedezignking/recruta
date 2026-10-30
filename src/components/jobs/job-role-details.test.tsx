// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, it, expect } from "vitest";
import { JobRoleDetails } from "./job-role-details";
afterEach(cleanup);
it("never renders hidden or negotiable salary amounts in public role details", () => {
  for (const salaryVisibility of ["hidden", "negotiable"]) {
    const v = render(
      <JobRoleDetails
        description="A public role"
        positions={1}
        requirements={[]}
        salaryMin={123456}
        currency="NGN"
        salaryVisibility={salaryVisibility}
      />,
    );
    expect(screen.queryByText(/123,456/)).toBeNull();
    if (salaryVisibility === "negotiable")
      expect(screen.getByText("Salary negotiable")).toBeTruthy();
    v.unmount();
  }
});
it("separates arrangement, hours and remote eligibility", () => {
  render(
    <JobRoleDetails
      description="A public role"
      positions={2}
      requirements={[]}
      employmentArrangement="fixed_term"
      workingHours="part_time"
      contractDuration="Six months"
      workArrangement="remote"
      remoteEligibility="restricted"
      remoteDetails="Nigeria; WAT"
    />,
  );
  for (const s of [
    "Fixed-term contract",
    "part-time",
    "Six months",
    "Nigeria; WAT",
  ])
    expect(screen.getByText(s)).toBeTruthy();
});

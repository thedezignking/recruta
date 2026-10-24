import { describe, expect, it } from "vitest";
import { agencyCan, clientCan } from "./permissions";

describe("permission matrix", () => {
  it("keeps approval away from recruiters", () => {
    expect(agencyCan("recruitment_manager", "approve_requests")).toBe(true);
    expect(agencyCan("recruiter", "approve_requests")).toBe(false);
  });

  it("lets recruiters open jobs and organizations", () => {
    expect(agencyCan("recruiter", "create_jobs")).toBe(true);
    expect(agencyCan("recruiter", "manage_clients")).toBe(true);
  });

  it("keeps reviewers read-only", () => {
    expect(clientCan("reviewer", "view_client_jobs")).toBe(true);
    expect(clientCan("reviewer", "create_client_requests")).toBe(false);
    expect(clientCan("reviewer", "manage_client_team")).toBe(false);
  });
});

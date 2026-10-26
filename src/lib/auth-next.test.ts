import { it, expect } from "vitest";
import { safeAuthNext } from "./auth-next";
it("keeps authentication redirects on this application", () => {
  for (const value of [
    "https://evil.invalid",
    "//evil.invalid",
    "/\\evil.invalid",
    "/\n//evil.invalid",
  ])
    expect(safeAuthNext(value)).toBe("/auth/continue");
  expect(safeAuthNext("/invitations/token?kind=client")).toBe(
    "/invitations/token?kind=client",
  );
});

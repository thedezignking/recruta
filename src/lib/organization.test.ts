import { describe, expect, it } from "vitest";
import { clientSchema, manualJobSchema } from "./validation";
import { companyDomain, organizationDetailsSchema } from "./organization";
import { searchPattern, workspaceQuerySchema } from "./workspace-search";

describe("organization entry", () => {
  it("does not require a contact or directory listing", () => {
    expect(clientSchema.safeParse({ name: "Independent Studio" }).success).toBe(
      true,
    );
  });
  it("requires complete contact details when a contact is added", () => {
    expect(
      clientSchema.safeParse({
        name: "Studio",
        primaryContact: { fullName: "Ada" },
      }).success,
    ).toBe(false);
    expect(
      clientSchema.safeParse({
        name: "Studio",
        primaryContact: { fullName: "Ada Okafor", email: "ada@example.com" },
      }).success,
    ).toBe(true);
  });
  it("validates website, country, and logo protocols", () => {
    expect(
      organizationDetailsSchema.safeParse({
        name: "Studio",
        website: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      organizationDetailsSchema.safeParse({ name: "Studio", countryCode: "12" })
        .success,
    ).toBe(false);
    expect(
      organizationDetailsSchema.safeParse({
        name: "Studio",
        companyProfile: { logoUrl: "http://example.com/logo.png" },
      }).success,
    ).toBe(false);
  });
  it("normalizes websites for duplicate suggestions", () => {
    expect(companyDomain("https://www.EXAMPLE.com/about")).toBe("example.com");
    expect(companyDomain(null)).toBe("");
  });
  it("supports reviewed company details in inline job creation", () => {
    const result = manualJobSchema.safeParse({
      title: "Designer",
      description: "A detailed role for our growing design team.",
      positionsRequired: 2,
      workArrangement: "hybrid",
      newOrganization: {
        name: "Studio",
        website: "https://example.com",
        companyProfile: { address: "Lagos", provider: "manual" },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("workspace search input", () => {
  it("bounds queries and neutralizes PostgREST syntax", () => {
    expect(workspaceQuerySchema.safeParse("a").success).toBe(false);
    expect(workspaceQuerySchema.safeParse("a".repeat(101)).success).toBe(false);
    expect(searchPattern("Ada,email.ilike.*(x),_%")).toBe(
      "%Ada email ilike x%",
    );
  });
});

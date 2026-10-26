import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const config = vi.hoisted(() => ({
  apiKey: "test-provider-key",
  persistenceAllowed: true,
}));
vi.mock("@/lib/env", () => ({ getCompanyLookupEnv: () => config }));
import { companyLookupSchema, lookupCompany } from "./company-lookup";
afterEach(() => {
  vi.unstubAllGlobals();
  config.persistenceAllowed = true;
});

describe("company lookup adapter", () => {
  it("rejects arbitrary URLs, private IPs, and contact emails", () => {
    for (const domain of [
      "http://localhost/path",
      "127.0.0.1",
      "person@example.com",
      "example.com/path",
    ])
      expect(companyLookupSchema.safeParse({ domain }).success).toBe(false);
  });
  it("does not contact the provider until storage permission is configured", async () => {
    config.persistenceAllowed = false;
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(
      lookupCompany({ domain: "example.com" }),
    ).rejects.toMatchObject({ status: 503 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("maps only available fields and never invents a street address", async () => {
    const fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "company",
        name: "Example",
        domain: "example.com",
        logos: [
          {
            type: "icon",
            formats: [
              { src: "https://cdn.example.com/logo.svg", format: "svg" },
            ],
          },
        ],
        company: {
          industries: [{ name: "Design" }],
          location: { city: "Lagos", country: "Nigeria", countryCode: "NG" },
        },
      }),
    });
    vi.stubGlobal("fetch", fetch);
    const details = await lookupCompany({ domain: "EXAMPLE.COM" });
    expect(details).toMatchObject({
      name: "Example",
      website: "https://example.com",
      location: "Lagos, Nigeria",
      companyProfile: {
        address: "",
        provider: "brandfetch",
        logoUrl: "https://cdn.example.com/logo.svg",
      },
    });
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.brandfetch.io/v2/brands/domain/example.com",
    );
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe(
      "Bearer test-provider-key",
    );
  });
  it("converts provider failure or malformed data into a manual-entry fallback", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 429 })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ name: "Invalid response" }),
        }),
    );
    await expect(
      lookupCompany({ domain: "example.com" }),
    ).rejects.toMatchObject({ status: 503, code: "COMPANY_LOOKUP_FAILED" });
    await expect(
      lookupCompany({ domain: "example.com" }),
    ).rejects.toMatchObject({ status: 503, code: "COMPANY_LOOKUP_FAILED" });
  });
});

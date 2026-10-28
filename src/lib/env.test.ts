import { afterEach, expect, it, vi } from "vitest";
import { getCompanyLookupEnv } from "./env";
afterEach(() => vi.unstubAllEnvs());
it("accepts the deployed server-side client ID without enabling paid enrichment", () => {
  vi.stubEnv("NEXT_PUBLIC_BRANDFETCH_CLIENT_ID", "");
  vi.stubEnv("BRANDFETCH_CLIENT_ID", " deployed-client-id ");
  vi.stubEnv("BRANDFETCH_API_KEY", "");
  vi.stubEnv("BRANDFETCH_PERSISTENCE_ALLOWED", "false");
  expect(getCompanyLookupEnv()).toMatchObject({
    clientId: "deployed-client-id",
    persistenceAllowed: false,
  });
});
it("prefers the explicit public client ID and never substitutes an API key", () => {
  vi.stubEnv("NEXT_PUBLIC_BRANDFETCH_CLIENT_ID", "public-client-id");
  vi.stubEnv("BRANDFETCH_CLIENT_ID", "server-client-id");
  vi.stubEnv("BRANDFETCH_API_KEY", "secret-provider-key");
  expect(getCompanyLookupEnv().clientId).toBe("public-client-id");
  vi.stubEnv("NEXT_PUBLIC_BRANDFETCH_CLIENT_ID", "");
  vi.stubEnv("BRANDFETCH_CLIENT_ID", "");
  expect(getCompanyLookupEnv().clientId).toBeUndefined();
});

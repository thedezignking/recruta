import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./request-origin";
describe("same-origin workspace requests", () => {
  it("accepts the real host when Next normalizes its internal hostname", () => {
    expect(
      isSameOriginRequest(
        new Request("http://localhost:3001/api", {
          headers: { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001" },
        }),
      ),
    ).toBe(true);
  });
  it.each([
    "https://other.example",
    "http://recruta.example",
    "null",
    "invalid",
  ])("rejects a foreign or invalid origin: %s", (origin) => {
    expect(
      isSameOriginRequest(
        new Request("https://recruta.example/api", {
          headers: { host: "recruta.example", origin },
        }),
      ),
    ).toBe(false);
  });
  it("supports authenticated non-browser requests without Origin", () => {
    expect(
      isSameOriginRequest(new Request("https://recruta.example/api")),
    ).toBe(true);
  });
});

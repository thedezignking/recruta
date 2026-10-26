import { describe, expect, it } from "vitest";
import {
  agencyLogoExtension,
  agencyLogoFileError,
  agencyLogoMaxBytes,
} from "./agency-logo";
describe("agency logos", () => {
  it("rejects executable/vector formats, empty and oversized files", () => {
    expect(
      agencyLogoFileError({ type: "image/svg+xml", size: 100 }),
    ).toBeTruthy();
    expect(agencyLogoFileError({ type: "image/png", size: 0 })).toBeTruthy();
    expect(
      agencyLogoFileError({ type: "image/png", size: agencyLogoMaxBytes + 1 }),
    ).toBeTruthy();
    expect(
      agencyLogoFileError({ type: "image/png", size: agencyLogoMaxBytes }),
    ).toBeNull();
  });
  it("checks raster signatures rather than trusting the supplied MIME type", () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(agencyLogoExtension(png, "image/png")).toBe("png");
    expect(agencyLogoExtension(png, "image/jpeg")).toBeNull();
    expect(
      agencyLogoExtension(new TextEncoder().encode("<svg />"), "image/png"),
    ).toBeNull();
  });
});

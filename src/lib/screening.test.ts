import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  extractionOutputSchema,
  screeningOutputSchema,
  screeningSources,
  validateScreeningEvidence,
  screeningRequestSchema,
} from "./screening";
import {
  screeningFixture,
  screeningOutputFixture,
} from "@/server/screening/fixtures";
import { screeningInput } from "@/server/screening/prompts";

const sources = [
  {
    id: "resume:1",
    label: "Experience",
    text: "Built TypeScript APIs for three years.",
  },
];

describe("screening evidence boundary", () => {
  it("generates strict provider schemas without weakening runtime validation", () => {
    for (const schema of [extractionOutputSchema, screeningOutputSchema]) {
      const format = zodTextFormat(schema, "test");
      expect(format.strict).toBe(true);
      expect(format.schema.additionalProperties).toBe(false);
    }
  });
  it("accepts exact evidence and whitespace normalization", () => {
    expect(
      validateScreeningEvidence(
        screeningOutputFixture,
        screeningFixture,
        sources,
      ),
    ).toEqual(screeningOutputFixture);
    expect(
      validateScreeningEvidence(screeningOutputFixture, screeningFixture, [
        { ...sources[0], text: "Built\nTypeScript  APIs" },
      ]),
    ).toBeTruthy();
  });
  it("rejects invented quotes, unknown source IDs, and unsupported positive verdicts", () => {
    for (const evidence of [
      [{ sourceId: "resume:1", quote: "Managed twenty engineers" }],
      [{ sourceId: "resume:99", quote: "Built TypeScript APIs" }],
      [],
    ]) {
      const result = structuredClone(screeningOutputFixture);
      result.criteria[0].evidence = evidence;
      expect(() =>
        validateScreeningEvidence(result, screeningFixture, sources),
      ).toThrow("invalid_evidence");
    }
  });
  it("requires exactly one result per snapshotted criterion", () => {
    for (const criteria of [
      [],
      [...screeningOutputFixture.criteria, ...screeningOutputFixture.criteria],
      [
        {
          ...screeningOutputFixture.criteria[0],
          requirementId: crypto.randomUUID(),
        },
      ],
    ]) {
      expect(() =>
        validateScreeningEvidence(
          { ...screeningOutputFixture, criteria },
          screeningFixture,
          sources,
        ),
      ).toThrow("invalid_evidence");
    }
  });
  it("keeps not-found separate from contradicted and requires evidence for contradiction", () => {
    const result = structuredClone(screeningOutputFixture);
    result.criteria[0] = {
      ...result.criteria[0],
      verdict: "not_found",
      evidence: [],
    };
    expect(
      validateScreeningEvidence(result, screeningFixture, sources).criteria[0]
        .verdict,
    ).toBe("not_found");
    result.criteria[0].verdict = "contradicted";
    expect(() =>
      validateScreeningEvidence(result, screeningFixture, sources),
    ).toThrow();
  });
  it("rejects output carrying a score, decision, or lifecycle mutation", () => {
    for (const extra of [
      { score: 90 },
      { decision: "reject" },
      { status: "rejected" },
    ]) {
      expect(
        screeningOutputSchema.safeParse({ ...screeningOutputFixture, ...extra })
          .success,
      ).toBe(false);
    }
    expect(
      screeningRequestSchema.safeParse({
        documentId: screeningFixture.document.id,
        storagePath: "other/resume",
      }).success,
    ).toBe(false);
  });
  it("stops unreadable, blank, and oversized extractions before assessment", () => {
    for (const extraction of [
      { readable: false, sections: [], warnings: [] },
      {
        readable: true,
        sections: [{ label: "Empty", text: " " }],
        warnings: [],
      },
    ]) {
      expect(() => screeningSources(extraction, screeningFixture)).toThrow(
        "document_unreadable",
      );
    }
    expect(() =>
      screeningSources(
        {
          readable: true,
          sections: Array.from({ length: 11 }, () => ({
            label: "Section",
            text: "a".repeat(12000),
          })),
          warnings: [],
        },
        screeningFixture,
      ),
    ).toThrow("input_too_large");
  });
  it("binds answer evidence and excludes internal metadata from provider inputs", () => {
    const snapshot = {
      ...screeningFixture,
      answers: [
        {
          id: crypto.randomUUID(),
          question: "Relevant skills?",
          answer: "TypeScript",
        },
      ],
    };
    const result = screeningSources(
      {
        readable: true,
        sections: [{ label: "Experience", text: sources[0].text }],
        warnings: [],
      },
      snapshot,
    );
    expect(result[1].id).toBe(`answer:${snapshot.answers[0].id}`);
    const input = screeningInput(snapshot, result);
    expect(input).not.toContain("storage_path");
    expect(input).not.toContain("synthetic/resume.pdf");
    expect(input).not.toContain("file_name");
  });
});

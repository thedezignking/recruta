import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { createScreeningProvider } from "./openai";
import { screeningFixture, screeningEvalCases } from "./fixtures";
import { screeningSources, validateScreeningEvidence } from "@/lib/screening";

// Explicit opt-in: this suite makes billable calls with synthetic data only.
// It measures screening verdicts, not PDF/DOCX extraction accuracy.
describe.skipIf(process.env.RECRUTA_RUN_AI_EVAL !== "1")(
  "live screening evaluation",
  () => {
    for (const fixture of screeningEvalCases) {
      it(
        fixture.id,
        async () => {
          loadEnvConfig(process.cwd());
          const key = process.env.OPENAI_API_KEY;
          const model = process.env.OPENAI_SCREENING_MODEL;
          if (!key || !model)
            throw new Error(
              "Configure OPENAI_API_KEY and OPENAI_SCREENING_MODEL before evaluating.",
            );
          const snapshot = {
            ...screeningFixture,
            requirements: [
              { ...screeningFixture.requirements[0], label: fixture.label },
            ],
          };
          const sources = [
            {
              id: "resume:1",
              label: "Synthetic work history",
              text: fixture.text,
            },
          ];
          const result = await createScreeningProvider(key, model).assess(
            snapshot,
            sources,
            crypto.randomUUID(),
          );
          const validated = validateScreeningEvidence(
            result.output,
            snapshot,
            sources,
          );
          expect(validated.criteria[0].verdict).toBe(fixture.verdict);
        },
        120000,
      );
    }
    for (const extension of ["pdf", "docx"] as const) {
      it(`extracts and screens a synthetic ${extension.toUpperCase()} resume`, async () => {
        const key = process.env.OPENAI_API_KEY;
        const model = process.env.OPENAI_SCREENING_MODEL;
        if (!key || !model)
          throw new Error("Configure the screening key and model.");
        const file = await readFile(
          `tests/fixtures/screening/synthetic-resume.${extension}`,
        );
        const snapshot = {
          ...screeningFixture,
          document: {
            ...screeningFixture.document,
            file_name: `synthetic-resume.${extension}`,
            content_type:
              extension === "pdf"
                ? ("application/pdf" as const)
                : ("application/vnd.openxmlformats-officedocument.wordprocessingml.document" as const),
            size_bytes: file.length,
          },
        };
        const provider = createScreeningProvider(key, model);
        const extraction = await provider.extract(
          file,
          snapshot.document,
          crypto.randomUUID(),
        );
        expect(extraction.output.readable).toBe(true);
        const text = extraction.output.sections
          .map((section) => section.text)
          .join("\n");
        for (const expected of [
          "Built TypeScript APIs",
          "PostgreSQL",
          "2020",
          "2024",
          "Example University",
        ])
          expect(text).toContain(expected);
        const assessment = await provider.assess(
          snapshot,
          screeningSources(extraction.output, snapshot),
          crypto.randomUUID(),
        );
        const validated = validateScreeningEvidence(
          assessment.output,
          snapshot,
          screeningSources(extraction.output, snapshot),
        );
        expect(validated.criteria[0].verdict).toBe("supported");
        console.info(
          JSON.stringify({
            fixture: extension,
            model: assessment.model,
            inputTokens: extraction.inputTokens + assessment.inputTokens,
            outputTokens: extraction.outputTokens + assessment.outputTokens,
          }),
        );
      }, 240000);
    }
  },
);

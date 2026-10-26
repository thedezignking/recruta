import { z } from "zod";

export const screeningVersion = "screening-v1";
export const extractionVersion = "extraction-v1";
export const screeningRequestSchema = z.strictObject({ documentId: z.uuid() });

const excerptSchema = z.strictObject({
  sourceId: z.string().min(1).max(100),
  quote: z.string().trim().min(1).max(1200),
});

// Keep the provider schema separate from semantic checks so it can also be
// exported as strict JSON Schema for OpenAI Structured Outputs.
export const extractionOutputSchema = z.strictObject({
  readable: z.boolean(),
  sections: z
    .array(
      z.strictObject({
        label: z.string().max(100),
        text: z.string().max(12000),
      }),
    )
    .max(40),
  warnings: z.array(z.string().min(1).max(300)).max(10),
});

export const screeningOutputSchema = z.strictObject({
  summary: z.string().trim().min(1).max(1800),
  facts: z
    .array(
      z.strictObject({
        kind: z.enum(["skill", "experience", "qualification"]),
        statement: z.string().trim().min(1).max(500),
        evidence: z.array(excerptSchema).min(1).max(3),
      }),
    )
    .max(30),
  criteria: z
    .array(
      z.strictObject({
        requirementId: z.uuid(),
        verdict: z.enum(["supported", "not_found", "contradicted", "unclear"]),
        explanation: z.string().trim().min(1).max(700),
        evidence: z.array(excerptSchema).max(3),
        followUp: z.string().trim().min(1).max(500).nullable(),
      }),
    )
    .max(100),
  warnings: z.array(z.string().trim().min(1).max(300)).max(10),
});

export const screeningSnapshotSchema = z.strictObject({
  job: z.strictObject({
    id: z.uuid(),
    title: z.string().max(300),
    description: z.string().max(50000).nullable(),
  }),
  requirements: z
    .array(
      z.strictObject({
        id: z.uuid(),
        label: z.string().max(1000),
        description: z.string().max(5000).nullable(),
        requirement_type: z.enum(["required", "preferred"]),
        version: z.number().int().positive(),
      }),
    )
    .max(100),
  document: z.strictObject({
    id: z.uuid(),
    storage_path: z.string().max(1000),
    file_name: z.string().max(255),
    content_type: z.enum([
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]),
    size_bytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
  }),
  answers: z
    .array(
      z.strictObject({
        id: z.uuid(),
        question: z.string().max(5000),
        answer: z.unknown(),
      }),
    )
    .max(100),
});

export type ScreeningSnapshot = z.infer<typeof screeningSnapshotSchema>;
export type ExtractionOutput = z.infer<typeof extractionOutputSchema>;
export type ScreeningOutput = z.infer<typeof screeningOutputSchema>;
export type ScreeningSource = { id: string; label: string; text: string };

export const screeningReviewSchema = z.object({
  runs: z.array(
    z.object({
      id: z.uuid(),
      document_id: z.uuid(),
      status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
      model: z.string(),
      prompt_version: z.string(),
      extractor_version: z.string(),
      attempts: z.number(),
      failure_code: z.string().nullable(),
      created_at: z.string(),
      extraction: extractionOutputSchema.nullable(),
      assessment: screeningOutputSchema.nullable(),
    }),
  ),
  context: z.record(
    z.string(),
    z.object({
      requirements: screeningSnapshotSchema.shape.requirements,
      answers: screeningSnapshotSchema.shape.answers,
    }),
  ),
  corrections: z.array(
    z.object({
      id: z.uuid(),
      run_id: z.uuid(),
      requirement_id: z.uuid(),
      verdict: z.enum(["supported", "not_found", "contradicted", "unclear"]),
      explanation: z.string(),
      author_user_id: z.string().nullable(),
      created_at: z.string(),
    }),
  ),
});
export type ScreeningReviewData = z.infer<typeof screeningReviewSchema>;

export function screeningSources(
  extraction: ExtractionOutput,
  snapshot: ScreeningSnapshot,
): ScreeningSource[] {
  extractionOutputSchema.parse(extraction);
  if (
    !extraction.readable ||
    !extraction.sections.some((section) => section.text.trim())
  ) {
    throw new ScreeningError("document_unreadable", false);
  }
  const sources = extraction.sections.map((section, index) => ({
    id: `resume:${index + 1}`,
    label: section.label,
    text: section.text,
  }));
  sources.push(
    ...snapshot.answers.map((answer) => ({
      id: `answer:${answer.id}`,
      label: answer.question,
      text:
        typeof answer.answer === "string"
          ? answer.answer
          : (JSON.stringify(answer.answer) ?? ""),
    })),
  );
  if (sources.reduce((size, source) => size + source.text.length, 0) > 120000) {
    throw new ScreeningError("input_too_large", false);
  }
  return sources;
}

const normalizeQuote = (value: string) =>
  value.normalize("NFKC").replace(/\s+/g, " ").trim();

export function validateScreeningEvidence(
  output: unknown,
  snapshot: ScreeningSnapshot,
  sources: ScreeningSource[],
) {
  const result = screeningOutputSchema.parse(output);
  const sourceMap = new Map(
    sources.map((source) => [source.id, normalizeQuote(source.text)]),
  );
  const expected = new Set(
    snapshot.requirements.map((requirement) => requirement.id),
  );
  const seen = new Set<string>();
  for (const criterion of result.criteria) {
    if (
      !expected.has(criterion.requirementId) ||
      seen.has(criterion.requirementId)
    ) {
      throw new ScreeningError("invalid_evidence", false);
    }
    seen.add(criterion.requirementId);
    if (
      (criterion.verdict === "supported" ||
        criterion.verdict === "contradicted") &&
      !criterion.evidence.length
    ) {
      throw new ScreeningError("invalid_evidence", false);
    }
    if (criterion.verdict === "not_found" && criterion.evidence.length) {
      throw new ScreeningError("invalid_evidence", false);
    }
  }
  if (seen.size !== expected.size)
    throw new ScreeningError("invalid_evidence", false);
  for (const item of [...result.facts, ...result.criteria]) {
    for (const evidence of item.evidence) {
      if (
        !sourceMap
          .get(evidence.sourceId)
          ?.includes(normalizeQuote(evidence.quote))
      ) {
        throw new ScreeningError("invalid_evidence", false);
      }
    }
  }
  return result;
}

// Never persist raw provider errors: they can contain candidate data or secrets.
export class ScreeningError extends Error {
  constructor(
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(code);
    this.name = "ScreeningError";
  }
}

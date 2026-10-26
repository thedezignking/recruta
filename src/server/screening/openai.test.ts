import { beforeEach, describe, expect, it, vi } from "vitest";
const { parse, constructor } = vi.hoisted(() => ({
  parse: vi.fn(),
  constructor: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("openai", () => ({
  default: class {
    static APIError = class extends Error {
      status = 429;
    };
    responses = { parse };
    constructor(options: unknown) {
      constructor(options);
    }
  },
}));
import { createScreeningProvider } from "./openai";
import { screeningFixture, screeningOutputFixture } from "./fixtures";

beforeEach(() => {
  vi.clearAllMocks();
  parse.mockResolvedValue({
    status: "completed",
    id: "response-id",
    model: "model-snapshot",
    usage: { input_tokens: 10, output_tokens: 20 },
    output_parsed: screeningOutputFixture,
  });
});

describe("OpenAI screening adapter", () => {
  it("uses strict outputs, no tools, no response storage, bounded time, and queue-owned retries", async () => {
    const result = await createScreeningProvider(
      "synthetic-key",
      "evaluated-model",
    ).assess(screeningFixture, [], "operation-id");
    expect(constructor).toHaveBeenCalledWith({
      apiKey: "synthetic-key",
      timeout: 90000,
      maxRetries: 0,
    });
    expect(parse.mock.calls[0][0]).toMatchObject({
      store: false,
      model: "evaluated-model",
      text: { format: { strict: true } },
    });
    expect(parse.mock.calls[0][0]).not.toHaveProperty("tools");
    expect(parse.mock.calls[0][1].headers["X-Client-Request-Id"]).toBe(
      "operation-id",
    );
    expect(result).toMatchObject({
      model: "model-snapshot",
      inputTokens: 10,
      outputTokens: 20,
    });
  });
  it("sends supported files inline with a generic filename, never a signed URL or internal path", async () => {
    parse.mockResolvedValue({
      status: "completed",
      id: "response",
      model: "model",
      output_parsed: { readable: true, sections: [], warnings: [] },
    });
    await createScreeningProvider("key", "model").extract(
      Buffer.from("%PDF-1.7"),
      screeningFixture.document,
      "operation",
    );
    const file = parse.mock.calls[0][0].input[0].content[0];
    expect(file).toMatchObject({ type: "input_file", filename: "resume.pdf" });
    expect(file.file_data).toMatch(/^data:application\/pdf;base64,/);
    expect(file).not.toHaveProperty("file_url");
    expect(JSON.stringify(parse.mock.calls[0][0])).not.toContain(
      "synthetic/resume.pdf",
    );
  });
  it("rejects mismatched document bytes before provider calls", async () => {
    await expect(
      createScreeningProvider("key", "model").extract(
        Buffer.from("not pdf!"),
        screeningFixture.document,
        "operation",
      ),
    ).rejects.toMatchObject({ code: "invalid_document", retryable: false });
    expect(parse).not.toHaveBeenCalled();
  });
  it("stops refused and incomplete output rather than salvaging partial JSON", async () => {
    for (const response of [
      { status: "completed", output_parsed: null },
      { status: "incomplete", output_parsed: screeningOutputFixture },
    ]) {
      parse.mockResolvedValue(response);
      await expect(
        createScreeningProvider("key", "model").assess(
          screeningFixture,
          [],
          "operation",
        ),
      ).rejects.toMatchObject({ code: "provider_incomplete_or_refused" });
    }
  });
  it("never propagates raw provider exceptions", async () => {
    parse.mockRejectedValue(
      new Error("Candidate PII and sk-secret should never be persisted"),
    );
    await expect(
      createScreeningProvider("key", "model").assess(
        screeningFixture,
        [],
        "operation",
      ),
    ).rejects.toMatchObject({
      message: "invalid_provider_output",
      retryable: false,
    });
  });
});

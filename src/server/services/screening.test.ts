import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("./applications", () => ({
  getApplication: vi.fn().mockResolvedValue({ id: "application" }),
}));
vi.mock("./processing-settings", () => ({
  getProcessingSettings: vi.fn().mockResolvedValue({ screeningEnabled: true }),
}));
import {
  processNextScreeningRun,
  requireScreeningConfiguration,
  requestScreening,
} from "./screening";
import { ScreeningError } from "@/lib/screening";
import {
  screeningFixture,
  screeningOutputFixture,
} from "@/server/screening/fixtures";
import { getApplication } from "./applications";

function fixture() {
  const run = {
    id: crypto.randomUUID(),
    agency_id: crypto.randomUUID(),
    application_id: crypto.randomUUID(),
    document_id: screeningFixture.document.id,
    model: "evaluated-model",
    prompt_version: "screening-v1",
    extractor_version: "extraction-v1",
    attempts: 1,
    lease_token: crypto.randomUUID(),
    input_snapshot: screeningFixture,
  };
  const rpc = vi
    .fn()
    .mockResolvedValueOnce({ data: [run], error: null })
    .mockResolvedValue({ data: true, error: null });
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi
      .fn()
      .mockResolvedValue({ data: screeningFixture.document, error: null }),
  };
  const download = vi
    .fn()
    .mockResolvedValue({ data: new Blob(["%PDF-1.7"]), error: null });
  const admin = {
    rpc,
    from: vi.fn().mockReturnValue(query),
    storage: { from: vi.fn().mockReturnValue({ download }) },
  } as unknown as SupabaseClient;
  const metadata = {
    responseId: "response",
    model: "evaluated-model",
    inputTokens: 10,
    outputTokens: 20,
  };
  const extract = vi.fn().mockResolvedValue({
    ...metadata,
    output: {
      readable: true,
      sections: [{ label: "Experience", text: "Built TypeScript APIs" }],
      warnings: [],
    },
  });
  const assess = vi
    .fn()
    .mockResolvedValue({ ...metadata, output: screeningOutputFixture });
  return {
    run,
    rpc,
    query,
    download,
    admin,
    extract,
    assess,
    factory: vi.fn().mockReturnValue({ extract, assess }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RECRUTA_AI_ENABLED", "true");
  vi.stubEnv("RECRUTA_AI_DATA_USE_APPROVED", "true");
  vi.stubEnv("OPENAI_API_KEY", "synthetic-unit-test-key");
  vi.stubEnv("OPENAI_SCREENING_MODEL", "evaluated-model");
  vi.stubEnv("SCREENING_WORKER_SECRET", "x".repeat(40));
});

describe("screening processing", () => {
  it("is disabled without explicit activation, privacy acknowledgement, model, and worker configuration", () => {
    for (const variable of [
      "RECRUTA_AI_ENABLED",
      "RECRUTA_AI_DATA_USE_APPROVED",
      "OPENAI_API_KEY",
      "OPENAI_SCREENING_MODEL",
      "SCREENING_WORKER_SECRET",
    ]) {
      const previous = process.env[variable];
      vi.stubEnv(variable, "");
      expect(() => requireScreeningConfiguration()).toThrow(
        "AI screening is not enabled",
      );
      vi.stubEnv(variable, previous);
    }
  });
  it("does not call a provider when no work is due", async () => {
    const f = fixture();
    f.rpc.mockReset().mockResolvedValue({ data: [], error: null });
    expect(await processNextScreeningRun(f.admin, f.factory)).toEqual({
      processed: false,
    });
    expect(f.factory).not.toHaveBeenCalled();
  });
  it("processes a claimed document and commits evidence against its lease", async () => {
    const f = fixture();
    expect(await processNextScreeningRun(f.admin, f.factory)).toMatchObject({
      processed: true,
      committed: true,
      failed: false,
    });
    const [, parameters] = f.rpc.mock.calls.find(
      (call) => call[0] === "finish_screening_run",
    )!;
    expect(parameters.p_lease).toBe(f.run.lease_token);
    expect(parameters.p_result.assessment).toEqual(screeningOutputFixture);
    expect(parameters.p_result.provider.inputTokens).toBe(20);
    expect(f.query.eq).toHaveBeenCalledWith("agency_id", f.run.agency_id);
    expect(f.query.eq).toHaveBeenCalledWith(
      "application_id",
      f.run.application_id,
    );
  });
  it("does not transmit a changed document or mismatched model configuration", async () => {
    const f = fixture();
    f.run.model = "not-allowed-model";
    expect(await processNextScreeningRun(f.admin, f.factory)).toMatchObject({
      failed: true,
    });
    expect(f.download).not.toHaveBeenCalled();
    expect(f.factory).not.toHaveBeenCalled();
    const g = fixture();
    g.query.single.mockResolvedValue({
      data: {
        ...screeningFixture.document,
        storage_path: "another-tenant/file",
      },
      error: null,
    });
    await processNextScreeningRun(g.admin, g.factory);
    expect(g.factory).not.toHaveBeenCalled();
    expect(g.download).not.toHaveBeenCalled();
  });
  it("persists sanitized transient errors with retry permission, never raw provider errors", async () => {
    const f = fixture();
    f.extract.mockRejectedValue(
      new ScreeningError("provider_unavailable", true),
    );
    await processNextScreeningRun(f.admin, f.factory);
    expect(
      f.rpc.mock.calls.find((call) => call[0] === "finish_screening_run")![1],
    ).toMatchObject({
      p_result: null,
      p_failure_code: "provider_unavailable",
      p_retryable: true,
    });
    expect(f.assess).not.toHaveBeenCalled();
  });
  it("rejects fabricated evidence and does not commit unvalidated model data", async () => {
    const f = fixture();
    f.assess.mockResolvedValue({
      output: { ...screeningOutputFixture, criteria: [] },
    });
    await processNextScreeningRun(f.admin, f.factory);
    expect(
      f.rpc.mock.calls.find((call) => call[0] === "finish_screening_run")![1],
    ).toMatchObject({
      p_result: null,
      p_failure_code: "invalid_evidence",
      p_retryable: false,
    });
  });
  it("reports a lost lease without claiming the output was saved", async () => {
    const f = fixture();
    f.rpc
      .mockReset()
      .mockResolvedValueOnce({ data: [f.run], error: null })
      .mockResolvedValue({ data: false, error: null });
    expect(await processNextScreeningRun(f.admin, f.factory)).toMatchObject({
      committed: false,
    });
  });
  it("validates the key and checks access before checking provider configuration", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { id: "run", status: "queued" },
      error: null,
    });
    const client = { rpc } as unknown as SupabaseClient;
    await expect(
      requestScreening(
        client,
        "agency",
        "application",
        { documentId: screeningFixture.document.id },
        null,
        "request",
      ),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
    vi.stubEnv("RECRUTA_AI_ENABLED", "false");
    await expect(
      requestScreening(
        client,
        "agency",
        "application",
        { documentId: screeningFixture.document.id },
        crypto.randomUUID(),
        "request",
      ),
    ).rejects.toMatchObject({ status: 503 });
    expect(getApplication).toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });
});

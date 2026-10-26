import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { getScreeningEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  screeningRequestSchema,
  screeningSnapshotSchema,
  screeningSources,
  validateScreeningEvidence,
  ScreeningError,
  screeningVersion,
  extractionVersion,
  extractionOutputSchema,
  screeningReviewSchema,
} from "@/lib/screening";
import { getApplication } from "./applications";
import { createScreeningProvider } from "@/server/screening/openai";
import { getProcessingSettings } from "./processing-settings";
import { screeningCorrectionSchema } from "@/lib/applicant-processing";

export function requireScreeningConfiguration() {
  const config = getScreeningEnv();
  if (
    !config.enabled ||
    !config.dataUseApproved ||
    !config.apiKey ||
    !config.model ||
    !config.workerSecret
  ) {
    throw new ApiError(
      503,
      "SCREENING_NOT_CONFIGURED",
      "AI screening is not enabled. Manual review remains available.",
    );
  }
  return {
    ...config,
    apiKey: config.apiKey,
    model: config.model,
    workerSecret: config.workerSecret,
  };
}

export async function requestScreening(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
  input: unknown,
  key: string | null,
  requestId: string,
) {
  const payload = screeningRequestSchema.parse(input);
  const idempotencyKey = z.uuid().parse(key);
  // Verify scoped access before checking provider configuration.
  await getApplication(supabase, agencyId, applicationId);
  const config = requireScreeningConfiguration();
  const settings = await getProcessingSettings(supabase, agencyId);
  if (!settings.screeningEnabled)
    throw new ApiError(
      409,
      "AGENCY_SCREENING_DISABLED",
      "An owner or administrator must enable AI screening for this workspace.",
    );
  const { data, error } = await supabase.rpc("request_application_screening", {
    p_agency_id: agencyId,
    p_application_id: applicationId,
    p_document_id: payload.documentId,
    p_key: idempotencyKey,
    p_model: config.model,
    p_request_id: requestId.slice(0, 200),
  });
  if (error) {
    const mappings: Record<string, [number, string]> = {
      application_not_found: [404, "Application not found."],
      document_not_found: [
        404,
        "Choose a résumé attached to this application.",
      ],
      screening_not_eligible: [
        409,
        "Screening is unavailable for a completed application.",
      ],
      idempotency_conflict: [
        409,
        "Use a new request key for a different document.",
      ],
      screening_already_running: [
        409,
        "Another résumé is already being processed.",
      ],
      screening_rate_limited: [
        429,
        "Screening limit reached. Try again later.",
      ],
      screening_input_too_large: [
        422,
        "This application's screening material exceeds the processing limit.",
      ],
    };
    const match = mappings[error.message];
    throw new ApiError(
      match?.[0] ?? 500,
      match ? error.message.toUpperCase() : "SCREENING_REQUEST_FAILED",
      match?.[1] ?? "Screening could not be queued.",
    );
  }
  return data;
}

export async function getScreeningRuns(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
) {
  await getApplication(supabase, agencyId, applicationId);
  const { data, error } = await supabase
    .from("screening_runs")
    .select(
      "id,document_id,model,prompt_version,extractor_version,status,attempts,available_at,extraction,assessment,failure_code,created_at,started_at,finished_at",
    )
    .eq("agency_id", agencyId)
    .eq("application_id", applicationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(20);
  if (error)
    throw new ApiError(
      500,
      "SCREENING_READ_FAILED",
      "Screening history could not be loaded.",
    );
  const [context, corrections] = await Promise.all([
    supabase.rpc("screening_evidence_context", {
      p_agency_id: agencyId,
      p_application_id: applicationId,
    }),
    supabase
      .from("screening_corrections")
      .select(
        "id,run_id,requirement_id,verdict,explanation,author_user_id,created_at",
      )
      .eq("agency_id", agencyId)
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(200),
  ]);
  if (context.error || corrections.error)
    throw new ApiError(
      503,
      "SCREENING_READ_FAILED",
      "Screening evidence could not be loaded.",
    );
  return screeningReviewSchema.parse({
    runs: data ?? [],
    context: context.data ?? {},
    corrections: corrections.data ?? [],
  });
}

export async function correctScreening(
  db: SupabaseClient,
  agencyId: string,
  applicationId: string,
  input: unknown,
  id: string,
) {
  const payload = screeningCorrectionSchema.parse(input);
  await getApplication(db, agencyId, applicationId);
  const { error } = await db.rpc("correct_screening", {
    p_agency_id: agencyId,
    p_application_id: applicationId,
    p_payload: payload,
    p_request_id: id,
  });
  if (error)
    throw new ApiError(
      409,
      "CORRECTION_FAILED",
      "The correction could not be saved. Refresh and try again.",
    );
  return { id: payload.id };
}

// One bounded unit of work per invocation; a scheduler/worker must call this.
// No fire-and-forget work is attached to the application submission request.
export async function processNextScreeningRun(
  admin: SupabaseClient = createAdminClient(),
  providerFactory = createScreeningProvider,
) {
  const config = requireScreeningConfiguration();
  const { data, error } = await admin.rpc("claim_screening_run");
  if (error)
    throw new ApiError(
      500,
      "SCREENING_CLAIM_FAILED",
      "Screening work could not be claimed.",
    );
  const run = data?.[0];
  if (!run) return { processed: false };
  let result = null;
  let failure: ScreeningError | null = null;
  try {
    if (
      run.model !== config.model ||
      ![screeningVersion, "screening-v1"].includes(run.prompt_version) ||
      run.extractor_version !== extractionVersion
    ) {
      throw new ScreeningError("configuration_changed", false);
    }
    const snapshot = screeningSnapshotSchema.parse(run.input_snapshot);
    const settings = await getProcessingSettings(admin, run.agency_id);
    if (!settings.screeningEnabled)
      throw new ScreeningError("agency_screening_disabled", false);
    // Match the snapshotted document against live tenant/application metadata.
    // Never trust a URL or arbitrary storage path from a provider/request body.
    const { data: document, error: docError } = await admin
      .from("candidate_documents")
      .select("storage_path,content_type,size_bytes")
      .eq("id", run.document_id)
      .eq("agency_id", run.agency_id)
      .eq("application_id", run.application_id)
      .single();
    if (
      docError ||
      !document ||
      document.storage_path !== snapshot.document.storage_path ||
      document.content_type !== snapshot.document.content_type ||
      document.size_bytes !== snapshot.document.size_bytes
    ) {
      throw new ScreeningError("document_changed_or_missing", false);
    }
    const cached = extractionOutputSchema.safeParse(run.extraction);
    const { data: file, error: downloadError } = cached.success
      ? { data: null, error: null }
      : await admin.storage
          .from("candidate-documents")
          .download(document.storage_path);
    if (!cached.success && (downloadError || !file))
      throw new ScreeningError("document_download_failed", true);
    if (file && file.size > 10 * 1024 * 1024)
      throw new ScreeningError("invalid_document", false);
    const provider = providerFactory(
      config.apiKey,
      run.model,
      run.prompt_version,
    );
    const extraction = cached.success
      ? {
          output: cached.data,
          responseId: "retained-checkpoint",
          model: run.model,
          inputTokens: 0,
          outputTokens: 0,
        }
      : await provider.extract(
          Buffer.from(await file!.arrayBuffer()),
          snapshot.document,
          `${run.id}-extract-${run.attempts}`,
        );
    if (!cached.success) {
      const checkpoint = await admin.rpc("checkpoint_screening_extraction", {
        p_id: run.id,
        p_lease: run.lease_token,
        p_extraction: extraction.output,
        p_metadata: {
          extractionResponseId: extraction.responseId,
          extractionModel: extraction.model,
          inputTokens: extraction.inputTokens,
          outputTokens: extraction.outputTokens,
        },
      });
      if (checkpoint.error) throw new ScreeningError("checkpoint_failed", true);
      if (!checkpoint.data)
        return {
          processed: true,
          runId: run.id,
          committed: false,
          failed: false,
        };
    }
    const sources = screeningSources(extraction.output, snapshot);
    const assessment = await provider.assess(
      snapshot,
      sources,
      `${run.id}-assess-${run.attempts}`,
    );
    const validated = validateScreeningEvidence(
      assessment.output,
      snapshot,
      sources,
    );
    result = {
      extraction: extraction.output,
      assessment: validated,
      provider: {
        name: "openai",
        extractionResponseId: extraction.responseId,
        assessmentResponseId: assessment.responseId,
        extractionModel: extraction.model,
        assessmentModel: assessment.model,
        inputTokens: extraction.inputTokens + assessment.inputTokens,
        outputTokens: extraction.outputTokens + assessment.outputTokens,
      },
    };
  } catch (error) {
    failure =
      error instanceof ScreeningError
        ? error
        : new ScreeningError("processing_failed", false);
  }
  const { data: committed, error: finishError } = await admin.rpc(
    "finish_screening_run",
    {
      p_id: run.id,
      p_lease: run.lease_token,
      p_result: result,
      p_failure_code: failure?.code ?? null,
      p_retryable: failure?.retryable ?? false,
    },
  );
  if (finishError)
    throw new ApiError(
      500,
      "SCREENING_SAVE_FAILED",
      "Screening work could not be saved; its lease will recover.",
    );
  return {
    processed: true,
    runId: run.id,
    committed: Boolean(committed),
    failed: Boolean(failure),
  };
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import {
  defaultProcessingSettings,
  processingSettingsSchema,
} from "@/lib/applicant-processing";
import { getScreeningEnv, getDeliveryEnv } from "@/lib/env";

export function processingAvailability() {
  const ai = getScreeningEnv();
  const mail = getDeliveryEnv();
  return {
    screening: !!(
      ai.enabled &&
      ai.dataUseApproved &&
      ai.apiKey &&
      ai.model &&
      ai.workerSecret
    ),
    email: !!(mail.enabled && mail.apiKey && mail.from && mail.workerSecret),
    automations: mail.automationsEnabled,
  };
}
export async function getProcessingSettings(
  db: SupabaseClient,
  agencyId: string,
) {
  const { data, error } = await db
    .from("agency_processing_settings")
    .select(
      "screening_enabled,automatic_screening,acknowledge_applications,review_reminder_hours",
    )
    .eq("agency_id", agencyId)
    .maybeSingle();
  if (error)
    throw new ApiError(
      503,
      "PROCESSING_SETTINGS_FAILED",
      "Processing settings could not be loaded.",
    );
  return data
    ? {
        screeningEnabled: data.screening_enabled,
        automaticScreening: data.automatic_screening,
        acknowledgeApplications: data.acknowledge_applications,
        reviewReminderHours: data.review_reminder_hours,
      }
    : defaultProcessingSettings;
}
export async function saveProcessingSettings(
  db: SupabaseClient,
  agencyId: string,
  input: unknown,
  requestId: string,
) {
  const payload = processingSettingsSchema.parse(input);
  if (payload.screeningEnabled && !processingAvailability().screening)
    throw new ApiError(
      409,
      "SCREENING_NOT_CONFIGURED",
      "Your operator must configure and evaluate AI screening before it can be enabled.",
    );
  const { error } = await db.rpc("save_processing_settings", {
    p_agency_id: agencyId,
    p_settings: payload,
    p_request_id: requestId,
  });
  if (error)
    throw new ApiError(
      400,
      "PROCESSING_SAVE_FAILED",
      "Processing settings could not be saved.",
    );
  return payload;
}

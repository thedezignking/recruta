import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { getDeliveryEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProcessingSettings } from "./processing-settings";
import { requireScreeningConfiguration } from "./screening";

export async function processNextApplicationIntake(
  admin: SupabaseClient = createAdminClient(),
) {
  if (!getDeliveryEnv().automationsEnabled)
    throw new ApiError(
      503,
      "AUTOMATIONS_DISABLED",
      "Intake automations are not enabled.",
    );
  const { data, error } = await admin.rpc("claim_application_intake");
  if (error)
    throw new ApiError(
      503,
      "INTAKE_CLAIM_FAILED",
      "Intake work could not be claimed.",
    );
  const task = data?.[0];
  if (!task) return { processed: false };
  try {
    const settings = await getProcessingSettings(admin, task.agency_id);
    let model: string | null = null;
    if (settings.screeningEnabled && settings.automaticScreening) {
      try {
        model = requireScreeningConfiguration().model;
      } catch {
        // Receipt preparation still runs when AI is disabled or unconfigured.
      }
    }
    const prepared = await admin.rpc("prepare_application_intake", {
      p_id: task.id,
      p_lease: task.lease_token,
      p_model: model,
    });
    if (prepared.error) throw new Error("intake_prepare_failed");
    return {
      processed: true,
      id: task.id,
      failed: prepared.data?.failed === true,
      result: prepared.data,
    };
  } catch {
    const failed = await admin.rpc("fail_application_intake", {
      p_id: task.id,
      p_lease: task.lease_token,
    });
    if (failed.error)
      throw new ApiError(
        503,
        "INTAKE_SAVE_FAILED",
        "Intake state could not be saved; its lease will recover.",
      );
    return { processed: true, id: task.id, failed: true };
  }
}

export async function getAttentionQueue(db: SupabaseClient, agencyId: string) {
  const settings = await getProcessingSettings(db, agencyId);
  const cutoff = new Date(
    Date.now() - settings.reviewReminderHours * 3600000,
  ).toISOString();
  const outcomeCutoff = new Date(Date.now() - 24 * 3600000).toISOString();
  const offerCutoff = new Date(Date.now() + 2 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [applications, processing, messages, intake, interviews, offers] =
    await Promise.all([
      db
        .from("applications")
        .select("id,submitted_at,candidates(full_name),jobs(title)")
        .eq("agency_id", agencyId)
        .eq("status", "received")
        .lt("submitted_at", cutoff)
        .order("submitted_at")
        .order("id")
        .limit(20),
      db
        .from("applications")
        .select("id,submitted_at,candidates(full_name),jobs(title)")
        .eq("agency_id", agencyId)
        .eq("processing_status", "failed")
        .not("status", "in", "(placed,rejected,withdrawn)")
        .order("submitted_at")
        .order("id")
        .limit(20),
      db
        .from("communications")
        .select(
          "id,application_id,related_entity_id,subject,status,created_at,failure_code",
        )
        .eq("agency_id", agencyId)
        .eq("related_entity_type", "application")
        .in("status", ["failed", "permanent_failure"])
        .order("created_at")
        .order("id")
        .limit(20),
      db
        .from("application_intake_tasks")
        .select("id,application_id,status,created_at")
        .eq("agency_id", agencyId)
        .eq("status", "failed")
        .order("created_at")
        .order("id")
        .limit(20),
      // Interviews that ended a day ago without an outcome.
      db
        .from("interviews")
        .select(
          "id,application_id,title,ends_at,applications(candidates(full_name),jobs(title))",
        )
        .eq("agency_id", agencyId)
        .eq("status", "scheduled")
        .lt("ends_at", outcomeCutoff)
        .order("ends_at")
        .order("id")
        .limit(20),
      // Extended offers due for a response within two days, or overdue.
      db
        .from("offers")
        .select(
          "id,application_id,expires_at,applications(candidates(full_name),jobs(title))",
        )
        .eq("agency_id", agencyId)
        .eq("status", "extended")
        .not("expires_at", "is", null)
        .lte("expires_at", offerCutoff)
        .order("expires_at")
        .order("id")
        .limit(20),
    ]);
  if (
    [applications, processing, messages, intake].some((result) => result.error)
  )
    throw new ApiError(
      503,
      "ATTENTION_LOAD_FAILED",
      "The attention queue could not be loaded.",
    );
  const relation = (value: unknown, key: string) => {
    const object = Array.isArray(value) ? value[0] : value;
    return object && typeof object === "object" && key in object
      ? String((object as Record<string, unknown>)[key])
      : "";
  };
  const person = (value: unknown) => {
    const application = Array.isArray(value) ? value[0] : value;
    const record = (application ?? {}) as Record<string, unknown>;
    return [
      relation(record.candidates, "full_name"),
      relation(record.jobs, "title"),
    ]
      .filter(Boolean)
      .join(" · ");
  };
  const today = new Date().toISOString().slice(0, 10);
  const applicationItems = (rows: typeof applications.data, kind: string) =>
    (rows ?? []).map((row) => ({
      id: `${kind}:${row.id}`,
      applicationId: row.id,
      label:
        kind === "review"
          ? "Application review overdue"
          : "Application screening failed",
      detail: [
        relation(row.candidates, "full_name"),
        relation(row.jobs, "title"),
      ]
        .filter(Boolean)
        .join(" · "),
      at: row.submitted_at,
    }));
  return [
    ...applicationItems(applications.data, "review"),
    ...applicationItems(processing.data, "screening"),
    ...(messages.data ?? []).map((row) => ({
      id: `email:${row.id}`,
      applicationId: row.application_id ?? row.related_entity_id,
      label: "Email delivery failed",
      detail: row.subject ?? "Application acknowledgement",
      at: row.created_at,
    })),
    ...(intake.data ?? []).map((row) => ({
      id: `intake:${row.id}`,
      applicationId: row.application_id,
      label: "Intake automation failed",
      detail: "Review the application and retry processing.",
      at: row.created_at,
    })),
    // These tables arrive with ADR 0008; a read failure only hides them.
    ...(interviews.error ? [] : (interviews.data ?? [])).map((row) => ({
      id: `interview:${row.id}`,
      applicationId: row.application_id,
      label: "Interview outcome missing",
      detail: [row.title, person(row.applications)].filter(Boolean).join(" · "),
      at: row.ends_at,
    })),
    ...(offers.error ? [] : (offers.data ?? [])).map((row) => ({
      id: `offer:${row.id}`,
      applicationId: row.application_id,
      label:
        row.expires_at && row.expires_at < today
          ? "Offer past its respond-by date"
          : "Offer response due soon",
      detail: person(row.applications),
      at: `${row.expires_at}T00:00:00.000Z`,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
}

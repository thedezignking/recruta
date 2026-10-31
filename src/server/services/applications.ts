import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { matchGapSchema, matchSummarySchema } from "@/lib/match-grade";
import { ApiError } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { decodeTimeCursor, encodeTimeCursor } from "@/lib/cursor";
import {
  applicationActionSchema,
  applicationCursorSchema,
  applicationFiltersSchema,
  applicationInboxSchema,
  type ApplicationDetail,
} from "@/lib/applicant-operations";

export async function listApplications(
  supabase: SupabaseClient,
  agencyId: string,
  options: unknown = {},
) {
  const filters = applicationFiltersSchema.parse(options);
  let cursor;
  if (filters.cursor) {
    try {
      cursor = applicationCursorSchema.parse(
        JSON.parse(Buffer.from(filters.cursor, "base64url").toString("utf8")),
      );
    } catch {
      throw new ApiError(
        422,
        "INVALID_CURSOR",
        "This page link is invalid. Return to the first page.",
      );
    }
  }
  const { data, error } = await supabase.rpc("application_inbox", {
    p_agency_id: agencyId,
    p_filters: {
      ...filters,
      cursor: undefined,
      cursorAt: cursor?.at,
      cursorId: cursor?.id,
    },
  });
  if (error) {
    throw new ApiError(
      500,
      "APPLICATION_LIST_FAILED",
      "Applications could not be loaded.",
    );
  }
  const result = applicationInboxSchema.parse(data);
  return {
    items: result.items,
    total: result.total,
    nextCursor: result.nextCursor
      ? Buffer.from(JSON.stringify(result.nextCursor)).toString("base64url")
      : null,
  };
}

export async function getApplication(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
) {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id,agency_id,job_id,candidate_id,status,processing_status,source,submitted_at,updated_at,owner_user_id,cover_note,submitted_profile,candidates(id,full_name,email,phone,linkedin_url,email_suppressed),jobs(id,title,clients(name),job_assignments(user_id)),candidate_documents(id,file_name,size_bytes,content_type),application_answers(id,answer,job_application_questions(label,sort_order))",
    )
    .eq("agency_id", agencyId)
    .eq("id", applicationId)
    .maybeSingle();
  if (error)
    throw new ApiError(
      500,
      "APPLICATION_LOAD_FAILED",
      "The application could not be loaded.",
    );
  if (!data)
    throw new ApiError(404, "APPLICATION_NOT_FOUND", "Application not found.");
  return data as unknown as ApplicationDetail;
}

export async function getApplicationHistory(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
  cursors: { notes?: string; events?: string } = {},
) {
  const noteCursor = decodeTimeCursor(cursors.notes);
  const eventCursor = decodeTimeCursor(cursors.events);
  let noteQuery = supabase
    .from("application_notes")
    .select("id,body,author_user_id,created_at")
    .eq("agency_id", agencyId)
    .eq("application_id", applicationId);
  let eventQuery = supabase
    .from("activity_events")
    .select("id,event_type,actor_user_id,metadata,created_at")
    .eq("agency_id", agencyId)
    .eq("entity_type", "application")
    .eq("entity_id", applicationId);
  if (noteCursor)
    noteQuery = noteQuery.or(
      `created_at.lt.${noteCursor.at},and(created_at.eq.${noteCursor.at},id.lt.${noteCursor.id})`,
    );
  if (eventCursor)
    eventQuery = eventQuery.or(
      `created_at.lt.${eventCursor.at},and(created_at.eq.${eventCursor.at},id.lt.${eventCursor.id})`,
    );
  const [notes, events] = await Promise.all([
    noteQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(26),
    eventQuery
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(26),
  ]);
  if (notes.error || events.error)
    throw new ApiError(
      503,
      "APPLICATION_HISTORY_FAILED",
      "Application history could not be loaded.",
    );
  const noteItems = (notes.data ?? []).slice(0, 25);
  const eventItems = (events.data ?? []).slice(0, 25);
  return {
    notes: noteItems,
    events: eventItems,
    notesNext:
      (notes.data?.length ?? 0) > 25 ? encodeTimeCursor(noteItems[24]) : null,
    eventsNext:
      (events.data?.length ?? 0) > 25 ? encodeTimeCursor(eventItems[24]) : null,
  };
}

export async function reviewApplication(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
  input: unknown,
  requestId: string,
) {
  const payload = applicationActionSchema.parse(input);
  const { data, error } = await supabase.rpc("review_application", {
    p_agency_id: agencyId,
    p_application_id: applicationId,
    p_action: payload.action,
    p_payload: payload,
    p_expected_updated_at:
      "expectedUpdatedAt" in payload ? payload.expectedUpdatedAt : null,
    p_request_id: requestId,
  });
  if (error) {
    const errors: Record<string, [number, string, string]> = {
      application_not_found: [
        404,
        "APPLICATION_NOT_FOUND",
        "Application not found or access was removed.",
      ],
      application_changed: [
        409,
        "APPLICATION_CHANGED",
        "Someone updated this application. Refresh before trying again.",
      ],
      invalid_application_transition: [
        409,
        "INVALID_TRANSITION",
        "This stage change is not available.",
      ],
      transition_reason_required: [
        422,
        "REASON_REQUIRED",
        "Add a reason of at least five characters.",
      ],
      invalid_application_owner: [
        422,
        "INVALID_OWNER",
        "Choose an active teammate assigned to this job.",
      ],
      permission_denied: [
        403,
        "PERMISSION_DENIED",
        "You cannot change another recruiter's ownership.",
      ],
      idempotency_conflict: [
        409,
        "IDEMPOTENCY_CONFLICT",
        "This note request has already been used. Refresh and try again.",
      ],
    };
    const detail = errors[error.message];
    if (detail) throw new ApiError(...detail);
    throw new ApiError(
      500,
      "APPLICATION_UPDATE_FAILED",
      "The application could not be updated.",
    );
  }
  return data;
}

export async function getJobPipeline(
  supabase: SupabaseClient,
  agencyId: string,
  jobId: string,
) {
  // Exact server-side counts, not counts from the inbox's first page.
  const statuses = [
    "received",
    "in_review",
    "shortlisted",
    "client_review",
    "interview",
    "offer",
    "placed",
    "rejected",
    "withdrawn",
  ];
  return Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("job_id", jobId)
        .eq("status", status);
      if (error)
        throw new ApiError(
          503,
          "PIPELINE_LOAD_FAILED",
          "The pipeline could not be loaded.",
        );
      return { status, count: count ?? 0 };
    }),
  );
}

export async function createCandidateDocumentUrl(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
  documentId: string,
) {
  const { data, error } = await supabase
    .from("candidate_documents")
    .select("storage_path,file_name")
    .eq("agency_id", agencyId)
    .eq("application_id", applicationId)
    .eq("id", documentId)
    .single();
  if (error || !data) {
    throw new ApiError(
      404,
      "DOCUMENT_NOT_FOUND",
      "The candidate document was not found.",
    );
  }
  const admin = createAdminClient();
  const signed = await admin.storage
    .from("candidate-documents")
    .createSignedUrl(data.storage_path, 60, { download: data.file_name });
  if (signed.error || !signed.data) {
    throw new ApiError(
      503,
      "DOCUMENT_URL_FAILED",
      "The resume could not be opened.",
    );
  }
  return { url: signed.data.signedUrl, expiresIn: 60 };
}

/** The stored advisory match grade for one application, if it was screened. */
export async function getApplicationMatch(
  supabase: SupabaseClient,
  agencyId: string,
  applicationId: string,
) {
  const { data, error } = await supabase
    .from("application_matches")
    .select(
      "band,required_met,required_total,preferred_met,preferred_total,gaps,updated_at",
    )
    .eq("agency_id", agencyId)
    .eq("application_id", applicationId)
    .maybeSingle();
  // A missing grade is normal; a failed read must not block the review page.
  if (error || !data) return null;
  const summary = matchSummarySchema.safeParse(data);
  if (!summary.success) return null;
  const gaps = z.array(matchGapSchema).safeParse(data.gaps);
  return {
    ...summary.data,
    gaps: gaps.success ? gaps.data : [],
    updatedAt: data.updated_at as string,
  };
}

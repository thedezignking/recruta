import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { decodeTimeCursor, encodeTimeCursor } from "@/lib/cursor";
import type { Database } from "@/types/database.generated";
import {
  clarificationSchema,
  convertToJobSchema,
  hiringRequestSchema,
  requestMessageSchema,
} from "@/lib/validation";
import type { HiringRequestAction } from "@/features/hiring-requests/state-machine";
import {
  jobAuthorizationError,
  requireJobMutationResource,
} from "./job-mutation-access";

export async function listHiringRequests(
  supabase: SupabaseClient,
  scope: { agencyId?: string; clientId?: string },
  cursor?: string | null,
) {
  let query = supabase
    .from("hiring_requests")
    .select(
      "id,title,department,positions_required,location,work_arrangement,status,submitted_at,created_at,clients(name)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  if (scope.agencyId) query = query.eq("agency_id", scope.agencyId);
  if (scope.clientId) query = query.eq("client_id", scope.clientId);
  const after = decodeTimeCursor(cursor ?? undefined);
  if (after)
    query = query.or(
      `created_at.lt.${after.at},and(created_at.eq.${after.at},id.lt.${after.id})`,
    );
  const { data, error } = await query;
  if (error)
    throw new ApiError(
      500,
      "REQUEST_LIST_FAILED",
      "Hiring requests could not be loaded.",
    );
  const items = (data?.slice(0, 25) ?? []).map((request) => ({
    ...request,
    clients: Array.isArray(request.clients)
      ? (request.clients[0] ?? null)
      : request.clients,
  }));
  return {
    items,
    nextCursor: data && data.length > 25 ? encodeTimeCursor(data[24]) : null,
  };
}

export async function createHiringRequest(
  supabase: SupabaseClient,
  context: { agencyId: string; clientId?: string; userId: string },
  input: unknown,
) {
  const payload = hiringRequestSchema.parse(input);
  if (context.clientId && context.clientId !== payload.clientId)
    throw new ApiError(
      403,
      "CLIENT_ACCESS_DENIED",
      "You cannot create a request for this client.",
    );
  const { data: request, error } = await supabase
    .from("hiring_requests")
    .insert({
      agency_id: context.agencyId,
      client_id: payload.clientId,
      submitted_by: context.userId,
      title: payload.title,
      description: payload.description,
      department: payload.department || null,
      positions_required: payload.positionsRequired,
      location: payload.location || null,
      employment_type: payload.employmentType || null,
      work_arrangement: payload.workArrangement,
      salary_min: payload.salaryMin ?? null,
      salary_max: payload.salaryMax ?? null,
      currency: payload.currency?.toUpperCase() || null,
      target_hire_date:
        payload.targetHireDate?.toISOString().slice(0, 10) || null,
      additional_instructions: payload.additionalInstructions || null,
      status: "draft",
    })
    .select("id,title,status,created_at")
    .single();
  if (error || !request)
    throw new ApiError(
      400,
      "REQUEST_CREATE_FAILED",
      "The hiring request could not be created.",
    );
  if (payload.requirements.length) {
    const { error: requirementsError } = await supabase
      .from("hiring_request_requirements")
      .insert(
        payload.requirements.map((requirement, index) => ({
          agency_id: context.agencyId,
          hiring_request_id: request.id,
          requirement_type: requirement.type,
          label: requirement.label,
          description: requirement.description || null,
          sort_order: index,
        })),
      );
    if (requirementsError)
      throw new ApiError(
        400,
        "REQUIREMENTS_CREATE_FAILED",
        "The request requirements could not be saved.",
      );
  }
  return request;
}

export async function submitHiringRequest(
  supabase: SupabaseClient,
  requestId: string,
  requestIdHeader: string,
) {
  const { data, error } = await supabase.rpc("submit_hiring_request", {
    p_request_id: requestId,
    p_request_id_header: requestIdHeader,
  });
  if (error) throw new ApiError(409, "REQUEST_SUBMIT_FAILED", error.message);
  return {
    ...data,
    clients: Array.isArray(data.clients)
      ? (data.clients[0] ?? null)
      : data.clients,
  };
}

export async function requestClarification(
  supabase: SupabaseClient,
  requestId: string,
  input: unknown,
  requestIdHeader: string,
) {
  const payload = clarificationSchema.parse(input);
  const { data, error } = await supabase.rpc(
    "request_hiring_request_clarification",
    {
      p_request_id: requestId,
      p_message: payload.message,
      p_request_id_header: requestIdHeader,
    },
  );
  if (error) throw new ApiError(409, "CLARIFICATION_FAILED", error.message);
  return data;
}

export async function approveHiringRequest(
  supabase: SupabaseClient,
  requestId: string,
  requestIdHeader: string,
) {
  const { data, error } = await supabase.rpc("approve_hiring_request", {
    p_request_id: requestId,
    p_request_id_header: requestIdHeader,
  });
  if (error) throw new ApiError(409, "REQUEST_APPROVAL_FAILED", error.message);
  return data;
}

export async function convertHiringRequest(
  supabase: SupabaseClient,
  agencyId: string,
  requestId: string,
  input: unknown,
  idempotencyKey: string,
) {
  await requireJobMutationResource(
    supabase,
    agencyId,
    requestId,
    "hiring_requests",
  );
  const payload = convertToJobSchema.parse(input);
  const { data, error } = await supabase.rpc("convert_hiring_request_to_job", {
    p_request_id: requestId,
    p_workflow_template_id: payload.workflowTemplateId,
    p_deadline_at: payload.deadlineAt.toISOString(),
    p_priority: payload.priority,
    p_primary_recruiter_id: payload.primaryRecruiterId,
    p_idempotency_key: idempotencyKey,
  });
  if (error)
    throw (
      jobAuthorizationError(error) ??
      new ApiError(
        409,
        "JOB_CONVERSION_FAILED",
        "The request could not be converted. Check its approval, workflow and recruiter.",
      )
    );
  return { jobId: data };
}

export async function transitionRequest(
  supabase: SupabaseClient,
  requestId: string,
  action: Extract<HiringRequestAction, "start_review" | "decline" | "cancel">,
  context: { agencyId: string; userId: string; requestIdHeader: string },
) {
  const { data, error } = await supabase.rpc("transition_hiring_request", {
    p_request_id: requestId,
    p_action: action,
    p_request_id_header: context.requestIdHeader,
  });
  if (error || !data)
    throw new ApiError(
      409,
      "REQUEST_TRANSITION_FAILED",
      error?.message ?? "The request could not be updated.",
    );
  return data;
}

export async function getHiringRequest(
  supabase: SupabaseClient<Database>,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("hiring_requests")
    .select(
      "*,clients(id,name),hiring_request_requirements(id,requirement_type,label,description,sort_order),hiring_request_attachments(id,file_name,content_type,size_bytes,created_at),hiring_request_revisions!hiring_request_revisions_agency_id_hiring_request_id_fkey(id,revision_number,created_at)",
    )
    .eq("id", requestId)
    .order("sort_order", { referencedTable: "hiring_request_requirements" })
    .order("revision_number", {
      referencedTable: "hiring_request_revisions",
      ascending: false,
    })
    .single();
  if (error || !data)
    throw new ApiError(
      404,
      "HIRING_REQUEST_NOT_FOUND",
      "The hiring request was not found.",
    );
  return data;
}

export async function listRequestMessages(
  supabase: SupabaseClient,
  requestId: string,
) {
  const { data, error } = await supabase
    .from("hiring_request_messages")
    .select("id,author_user_id,visibility,message,created_at")
    .eq("hiring_request_id", requestId)
    .order("created_at", { ascending: true });
  if (error)
    throw new ApiError(
      500,
      "MESSAGE_LIST_FAILED",
      "Request messages could not be loaded.",
    );
  return { items: data ?? [] };
}

export async function createRequestMessage(
  supabase: SupabaseClient,
  userId: string,
  requestId: string,
  input: unknown,
) {
  const payload = requestMessageSchema.parse(input);
  const { data: hiringRequest, error: requestError } = await supabase
    .from("hiring_requests")
    .select("id,agency_id")
    .eq("id", requestId)
    .single();
  if (requestError || !hiringRequest)
    throw new ApiError(
      404,
      "HIRING_REQUEST_NOT_FOUND",
      "The hiring request was not found.",
    );
  if (payload.visibility === "agency_private") {
    const { data: membership } = await supabase
      .from("agency_memberships")
      .select("id")
      .eq("agency_id", hiringRequest.agency_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (!membership)
      throw new ApiError(
        403,
        "PRIVATE_MESSAGE_DENIED",
        "Client users cannot create private agency notes.",
      );
  }
  const { data, error } = await supabase
    .from("hiring_request_messages")
    .insert({
      agency_id: hiringRequest.agency_id,
      hiring_request_id: requestId,
      author_user_id: userId,
      visibility: payload.visibility,
      message: payload.message,
    })
    .select("id,author_user_id,visibility,message,created_at")
    .single();
  if (error || !data)
    throw new ApiError(
      400,
      "MESSAGE_CREATE_FAILED",
      "The message could not be saved.",
    );
  return data;
}

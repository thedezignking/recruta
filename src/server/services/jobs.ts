import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import {
  jobAssignmentSchema,
  jobTransitionSchema,
  manualJobSchema,
} from "@/lib/validation";
import type { Json } from "@/types/database.generated";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export async function listJobs(
  supabase: SupabaseClient,
  scope: { agencyId?: string; clientId?: string },
  cursor?: string | null,
) {
  let query = supabase
    .from("jobs")
    .select(
      "id,title,status,priority,positions_required,deadline_at,primary_recruiter_id,created_at,source,public_slug,published_at,accepting_applications,clients(name),workflow_templates(name),applications(count)",
    )
    .order("created_at", { ascending: false })
    .limit(26);
  if (scope.agencyId) query = query.eq("agency_id", scope.agencyId);
  if (scope.clientId) query = query.eq("client_id", scope.clientId);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error)
    throw new ApiError(500, "JOB_LIST_FAILED", "Jobs could not be loaded.");
  const items = (data?.slice(0, 25) ?? []).map((job) => ({
    ...job,
    clients: Array.isArray(job.clients)
      ? (job.clients[0] ?? null)
      : job.clients,
    workflow_templates: Array.isArray(job.workflow_templates)
      ? (job.workflow_templates[0] ?? null)
      : job.workflow_templates,
  }));
  return {
    items,
    nextCursor: data && data.length > 25 ? data[24]?.created_at : null,
  };
}

export async function getJob(supabase: SupabaseClient, jobId: string) {
  const { data, error } = await supabase
    .from("jobs")
    .select(
      "*,clients(id,name,industry,location),job_requirements(id,requirement_type,label,description,sort_order),job_application_questions(id,label,help_text,question_type,options,is_required,sort_order),job_assignments(id,user_id,assignment_role,created_at),job_workflow_stages(id,name,stage_type,sort_order,requires_approval),applications(count)",
    )
    .eq("id", jobId)
    .order("sort_order", { referencedTable: "job_requirements" })
    .order("sort_order", { referencedTable: "job_workflow_stages" })
    .single();
  if (error || !data)
    throw new ApiError(404, "JOB_NOT_FOUND", "The job was not found.");
  const raw = data as typeof data & {
    clients:
      | {
          id: string;
          name: string;
          industry: string | null;
          location: string | null;
        }[]
      | {
          id: string;
          name: string;
          industry: string | null;
          location: string | null;
        }
      | null;
    job_workflow_stages: Array<{
      id: string;
      name: string;
      stage_type: string;
      sort_order: number;
      requires_approval: boolean;
    }>;
  };
  return {
    ...raw,
    clients: Array.isArray(raw.clients)
      ? (raw.clients[0] ?? null)
      : raw.clients,
  };
}

export async function createManualJob(
  supabase: SupabaseClient,
  agencyId: string,
  input: unknown,
  requestId: string,
) {
  const payload = manualJobSchema.parse(input);
  const publicSlug = `${slugify(payload.title) || "role"}-${crypto
    .randomUUID()
    .slice(0, 8)}`;
  const { data, error } = await supabase.rpc("create_manual_job", {
    p_agency_id: agencyId,
    p_client_id: payload.clientId ?? null,
    p_new_client: (payload.newOrganization ?? null) as Json,
    p_job: {
      title: payload.title,
      description: payload.description,
      department: payload.department,
      positionsRequired: payload.positionsRequired,
      location: payload.location,
      employmentType: payload.employmentType,
      workArrangement: payload.workArrangement,
      salaryMin: payload.salaryMin,
      salaryMax: payload.salaryMax,
      currency: payload.currency || undefined,
      deadlineAt: payload.deadlineAt?.toISOString(),
      priority: payload.priority,
      workflowTemplateId: payload.workflowTemplateId || undefined,
      primaryRecruiterId: payload.primaryRecruiterId || undefined,
      applicationFormIntro: payload.applicationFormIntro,
      publicSlug,
    } as Json,
    p_requirements: payload.requirements as Json,
    p_questions: payload.questions as Json,
    p_publish: payload.publish,
    p_request_id_header: requestId,
  });
  if (error || !data) {
    const duplicate = error?.message.includes("jobs_agency_public_slug_idx");
    throw new ApiError(
      duplicate ? 409 : 400,
      duplicate ? "PUBLIC_SLUG_CONFLICT" : "JOB_CREATE_FAILED",
      duplicate
        ? "That public job URL is already in use. Please try again."
        : "The job could not be created. Review the details and try again.",
    );
  }
  return getJob(supabase, data);
}

export async function publishJob(
  supabase: SupabaseClient,
  jobId: string,
  requestId: string,
) {
  const job = await getJob(supabase, jobId);
  const publicSlug = `${slugify(job.title) || "role"}-${crypto.randomUUID().slice(0, 8)}`;
  const { data, error } = await supabase.rpc("publish_job", {
    p_job_id: jobId,
    p_public_slug: publicSlug,
    p_request_id_header: requestId,
  });
  if (error || !data) {
    throw new ApiError(
      400,
      "JOB_PUBLISH_FAILED",
      "The job could not be published.",
    );
  }
  return data;
}

export async function assignJob(
  supabase: SupabaseClient,
  jobId: string,
  input: unknown,
  requestId: string,
) {
  const payload = jobAssignmentSchema.parse(input);
  const { data, error } = await supabase.rpc("assign_job", {
    p_job_id: jobId,
    p_user_id: payload.userId,
    p_assignment_role: payload.assignmentRole,
    p_request_id_header: requestId,
  });
  if (error) throw new ApiError(409, "JOB_ASSIGNMENT_FAILED", error.message);
  return data;
}

export async function transitionJob(
  supabase: SupabaseClient,
  jobId: string,
  input: unknown,
  requestId: string,
) {
  const payload = jobTransitionSchema.parse(input);
  const { data, error } = await supabase.rpc("transition_job", {
    p_job_id: jobId,
    p_status: payload.status,
    p_request_id_header: requestId,
  });
  if (error) throw new ApiError(409, "JOB_TRANSITION_FAILED", error.message);
  return data;
}

export async function deleteEmptyManualJob(
  supabase: SupabaseClient,
  jobId: string,
  requestId: string,
) {
  const { data, error } = await supabase.rpc("delete_empty_manual_job", {
    p_job_id: jobId,
    p_request_id_header: requestId,
  });
  if (error) {
    const message = error.message;
    if (message.includes("job_has_applications")) {
      throw new ApiError(
        409,
        "JOB_HAS_APPLICATIONS",
        "This job has applications. Close it instead so candidate history is preserved.",
      );
    }
    if (message.includes("converted_job_cannot_be_deleted")) {
      throw new ApiError(
        409,
        "CONVERTED_JOB_CANNOT_BE_DELETED",
        "Jobs created from hiring requests must be closed rather than deleted.",
      );
    }
    throw new ApiError(
      400,
      "JOB_DELETE_FAILED",
      "The job could not be deleted.",
    );
  }
  return data;
}

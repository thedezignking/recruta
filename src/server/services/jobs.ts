import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { decodeTimeCursor, encodeTimeCursor } from "@/lib/cursor";
import { searchPattern } from "@/lib/workspace-search";
import { overviewRangeSchema, overviewWindow } from "@/lib/overview-range";
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
  scope: {
    agencyId?: string;
    clientId?: string;
    status?: string;
    query?: string;
    closingSoon?: boolean;
    unassigned?: boolean;
  },
  cursor?: string | null,
) {
  let query = supabase
    .from("jobs")
    .select(
      "id,title,status,priority,positions_required,deadline_at,primary_recruiter_id,created_at,source,public_slug,published_at,accepting_applications,employment_type,location,work_arrangement,clients(name,company_profile),workflow_templates(name),applications(count)",
    )
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(26);
  if (scope.agencyId) query = query.eq("agency_id", scope.agencyId);
  if (scope.clientId) query = query.eq("client_id", scope.clientId);
  if (scope.status) query = query.eq("status", scope.status);
  if (scope.query) query = query.ilike("title", searchPattern(scope.query));
  if (scope.closingSoon) {
    const now = new Date();
    query = query
      .eq("status", "open")
      .gte("deadline_at", now.toISOString())
      .lte("deadline_at", new Date(now.getTime() + 7 * 86400000).toISOString());
  }
  if (scope.unassigned) query = query.is("primary_recruiter_id", null);
  const after = decodeTimeCursor(cursor ?? undefined);
  if (after)
    query = query.or(
      `created_at.lt.${after.at},and(created_at.eq.${after.at},id.lt.${after.id})`,
    );
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
    nextCursor: data && data.length > 25 ? encodeTimeCursor(data[24]) : null,
  };
}

export async function getJobReviewProgress(
  supabase: SupabaseClient,
  agencyId: string,
  jobIds: string[],
) {
  const reviewed = new Map<string, number>();
  if (!jobIds.length) return reviewed;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("applications")
      .select("job_id,status")
      .eq("agency_id", agencyId)
      .in("job_id", jobIds)
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error)
      throw new ApiError(
        503,
        "JOB_PROGRESS_FAILED",
        "Job progress could not be loaded.",
      );
    for (const application of data ?? []) {
      if (
        application.status === "received" ||
        application.status === "withdrawn"
      )
        continue;
      reviewed.set(
        application.job_id,
        (reviewed.get(application.job_id) ?? 0) + 1,
      );
    }
    if (!data || data.length < 1000) break;
  }
  return reviewed;
}

export async function getJobsListSummary(
  supabase: SupabaseClient,
  agencyId: string,
  now = new Date(),
) {
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const base = () =>
    supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("agency_id", agencyId);
  const results = await Promise.all([
    base(),
    base().eq("status", "open"),
    base().eq("status", "draft"),
    base().eq("status", "on_hold"),
    base().eq("status", "filled"),
    base()
      .eq("status", "open")
      .gte("deadline_at", now.toISOString())
      .lte("deadline_at", inSevenDays.toISOString()),
  ]);
  if (results.some((result) => result.error))
    throw new ApiError(
      503,
      "JOB_SUMMARY_FAILED",
      "The jobs summary could not be loaded.",
    );
  return {
    all: results[0].count ?? 0,
    open: results[1].count ?? 0,
    draft: results[2].count ?? 0,
    onHold: results[3].count ?? 0,
    filled: results[4].count ?? 0,
    closingSoon: results[5].count ?? 0,
  };
}

export async function getJobsActivity(
  supabase: SupabaseClient,
  agencyId: string,
  range: unknown,
  now = new Date(),
) {
  const selectedRange = overviewRangeSchema.parse(range);
  const window = overviewWindow(selectedRange, now);
  const end = now.getTime();
  let start = window ? Date.parse(window.since) : end - 86400000;
  if (!window) {
    const first = await supabase
      .from("jobs")
      .select("created_at")
      .eq("agency_id", agencyId)
      .order("created_at", { ascending: true })
      .limit(1);
    if (first.error)
      throw new ApiError(
        503,
        "JOB_ACTIVITY_FAILED",
        "Job activity could not be loaded.",
      );
    if (first.data?.[0]?.created_at)
      start = Math.min(start, Date.parse(first.data[0].created_at));
  }
  const periods = Array.from({ length: 8 }, (_, index) => ({
    since: new Date(start + ((end - start) * index) / 8).toISOString(),
    until: new Date(start + ((end - start) * (index + 1)) / 8).toISOString(),
  }));
  const previousStart = new Date(
    window ? start - (end - start) : end - 30 * 86400000,
  ).toISOString();
  const previousEnd = window?.since ?? now.toISOString();
  const series = {
    open: Array<number>(8).fill(0),
    positions: Array<number>(8).fill(0),
    nearDeadline: Array<number>(8).fill(0),
    filled: Array<number>(8).fill(0),
  };
  const previous = { open: 0, positions: 0, nearDeadline: 0, filled: 0 };
  const deadlineEnd = now.getTime() + 7 * 86400000;
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("jobs")
      .select("id,status,created_at,positions_required,deadline_at")
      .eq("agency_id", agencyId)
      .in("status", ["open", "filled"])
      .gte("created_at", window ? previousStart : new Date(start).toISOString())
      .lte("created_at", now.toISOString())
      .order("id", { ascending: true })
      .range(offset, offset + 999);
    if (error)
      throw new ApiError(
        503,
        "JOB_ACTIVITY_FAILED",
        "Job activity could not be loaded.",
      );
    for (const job of data ?? []) {
      const created = Date.parse(job.created_at);
      const deadline = job.deadline_at ? Date.parse(job.deadline_at) : NaN;
      const nearDeadline =
        job.status === "open" && deadline >= end && deadline <= deadlineEnd;
      const current = created >= start && created <= end;
      if (current) {
        const index = Math.min(
          7,
          Math.floor(((created - start) / (end - start)) * 8),
        );
        if (job.status === "open") {
          series.open[index] += 1;
          series.positions[index] += job.positions_required;
          if (nearDeadline) series.nearDeadline[index] += 1;
        } else {
          series.filled[index] += 1;
        }
      }
      if (
        created >= Date.parse(previousStart) &&
        (window
          ? created < Date.parse(previousEnd)
          : created <= Date.parse(previousEnd))
      ) {
        if (job.status === "open") {
          previous.open += 1;
          previous.positions += job.positions_required;
          if (nearDeadline) previous.nearDeadline += 1;
        } else {
          previous.filled += 1;
        }
      }
    }
    if (!data || data.length < 1000) break;
  }
  return {
    periods,
    series,
    previous,
    counts: {
      open: series.open.reduce((sum, count) => sum + count, 0),
      positions: series.positions.reduce((sum, count) => sum + count, 0),
      nearDeadline: series.nearDeadline.reduce((sum, count) => sum + count, 0),
      filled: series.filled.reduce((sum, count) => sum + count, 0),
    },
    comparisonLabel:
      selectedRange === "24h"
        ? "previous 24h"
        : selectedRange === "all"
          ? "last 30 days"
          : `previous ${selectedRange.slice(0, -1)} days`,
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
    if (message.includes("job_has_collaboration_history")) {
      throw new ApiError(
        409,
        "JOB_HAS_COLLABORATION_HISTORY",
        "This job has hiring-manager collaboration history. Close it instead to preserve that history.",
      );
    }
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

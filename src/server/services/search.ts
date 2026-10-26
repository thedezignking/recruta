import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import {
  searchPattern,
  workspaceQuerySchema,
  type WorkspaceSearchItem,
} from "@/lib/workspace-search";

export async function searchOrganizations(
  supabase: SupabaseClient,
  agencyId: string,
  input: string,
) {
  const query = workspaceQuerySchema.parse(input);
  const pattern = searchPattern(query);
  if (!pattern.replaceAll("%", "").trim()) return [];
  const { data, error } = await supabase
    .from("clients")
    .select("id,name,website,industry,location,company_profile")
    .eq("agency_id", agencyId)
    .neq("status", "archived")
    .or(`name.ilike.${pattern},website.ilike.${pattern}`)
    .order("name")
    .order("id")
    .limit(8);
  if (error)
    throw new ApiError(
      503,
      "SEARCH_FAILED",
      "Organizations could not be searched. Try again.",
    );
  return data ?? [];
}

export async function searchWorkspace(
  supabase: SupabaseClient,
  agencyId: string,
  input: string,
) {
  const query = workspaceQuerySchema.parse(input);
  const pattern = searchPattern(query);
  if (!pattern.replaceAll("%", "").trim()) return { items: [] };
  const [jobs, candidates, organizations] = await Promise.all([
    supabase
      .from("jobs")
      .select("id,title,status")
      .eq("agency_id", agencyId)
      .ilike("title", pattern)
      .order("title")
      .order("id")
      .limit(5),
    supabase
      .from("candidates")
      .select("id,full_name,email")
      .eq("agency_id", agencyId)
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .order("full_name")
      .order("id")
      .limit(5),
    searchOrganizations(supabase, agencyId, query),
  ]);
  if (jobs.error || candidates.error)
    throw new ApiError(
      503,
      "SEARCH_FAILED",
      "Workspace search is unavailable. Try again.",
    );
  const items: WorkspaceSearchItem[] = [
    ...(jobs.data ?? []).map((job) => ({
      id: job.id,
      group: "Jobs" as const,
      label: job.title,
      detail: job.status.replaceAll("_", " "),
      href: `/app/jobs/${job.id}`,
    })),
    ...(candidates.data ?? []).map((person) => ({
      id: person.id,
      group: "Applicants" as const,
      label: person.full_name,
      detail: person.email,
      href: `/app/applications?candidateId=${person.id}`,
    })),
    ...organizations.slice(0, 5).map((organization) => ({
      id: organization.id,
      group: "Organizations" as const,
      label: organization.name,
      detail: [organization.industry, organization.location]
        .filter(Boolean)
        .join(" · "),
      href: `/app/clients/${organization.id}`,
    })),
  ];
  return { items };
}

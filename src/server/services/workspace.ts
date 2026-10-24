import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { agencyProfileSchema } from "@/lib/validation";

export async function getAgencyProfile(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const { data, error } = await supabase
    .from("agencies")
    .select(
      "id,name,slug,contact_email,country_code,timezone,primary_specialization,status,logo_path,created_at",
    )
    .eq("id", agencyId)
    .single();
  if (error || !data)
    throw new ApiError(404, "AGENCY_NOT_FOUND", "Agency not found.");
  return data;
}

export async function updateAgencyProfile(
  supabase: SupabaseClient,
  agencyId: string,
  input: unknown,
) {
  const payload = agencyProfileSchema.parse(input);
  const { data, error } = await supabase
    .from("agencies")
    .update({
      name: payload.name,
      contact_email: payload.contactEmail.toLowerCase(),
      country_code: payload.countryCode,
      timezone: payload.timezone,
      primary_specialization: payload.primarySpecialization || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", agencyId)
    .select(
      "id,name,slug,contact_email,country_code,timezone,primary_specialization,status,logo_path,created_at",
    )
    .single();
  if (error || !data) {
    throw new ApiError(
      400,
      "AGENCY_UPDATE_FAILED",
      "Agency settings could not be saved.",
    );
  }
  return data;
}

export async function listAgencyMembers(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const { data, error } = await supabase
    .from("agency_memberships")
    .select("id,user_id,role,status,joined_at,created_at")
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: true });
  if (error)
    throw new ApiError(
      500,
      "MEMBER_LIST_FAILED",
      "Agency members could not be loaded.",
    );
  const userIds = (data ?? []).map((member) => member.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("user_profiles")
        .select("id,full_name,avatar_path")
        .in("id", userIds)
    : { data: [] };
  const profilesById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile]),
  );
  return {
    items: (data ?? []).map((member) => ({
      ...member,
      profile: profilesById.get(member.user_id) ?? null,
    })),
  };
}

export async function listWorkflowTemplates(
  supabase: SupabaseClient,
  agencyId: string,
) {
  const { data, error } = await supabase
    .from("workflow_templates")
    .select(
      "id,agency_id,name,description,template_key,is_system_template,is_active,workflow_stages(id,name,stage_type,sort_order,requires_approval)",
    )
    .or(`agency_id.is.null,agency_id.eq.${agencyId}`)
    .eq("is_active", true)
    .order("name")
    .order("sort_order", { referencedTable: "workflow_stages" });
  if (error)
    throw new ApiError(
      500,
      "WORKFLOW_LIST_FAILED",
      "Workflow templates could not be loaded.",
    );
  return { items: data ?? [] };
}

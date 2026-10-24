import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { clientSchema } from "@/lib/validation";

export async function listClients(
  supabase: SupabaseClient,
  agencyId: string,
  cursor?: string | null,
) {
  let query = supabase
    .from("clients")
    .select(
      "id,name,industry,location,status,account_manager_id,created_at,client_contacts(full_name,email,is_primary),jobs(count),hiring_requests(count)",
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(26);
  if (cursor) query = query.lt("created_at", cursor);
  const { data, error } = await query;
  if (error)
    throw new ApiError(
      500,
      "CLIENT_LIST_FAILED",
      "Clients could not be loaded.",
    );
  const items = data?.slice(0, 25) ?? [];
  return {
    items,
    nextCursor: data && data.length > 25 ? data[24]?.created_at : null,
  };
}

export async function getClientRecord(
  supabase: SupabaseClient,
  agencyId: string,
  clientId: string,
) {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id,name,industry,website,country_code,location,status,account_manager_id,created_at,client_contacts(id,full_name,email,phone,job_title,is_primary),jobs(id,title,status,positions_required,public_slug,created_at),hiring_requests(id,title,status,positions_required,created_at)",
    )
    .eq("agency_id", agencyId)
    .eq("id", clientId)
    .order("created_at", { referencedTable: "jobs", ascending: false })
    .order("created_at", {
      referencedTable: "hiring_requests",
      ascending: false,
    })
    .single();
  if (error || !data) {
    throw new ApiError(
      404,
      "CLIENT_NOT_FOUND",
      "The organization was not found.",
    );
  }
  return data;
}

export async function createClientRecord(
  supabase: SupabaseClient,
  agencyId: string,
  accountManagerId: string,
  input: unknown,
) {
  const payload = clientSchema.parse(input);
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("agency_id", agencyId)
    .ilike("name", payload.name.trim())
    .neq("status", "archived")
    .limit(1)
    .maybeSingle();
  if (existing) {
    throw new ApiError(
      409,
      "ORGANIZATION_ALREADY_EXISTS",
      "An organization with this name already exists. Open the existing organization instead.",
    );
  }
  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      agency_id: agencyId,
      name: payload.name,
      industry: payload.industry || null,
      website: payload.website || null,
      country_code: payload.countryCode?.toUpperCase() || null,
      location: payload.location || null,
      account_manager_id: accountManagerId,
    })
    .select("id,name,industry,location,status")
    .single();
  if (error || !client)
    throw new ApiError(
      400,
      "CLIENT_CREATE_FAILED",
      "The client could not be created.",
    );

  const { error: contactError } = await supabase
    .from("client_contacts")
    .insert({
      agency_id: agencyId,
      client_id: client.id,
      full_name: payload.primaryContact.fullName,
      email: payload.primaryContact.email.toLowerCase(),
      phone: payload.primaryContact.phone || null,
      job_title: payload.primaryContact.jobTitle || null,
      is_primary: true,
    });
  if (contactError)
    throw new ApiError(
      400,
      "CONTACT_CREATE_FAILED",
      "The primary contact could not be saved.",
    );
  return client;
}

export async function deleteEmptyClient(
  supabase: SupabaseClient,
  clientId: string,
  requestId: string,
) {
  const { data, error } = await supabase.rpc("delete_empty_client", {
    p_client_id: clientId,
    p_request_id_header: requestId,
  });
  if (error) {
    if (error.message.includes("organization_has_activity")) {
      throw new ApiError(
        409,
        "ORGANIZATION_HAS_ACTIVITY",
        "Remove its empty jobs first. Organizations with hiring history cannot be deleted.",
      );
    }
    throw new ApiError(
      400,
      "ORGANIZATION_DELETE_FAILED",
      "The organization could not be deleted.",
    );
  }
  return data;
}

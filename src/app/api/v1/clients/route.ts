import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import { createClientRecord, listClients } from "@/server/services/clients";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    return ok(await listClients(supabase, agencyId, cursor), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId, user } = await requireAgencyContext(request, [
      "owner",
      "administrator",
      "recruitment_manager",
      "recruiter",
    ]);
    const client = await createClientRecord(
      supabase,
      agencyId,
      user.id,
      await readJson(request),
    );
    return ok(client, { status: 201, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}

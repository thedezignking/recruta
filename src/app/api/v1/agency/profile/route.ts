import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  getAgencyProfile,
  updateAgencyProfile,
} from "@/server/services/workspace";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request);
    return ok(await getAgencyProfile(supabase, agencyId), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PATCH(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
    ]);
    return ok(
      await updateAgencyProfile(supabase, agencyId, await readJson(request)),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

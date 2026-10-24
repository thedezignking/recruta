import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  createHiringRequest,
  listHiringRequests,
} from "@/server/services/hiring-requests";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, agencyId } = await requireAgencyContext(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    return ok(await listHiringRequests(supabase, { agencyId }, cursor), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, user, agencyId } = await requireAgencyContext(request);
    const record = await createHiringRequest(
      supabase,
      { agencyId, userId: user.id },
      await readJson(request),
    );
    return ok(record, { status: 201, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}

import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireClientContext } from "@/server/auth/context";
import { listHiringRequests } from "@/server/services/hiring-requests";
import { savePortalRequest } from "@/server/services/portal-requests";

export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, clientId } = await requireClientContext(request);
    const cursor = new URL(request.url).searchParams.get("cursor");
    return ok(await listHiringRequests(supabase, { clientId }, cursor), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, clientId } = await requireClientContext(request, [
      "client_administrator",
      "hiring_manager",
    ]);
    const result = await savePortalRequest(
      supabase,
      clientId,
      await readJson(request),
    );
    return ok(result, { status: 201, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}

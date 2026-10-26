import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  getProcessingSettings,
  saveProcessingSettings,
  processingAvailability,
} from "@/server/services/processing-settings";
export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      {
        settings: await getProcessingSettings(c.supabase, c.agencyId),
        available: processingAvailability(),
      },
      { headers: { "cache-control": "private, no-store", "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}
export async function PATCH(request: Request) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request, ["owner", "administrator"]);
    return ok(
      await saveProcessingSettings(
        c.supabase,
        c.agencyId,
        await readJson(request),
        id,
      ),
    );
  } catch (error) {
    return apiError(error, id);
  }
}

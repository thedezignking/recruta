import { z } from "zod";
import { apiError, ApiError, ok, readJson, requestId } from "@/lib/api";
import { readImageForm } from "@/server/http/read-image-form";
import { isSameOriginRequest } from "@/lib/request-origin";
import { requireAgencyContext } from "@/server/auth/context";
import { saveAgencyLogo } from "@/server/services/agency-logo";

const expectedPath = z.string().max(250).nullable();

async function mutate(request: Request, remove: boolean) {
  const id = requestId(request.headers);
  try {
    if (!isSameOriginRequest(request))
      throw new ApiError(403, "INVALID_ORIGIN", "This request is not allowed.");
    const { supabase, agencyId } = await requireAgencyContext(request, [
      "owner",
      "administrator",
    ]);
    let file: File | null = null;
    let expected: string | null;
    if (remove)
      expected = z
        .object({ expectedPath })
        .parse(await readJson(request)).expectedPath;
    else {
      const form = await readImageForm(request);
      const value = form.get("file");
      if (!(value instanceof File))
        throw new ApiError(422, "INVALID_LOGO", "Choose an image.");
      file = value;
      expected = expectedPath.parse(form.get("expectedPath") || null);
    }
    return ok(await saveAgencyLogo(supabase, agencyId, expected, file, id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}
export async function POST(request: Request) {
  return mutate(request, false);
}
export async function DELETE(request: Request) {
  return mutate(request, true);
}

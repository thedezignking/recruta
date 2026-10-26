import { z } from "zod";
import { apiError, ApiError, ok, readJson, requestId } from "@/lib/api";
import { agencyLogoMaxBytes } from "@/lib/agency-logo";
import { isSameOriginRequest } from "@/lib/request-origin";
import { requireAgencyContext } from "@/server/auth/context";
import { saveAgencyLogo } from "@/server/services/agency-logo";

const expectedPath = z.string().max(250).nullable();

// Bound multipart input even when Content-Length is absent.
async function readLogoForm(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "INVALID_UPLOAD", "Choose an image.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > agencyLogoMaxBytes + 65536) {
        await reader.cancel();
        throw new ApiError(
          413,
          "UPLOAD_TOO_LARGE",
          "Choose an image up to 2 MB.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    return await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    throw new ApiError(
      400,
      "INVALID_UPLOAD",
      "The image upload could not be read.",
    );
  }
}

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
      const form = await readLogoForm(request);
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

import { ApiError } from "@/lib/api";
import { agencyLogoMaxBytes } from "@/lib/agency-logo";

// Bound multipart input even when Content-Length is absent.
export async function readImageForm(request: Request) {
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

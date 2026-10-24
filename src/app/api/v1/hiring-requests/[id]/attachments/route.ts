import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { createAttachmentUpload } from "@/server/services/attachments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, user } = await requireUser();
    const result = await createAttachmentUpload(
      supabase,
      user.id,
      route.id,
      await readJson(request),
    );
    return ok(result, { status: 201, headers: { "x-request-id": id } });
  } catch (error) {
    return apiError(error, id);
  }
}

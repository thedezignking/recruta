import { apiError, ok, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import { createAttachmentDownload } from "@/server/services/attachments";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; attachmentId: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase } = await requireUser();
    return ok(
      await createAttachmentDownload(supabase, route.id, route.attachmentId),
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

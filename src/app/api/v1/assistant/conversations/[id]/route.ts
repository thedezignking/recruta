import { z } from "zod";
import { apiError, ApiError, ok, readJson, requestId } from "@/lib/api";
import { conversationTitleSchema } from "@/lib/assistant";
import { isSameOriginRequest } from "@/lib/request-origin";
import {
  deleteConversation,
  getConversation,
  renameConversation,
} from "@/server/assistant/conversations";
import { requireAgencyContext } from "@/server/auth/context";

type Context = { params: Promise<{ id: string }> };
const headers = (id: string) => ({
  "x-request-id": id,
  "cache-control": "private, no-store",
});

export async function GET(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    const context = await requireAgencyContext(request);
    return ok(
      await getConversation(
        context.supabase,
        context.agencyId,
        z.uuid().parse((await params).id),
      ),
      { headers: headers(id) },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function PATCH(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    if (!isSameOriginRequest(request))
      throw new ApiError(403, "INVALID_ORIGIN", "This request is not allowed.");
    const context = await requireAgencyContext(request);
    const { title } = conversationTitleSchema.parse(await readJson(request));
    return ok(
      await renameConversation(
        context.supabase,
        context.agencyId,
        z.uuid().parse((await params).id),
        title,
      ),
      { headers: headers(id) },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const id = requestId(request.headers);
  try {
    if (!isSameOriginRequest(request))
      throw new ApiError(403, "INVALID_ORIGIN", "This request is not allowed.");
    const context = await requireAgencyContext(request);
    return ok(
      await deleteConversation(
        context.supabase,
        context.agencyId,
        z.uuid().parse((await params).id),
      ),
      { headers: headers(id) },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

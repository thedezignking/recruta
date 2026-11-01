import { apiError, ApiError, ok, readJson, requestId } from "@/lib/api";
import { assistantRequestSchema } from "@/lib/assistant";
import { getAssistantEnv } from "@/lib/env";
import { isSameOriginRequest } from "@/lib/request-origin";
import { runAssistant } from "@/server/assistant/assistant";
import {
  loadHistory,
  saveAssistantReply,
  saveUserMessage,
} from "@/server/assistant/conversations";
import { requireAgencyContext } from "@/server/auth/context";
import { getProcessingSettings } from "@/server/services/processing-settings";

export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    if (!isSameOriginRequest(request))
      throw new ApiError(403, "INVALID_ORIGIN", "This request is not allowed.");
    const context = await requireAgencyContext(request);
    const env = getAssistantEnv();
    if (!env.available || !env.apiKey || !env.model)
      throw new ApiError(
        503,
        "ASSISTANT_DISABLED",
        "Recruta bot chat isn't switched on for this deployment.",
      );
    // Per-workspace AI opt-in is the same switch that enables screening.
    const settings = await getProcessingSettings(
      context.supabase,
      context.agencyId,
    );
    if (!settings.screeningEnabled)
      throw new ApiError(
        403,
        "ASSISTANT_WORKSPACE_DISABLED",
        "Turn on AI for this workspace in Settings to use Recruta bot chat.",
      );
    const input = assistantRequestSchema.parse(await readJson(request));
    // The message is saved first, so it survives an AI failure.
    const { conversationId, title } = await saveUserMessage(
      context.supabase,
      { agencyId: context.agencyId, userId: context.user.id },
      input,
    );
    const history = await loadHistory(
      context.supabase,
      context.agencyId,
      conversationId,
    );
    const reply = await runAssistant(
      { supabase: context.supabase, agencyId: context.agencyId },
      history,
      { apiKey: env.apiKey, model: env.model, requestId: id },
    );
    await saveAssistantReply(
      context.supabase,
      context.agencyId,
      conversationId,
      reply,
    );
    return ok(
      { ...reply, conversationId, title },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

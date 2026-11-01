import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import {
  assistantMessageSchema,
  assistantReplySchema,
  conversationTitle,
  type AssistantMessage,
  type AssistantReply,
  type ConversationSummary,
  type StoredMessage,
} from "@/lib/assistant";

/** Saved Recruta bot chats (ADR 0007). RLS limits every query to the owner. */

const HISTORY_LIMIT = 20;

function failed(message: string): never {
  throw new ApiError(503, "ASSISTANT_HISTORY_FAILED", message);
}

export async function listConversations(
  db: SupabaseClient,
  agencyId: string,
  userId: string,
): Promise<ConversationSummary[]> {
  const { data, error } = await db
    .from("assistant_conversations")
    .select("id,title,updated_at")
    .eq("agency_id", agencyId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  // Before the migration is applied there is simply no history.
  if (error) return [];
  return data ?? [];
}

export async function getConversation(
  db: SupabaseClient,
  agencyId: string,
  conversationId: string,
) {
  const [conversation, messages] = await Promise.all([
    db
      .from("assistant_conversations")
      .select("id,title,updated_at")
      .eq("agency_id", agencyId)
      .eq("id", conversationId)
      .maybeSingle(),
    db
      .from("assistant_messages")
      .select("id,role,content,actions,links,trace,duration_ms")
      .eq("agency_id", agencyId)
      .eq("conversation_id", conversationId)
      .order("created_at")
      .order("id")
      .limit(200),
  ]);
  if (conversation.error || messages.error)
    failed("This chat could not be loaded.");
  if (!conversation.data)
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Chat not found.");
  const parsed = assistantReplySchema.pick({
    actions: true,
    links: true,
    trace: true,
  });
  return {
    ...conversation.data,
    messages: (messages.data ?? []).map((row): StoredMessage => {
      const extra = parsed.safeParse({
        actions: row.actions,
        links: row.links,
        trace: row.trace,
      });
      return {
        id: row.id,
        role: row.role === "assistant" ? "assistant" : "user",
        content: row.content,
        actions: extra.success ? extra.data.actions : [],
        links: extra.success ? extra.data.links : [],
        trace: extra.success ? extra.data.trace : [],
        ms: row.duration_ms ?? 0,
      };
    }),
  };
}

/** Creates the chat on first use and saves the person's message. */
export async function saveUserMessage(
  db: SupabaseClient,
  context: { agencyId: string; userId: string },
  input: { conversationId?: string; messageId: string; message: string },
) {
  let conversationId = input.conversationId;
  let title: string;
  if (conversationId) {
    const { data, error } = await db
      .from("assistant_conversations")
      .select("title")
      .eq("agency_id", context.agencyId)
      .eq("id", conversationId)
      .maybeSingle();
    if (error) failed("This chat could not be loaded.");
    if (!data)
      throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Chat not found.");
    title = data.title;
  } else {
    conversationId = crypto.randomUUID();
    title = conversationTitle(input.message);
    const { error } = await db.from("assistant_conversations").insert({
      id: conversationId,
      agency_id: context.agencyId,
      user_id: context.userId,
      title,
    });
    if (error) failed("The chat could not be started.");
  }
  const { error } = await db.from("assistant_messages").insert({
    id: input.messageId,
    agency_id: context.agencyId,
    conversation_id: conversationId,
    role: "user",
    content: input.message,
  });
  if (error?.code === "23505")
    throw new ApiError(
      409,
      "MESSAGE_ALREADY_SENT",
      "That message was already sent. Refresh the chat to see the reply.",
    );
  if (error) failed("Your message could not be saved.");
  return { conversationId, title };
}

/** The most recent turns, oldest first, for the model's context. */
export async function loadHistory(
  db: SupabaseClient,
  agencyId: string,
  conversationId: string,
): Promise<AssistantMessage[]> {
  const { data, error } = await db
    .from("assistant_messages")
    .select("role,content")
    .eq("agency_id", agencyId)
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) failed("This chat could not be loaded.");
  return (data ?? [])
    .reverse()
    .map((row) =>
      assistantMessageSchema.safeParse({
        role: row.role,
        content: row.content.slice(0, 4000),
      }),
    )
    .flatMap((result) => (result.success ? [result.data] : []));
}

export async function saveAssistantReply(
  db: SupabaseClient,
  agencyId: string,
  conversationId: string,
  reply: AssistantReply,
) {
  const { error } = await db.from("assistant_messages").insert({
    id: crypto.randomUUID(),
    agency_id: agencyId,
    conversation_id: conversationId,
    role: "assistant",
    content: reply.reply.slice(0, 20000),
    actions: reply.actions,
    links: reply.links,
    trace: reply.trace,
    duration_ms: reply.ms,
  });
  // The reply is still returned; only its history entry is missing.
  await db
    .from("assistant_conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("agency_id", agencyId)
    .eq("id", conversationId);
  return !error;
}

export async function renameConversation(
  db: SupabaseClient,
  agencyId: string,
  conversationId: string,
  title: string,
) {
  const { data, error } = await db
    .from("assistant_conversations")
    .update({ title })
    .eq("agency_id", agencyId)
    .eq("id", conversationId)
    .select("id,title,updated_at")
    .maybeSingle();
  if (error) failed("The chat could not be renamed.");
  if (!data)
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Chat not found.");
  return data;
}

export async function deleteConversation(
  db: SupabaseClient,
  agencyId: string,
  conversationId: string,
) {
  const { data, error } = await db
    .from("assistant_conversations")
    .delete()
    .eq("agency_id", agencyId)
    .eq("id", conversationId)
    .select("id");
  if (error) failed("The chat could not be deleted.");
  if (!data?.length)
    throw new ApiError(404, "CONVERSATION_NOT_FOUND", "Chat not found.");
  return { id: conversationId, deleted: true };
}

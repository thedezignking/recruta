import { z } from "zod";
import { applicationStatusSchema } from "@/lib/applicant-operations";

/** Ask Recruta request/response contracts (ADR 0007). */
export const assistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});
export type AssistantMessage = z.output<typeof assistantMessageSchema>;

/** One new message; the server keeps the history (ADR 0007). */
export const assistantRequestSchema = z.object({
  conversationId: z.uuid().optional(),
  messageId: z.uuid(),
  message: z.string().trim().min(1).max(4000),
});

export const conversationTitleSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

/** A short title from the first message. */
export function conversationTitle(message: string) {
  const line = message.replace(/\s+/g, " ").trim();
  return line.length > 60 ? `${line.slice(0, 57).trimEnd()}…` : line;
}

/** A change the assistant proposes; nothing happens until a person confirms. */
export const stageChangeProposalSchema = z.object({
  type: z.literal("stage_change"),
  applicationId: z.uuid(),
  candidateName: z.string(),
  jobTitle: z.string(),
  from: applicationStatusSchema,
  to: applicationStatusSchema,
  reason: z.string().max(2000),
  reasonRequired: z.boolean(),
  expectedUpdatedAt: z.string(),
});
export type StageChangeProposal = z.output<typeof stageChangeProposalSchema>;

/** One lookup behind a reply, summarised for the person (no raw data). */
export const traceStepSchema = z.object({
  tool: z.string(),
  label: z.string(),
  detail: z.string().optional(),
  result: z.string().optional(),
  href: z.string().optional(),
  ok: z.boolean(),
  ms: z.number().int().nonnegative(),
});
export type TraceStep = z.output<typeof traceStepSchema>;

export const assistantReplySchema = z.object({
  reply: z.string(),
  actions: z.array(stageChangeProposalSchema),
  links: z.array(z.object({ label: z.string(), href: z.string() })),
  trace: z.array(traceStepSchema).default([]),
  /** Wall time for the whole answer, model included. */
  ms: z.number().int().nonnegative().default(0),
});
export type AssistantReply = z.output<typeof assistantReplySchema>;

export const assistantTurnSchema = assistantReplySchema.extend({
  conversationId: z.uuid(),
  title: z.string(),
});

export type ConversationSummary = {
  id: string;
  title: string;
  updated_at: string;
};
export type StoredMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions: StageChangeProposal[];
  links: { label: string; href: string }[];
  trace: TraceStep[];
  ms: number;
};

export const assistantSuggestions = [
  "Who are the strongest candidates waiting for review?",
  "Which applications are missing information?",
  "Summarise the pipeline for my open jobs",
  "Draft a polite update for candidates still in review",
];

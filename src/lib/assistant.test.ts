import { describe, expect, it } from "vitest";
import { assistantRequestSchema, conversationTitle } from "./assistant";

describe("assistant chats", () => {
  it("titles a chat from its first message", () => {
    expect(conversationTitle("  Who is   waiting\nfor review? ")).toBe(
      "Who is waiting for review?",
    );
    const long = conversationTitle("a".repeat(100));
    expect(long).toHaveLength(58);
    expect(long.endsWith("…")).toBe(true);
  });

  it("accepts one new message per request", () => {
    expect(
      assistantRequestSchema.safeParse({
        messageId: crypto.randomUUID(),
        message: "Hello",
      }).success,
    ).toBe(true);
    expect(
      assistantRequestSchema.safeParse({
        messageId: "not-a-uuid",
        message: "Hello",
      }).success,
    ).toBe(false);
  });
});

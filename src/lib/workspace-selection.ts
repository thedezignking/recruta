import { z } from "zod";

export const workspaceSelectionSchema = z.object({ agencyId: z.uuid() });
export const workspaceCookieName = (userId: string) =>
  `recruta-workspace-${userId}`;
export function parseWorkspaceSelection(value: unknown) {
  const parsed = z.uuid().safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

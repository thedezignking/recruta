import { z } from "zod";

export const workspaceQuerySchema = z.string().trim().min(2).max(100);
export type WorkspaceSearchItem = {
  id: string;
  group: "Jobs" | "Applicants" | "Organizations";
  label: string;
  detail: string;
  href: string;
};

// PostgREST filter syntax must not be interpolated from raw input.
export function searchPattern(query: string) {
  return `%${query
    .replace(/[\\%_(),."*]/g, " ")
    .replace(/\s+/g, " ")
    .trim()}%`;
}

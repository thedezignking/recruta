import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { searchPattern } from "@/lib/workspace-search";
export async function jobOptions(
  db: SupabaseClient,
  agencyId: string,
  input: unknown,
) {
  const p = z
    .object({
      q: z.string().trim().max(100).default(""),
      cursor: z.uuid().optional(),
    })
    .parse(input);
  let query = db
    .from("jobs")
    .select("id,title")
    .eq("agency_id", agencyId)
    .order("id")
    .limit(26);
  if (p.q) query = query.ilike("title", searchPattern(p.q));
  if (p.cursor) query = query.gt("id", p.cursor);
  const { data, error } = await query;
  if (error)
    throw new ApiError(
      503,
      "JOB_OPTIONS_UNAVAILABLE",
      "Jobs could not be loaded.",
    );
  const items = (data ?? []).slice(0, 25);
  return {
    items,
    nextCursor: data && data.length > 25 ? (items.at(-1)?.id ?? null) : null,
  };
}

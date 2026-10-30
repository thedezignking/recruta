import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "@/lib/api";
import { libraryMutationSchema, type LibraryQuestion } from "@/lib/job-content";
import { z } from "zod";
import type { Json } from "@/types/database.generated";
export async function listLibraryQuestions(
  db: SupabaseClient,
  agencyId: string,
  includeArchived = false,
): Promise<LibraryQuestion[]> {
  let query = db
    .from("screening_question_library")
    .select(
      "id,label,help_text,question_type,options,is_required,category,version,archived",
    )
    .eq("agency_id", agencyId)
    .order("category")
    .order("label")
    .order("id")
    .limit(500);
  if (!includeArchived) query = query.eq("archived", false);
  const { data, error } = await query;
  if (error)
    throw new ApiError(
      500,
      "LIBRARY_LOAD_FAILED",
      "The question library could not be loaded.",
    );
  return (data ?? []).map((q) => ({
    id: q.id,
    label: q.label,
    helpText: q.help_text,
    questionType: q.question_type as LibraryQuestion["questionType"],
    options: q.options as string[],
    isRequired: q.is_required,
    category: q.category,
    version: q.version,
    archived: q.archived,
  }));
}
export async function saveLibraryQuestion(
  db: SupabaseClient,
  agencyId: string,
  input: unknown,
  key: string,
) {
  const payload = libraryMutationSchema.parse(input);
  const { data, error } = await db.rpc("save_library_question", {
    p_agency_id: agencyId,
    p_input: payload as Json,
    p_request_key: z.uuid().parse(key),
  });
  if (error || !data) {
    if (error?.code === "23505")
      throw new ApiError(
        409,
        "DUPLICATE_LIBRARY_QUESTION",
        "That question is already in the active library. Edit the existing question or use a different label.",
      );
    const conflict = /stale_library|idempotency_conflict/.test(
      error?.message ?? "",
    );
    throw new ApiError(
      error?.message.includes("permission_denied") ? 403 : conflict ? 409 : 400,
      "LIBRARY_SAVE_FAILED",
      conflict
        ? "This question changed. Reload the library before saving."
        : "The question could not be saved. Check your access and question details.",
    );
  }
  return data;
}

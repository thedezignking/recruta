import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireAgencyContext } from "@/server/auth/context";
import {
  listLibraryQuestions,
  saveLibraryQuestion,
} from "@/server/services/question-library";
export async function GET(request: Request) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      await listLibraryQuestions(
        c.supabase,
        c.agencyId,
        new URL(request.url).searchParams.get("archived") === "1",
      ),
      { headers: { "cache-control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e, id);
  }
}
export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const c = await requireAgencyContext(request);
    return ok(
      await saveLibraryQuestion(
        c.supabase,
        c.agencyId,
        await readJson(request),
        request.headers.get("x-idempotency-key") ?? "",
      ),
    );
  } catch (e) {
    return apiError(e, id);
  }
}

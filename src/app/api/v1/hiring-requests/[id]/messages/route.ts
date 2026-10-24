import { apiError, ok, readJson, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";
import {
  createRequestMessage,
  listRequestMessages,
} from "@/server/services/hiring-requests";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase } = await requireUser();
    return ok(await listRequestMessages(supabase, route.id), {
      headers: { "x-request-id": id },
    });
  } catch (error) {
    return apiError(error, id);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = requestId(request.headers);
  try {
    const route = await params;
    const { supabase, user } = await requireUser();
    return ok(
      await createRequestMessage(
        supabase,
        user.id,
        route.id,
        await readJson(request),
      ),
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return apiError(error, id);
  }
}

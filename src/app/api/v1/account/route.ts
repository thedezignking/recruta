import { z } from "zod";
import { apiError, ApiError, ok, readJson, requestId } from "@/lib/api";
import { requireUser } from "@/server/auth/context";

export async function PATCH(request: Request) {
  const id = requestId(request.headers);
  try {
    const { supabase, user } = await requireUser();
    const payload = z
      .object({ fullName: z.string().trim().min(2).max(120) })
      .parse(await readJson(request));
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ full_name: payload.fullName })
      .eq("id", user.id)
      .select("full_name")
      .single();
    if (error || !data)
      throw new ApiError(
        400,
        "PROFILE_UPDATE_FAILED",
        "Your name could not be saved. Try again.",
      );
    return ok(data);
  } catch (error) {
    return apiError(error, id);
  }
}

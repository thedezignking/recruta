import { cookies } from "next/headers";
import { z } from "zod";
import { apiError, ok, readJson, requestId, ApiError } from "@/lib/api";
import { portalCookie, portalMemberships } from "@/server/auth/portal-context";
export async function POST(request: Request) {
  const id = requestId(request.headers);
  try {
    const c = await portalMemberships();
    const { clientId } = z
      .object({ clientId: z.uuid() })
      .parse(await readJson(request));
    if (!c.memberships.some((m) => m.client_id === clientId))
      throw new ApiError(
        403,
        "CLIENT_ACCESS_DENIED",
        "Organization access was removed.",
      );
    (await cookies()).set(portalCookie(c.user.id), clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return ok({ selected: true });
  } catch (error) {
    return apiError(error, id);
  }
}

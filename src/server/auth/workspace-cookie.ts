import { cookies } from "next/headers";
import { workspaceCookieName } from "@/lib/workspace-selection";

export async function selectWorkspaceCookie(
  userId: string,
  agencyId: string,
  requestUrl: string,
) {
  (await cookies()).set(workspaceCookieName(userId), agencyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(requestUrl).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error)
    return NextResponse.json(
      {
        error: {
          code: "LOGOUT_FAILED",
          message: "Could not log out. Try again.",
        },
      },
      { status: 503 },
    );
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json({ data: { redirectTo: "/login" } });
  }
  return NextResponse.redirect(new URL("/login", request.url), 303);
}

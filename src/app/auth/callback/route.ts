import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNext } from "@/lib/auth-next";
import { appRequestOrigin } from "@/lib/request-origin";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = appRequestOrigin(request);
  const code = url.searchParams.get("code");
  const next = safeAuthNext(url.searchParams.get("next"));
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (tokenHash && (type === "invite" || type === "magiclink")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (!error)
      return NextResponse.redirect(new URL(next, origin), {
        headers: {
          "cache-control": "private, no-store",
          "referrer-policy": "no-referrer",
        },
      });
  }
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(new URL("/login?error=verification", origin));
}

import { NextResponse } from "next/server";
import { requireUser } from "@/server/auth/context";
import { appRequestOrigin } from "@/lib/request-origin";
export async function GET(request: Request) {
  const origin = appRequestOrigin(request);
  const c = await requireUser().catch(() => null);
  if (!c) return NextResponse.redirect(new URL("/login", origin));
  const { data: agency } = await c.supabase
    .from("agency_memberships")
    .select("id,agencies!inner(status)")
    .eq("user_id", c.user.id)
    .eq("status", "active")
    .eq("agencies.status", "active")
    .limit(1);
  if (agency?.length) return NextResponse.redirect(new URL("/app", origin));
  const { data: client } = await c.supabase.rpc("portal_memberships");
  return NextResponse.redirect(
    new URL(client?.length ? "/portal" : "/onboarding", origin),
  );
}

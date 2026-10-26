import { redirect } from "next/navigation";
import { WorkspaceOverview } from "@/components/overview/workspace-overview";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getWorkspaceOverview,
  getOverviewJobs,
} from "@/server/services/overview";
import { getPublicEnv } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { parseOverviewRange } from "@/lib/overview-range";
import { getAttentionQueue } from "@/server/services/application-automations";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const range = parseOverviewRange((await searchParams).range);
  const now = new Date();
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [overview, jobs, agencyResult, attention] = await Promise.all([
    getWorkspaceOverview(context.supabase, context.agencyId, range, now),
    getOverviewJobs(context.supabase, context.agencyId),
    context.supabase
      .from("agencies")
      .select("timezone,slug")
      .eq("id", context.agencyId)
      .single(),
    getAttentionQueue(context.supabase, context.agencyId),
  ]);
  if (agencyResult.error || !agencyResult.data)
    throw new ApiError(
      500,
      "OVERVIEW_LOAD_FAILED",
      "The workspace details could not be loaded.",
    );
  return (
    <WorkspaceOverview
      overview={overview}
      range={range}
      work={jobs}
      role={context.role}
      applicationBaseUrl={`${getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/careers/${agencyResult.data.slug}`}
      timezone={agencyResult.data?.timezone || "Africa/Lagos"}
      attention={attention}
    />
  );
}

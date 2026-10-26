import { redirect } from "next/navigation";
import { WorkspaceOverview } from "@/components/overview/workspace-overview";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getWorkspaceOverview } from "@/server/services/overview";
import { listJobs } from "@/server/services/jobs";
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
    listJobs(context.supabase, { agencyId: context.agencyId }),
    context.supabase
      .from("agencies")
      .select("timezone")
      .eq("id", context.agencyId)
      .single(),
    getAttentionQueue(context.supabase, context.agencyId),
  ]);
  return (
    <WorkspaceOverview
      overview={overview}
      range={range}
      jobs={jobs.items.slice(0, 5)}
      timezone={agencyResult.data?.timezone || "Africa/Lagos"}
      attention={attention}
    />
  );
}

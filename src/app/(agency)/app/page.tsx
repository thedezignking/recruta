import { redirect } from "next/navigation";
import { WorkspaceOverview } from "@/components/overview/workspace-overview";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getWorkspaceOverview,
  getOverviewJobs,
  getOverviewTrends,
} from "@/server/services/overview";
import { getPublicEnv } from "@/lib/env";
import { ApiError } from "@/lib/api";
import { parseOverviewRange } from "@/lib/overview-range";
import { getAttentionQueue } from "@/server/services/application-automations";
import { getJobReviewProgress } from "@/server/services/jobs";
import { listClients } from "@/server/services/clients";
import {
  listAgencyMembers,
  listWorkflowTemplates,
} from "@/server/services/workspace";
import { companyProfileSchema } from "@/lib/organization";
import { getCompanyLookupEnv } from "@/lib/env";
import { NewJobDialog } from "@/components/jobs/new-job-dialog";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[]; new?: string }>;
}) {
  const params = await searchParams;
  const range = parseOverviewRange(params.range);
  const showNewJob = params.new === "1";
  const now = new Date();
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [
    overview,
    jobs,
    trends,
    agencyResult,
    attention,
    clientResult,
    workflowResult,
    memberResult,
  ] = await Promise.all([
    getWorkspaceOverview(context.supabase, context.agencyId, range, now),
    getOverviewJobs(context.supabase, context.agencyId),
    getOverviewTrends(context.supabase, context.agencyId, range, now).catch(
      () => null,
    ),
    context.supabase
      .from("agencies")
      .select("timezone,slug")
      .eq("id", context.agencyId)
      .single(),
    getAttentionQueue(context.supabase, context.agencyId),
    showNewJob
      ? listClients(context.supabase, context.agencyId)
      : Promise.resolve(null),
    showNewJob
      ? listWorkflowTemplates(context.supabase, context.agencyId)
      : Promise.resolve(null),
    showNewJob
      ? listAgencyMembers(context.supabase, context.agencyId)
      : Promise.resolve(null),
  ]);
  const reviewProgress = await getJobReviewProgress(
    context.supabase,
    context.agencyId,
    jobs.activeJobs.map((job) => job.id),
  );
  if (agencyResult.error || !agencyResult.data)
    throw new ApiError(
      500,
      "OVERVIEW_LOAD_FAILED",
      "The workspace details could not be loaded.",
    );
  return (
    <>
      <WorkspaceOverview
        overview={overview}
        trends={trends}
        range={range}
        work={jobs}
        role={context.role}
        applicationBaseUrl={`${getPublicEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/careers/${agencyResult.data.slug}`}
        timezone={agencyResult.data?.timezone || "Africa/Lagos"}
        attention={attention}
        reviewProgress={reviewProgress}
        agencyId={context.agencyId}
        userId={context.user.id}
      />
      {showNewJob && (
        <NewJobDialog
          agencyId={context.agencyId}
          lookupClientId={getCompanyLookupEnv().clientId}
          clients={
            clientResult?.items.map((client) => ({
              id: client.id,
              name: client.name,
              website: client.website ?? undefined,
              logoUrl:
                companyProfileSchema.safeParse(client.company_profile).data
                  ?.logoUrl || undefined,
            })) ?? []
          }
          workflows={
            workflowResult?.items.map((workflow) => ({
              id: workflow.id,
              name: workflow.name,
              stages: workflow.workflow_stages,
            })) ?? []
          }
          recruiters={
            memberResult?.items
              .filter((member) => member.status === "active")
              .map((member) => ({
                userId: member.user_id,
                name: member.profile?.full_name ?? "Team member",
                role: member.role,
              })) ?? []
          }
          currentUserId={context.user.id}
          returnTo="/app"
        />
      )}
    </>
  );
}

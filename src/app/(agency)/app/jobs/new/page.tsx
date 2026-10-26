import { redirect } from "next/navigation";
import { NewJobForm } from "@/components/jobs/new-job-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listClients } from "@/server/services/clients";
import { getCompanyLookupEnv } from "@/lib/env";
import {
  listAgencyMembers,
  listWorkflowTemplates,
} from "@/server/services/workspace";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const lookup = getCompanyLookupEnv();
  const [clientResult, workflowResult, memberResult] = await Promise.all([
    listClients(context.supabase, context.agencyId),
    listWorkflowTemplates(context.supabase, context.agencyId),
    listAgencyMembers(context.supabase, context.agencyId),
  ]);
  const clientOptions = clientResult.items.map((client) => ({
    id: client.id,
    name: client.name,
  }));
  if (clientId && !clientOptions.some((item) => item.id === clientId)) {
    const { data } = await context.supabase
      .from("clients")
      .select("id,name")
      .eq("agency_id", context.agencyId)
      .eq("id", clientId)
      .neq("status", "archived")
      .maybeSingle();
    if (data) clientOptions.unshift(data);
  }

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader title="New job" />
      <NewJobForm
        agencyId={context.agencyId}
        lookupClientId={lookup.clientId}
        clients={clientOptions}
        workflows={workflowResult.items.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
        }))}
        recruiters={memberResult.items.map((member) => ({
          userId: member.user_id,
          name: member.profile?.full_name ?? "Team member",
          role: member.role,
        }))}
        currentUserId={context.user.id}
        initialClientId={clientId}
      />
    </div>
  );
}

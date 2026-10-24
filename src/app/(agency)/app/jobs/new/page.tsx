import { redirect } from "next/navigation";
import { NewJobForm } from "@/components/jobs/new-job-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listClients } from "@/server/services/clients";
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
  const [clientResult, workflowResult, memberResult] = await Promise.all([
    listClients(context.supabase, context.agencyId),
    listWorkflowTemplates(context.supabase, context.agencyId),
    listAgencyMembers(context.supabase, context.agencyId),
  ]);

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        eyebrow="New job"
        title="Open a role"
        description="Create the organization, role, requirements, and public application form in one place."
      />
      <NewJobForm
        clients={clientResult.items.map((client) => ({
          id: client.id,
          name: client.name,
        }))}
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

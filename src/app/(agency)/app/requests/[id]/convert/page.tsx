import { redirect } from "next/navigation";
import { ConvertRequestForm } from "@/components/requests/convert-request-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getHiringRequest } from "@/server/services/hiring-requests";
import {
  listAgencyMembers,
  listWorkflowTemplates,
} from "@/server/services/workspace";

export default async function ConvertRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  if (context.role === "recruiter") redirect(`/app/requests/${id}`);

  const [request, workflows, members] = await Promise.all([
    getHiringRequest(context.supabase, id),
    listWorkflowTemplates(context.supabase, context.agencyId),
    listAgencyMembers(context.supabase, context.agencyId),
  ]);
  if (request.status !== "approved") redirect(`/app/requests/${id}`);

  return (
    <div className="max-w-3xl pb-20 lg:pb-0">
      <PageHeader
        eyebrow="Approved request"
        title={`Create job: ${request.title}`}
        description={request.clients?.name}
      />
      <ConvertRequestForm
        requestId={request.id}
        workflows={workflows.items.map((workflow) => ({
          id: workflow.id,
          name: workflow.name,
        }))}
        recruiters={members.items
          .filter((member) => member.status === "active")
          .map((member) => ({
            id: member.user_id,
            name: member.profile?.full_name ?? "Team member",
          }))}
      />
    </div>
  );
}

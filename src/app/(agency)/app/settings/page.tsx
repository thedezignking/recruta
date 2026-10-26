import { redirect } from "next/navigation";
import { AgencySettingsForm } from "@/components/settings/agency-settings-form";
import { AgencyLogo } from "@/components/settings/agency-logo";
import { agencyLogoUrl } from "@/server/services/agency-logo";
import { ProcessingSettings } from "@/components/settings/processing-settings";
import {
  getProcessingSettings,
  processingAvailability,
} from "@/server/services/processing-settings";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { agencyCan } from "@/server/authorization/permissions";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getAgencyProfile,
  listWorkflowTemplates,
} from "@/server/services/workspace";

export default async function SettingsPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  if (!agencyCan(context.role, "manage_agency")) redirect("/app");
  const [agency, workflows, processing] = await Promise.all([
    getAgencyProfile(context.supabase, context.agencyId),
    listWorkflowTemplates(context.supabase, context.agencyId),
    getProcessingSettings(context.supabase, context.agencyId),
  ]);

  return (
    <div className="max-w-4xl pb-20 lg:pb-0">
      <PageHeader title="Agency settings" />
      <Card className="mt-6 shadow-none">
        <CardHeader className="border-b pb-4">
          <CardTitle>Agency profile</CardTitle>
        </CardHeader>
        <CardContent>
          <AgencyLogo
            agencyId={agency.id}
            initialPath={agency.logo_path}
            initialUrl={agencyLogoUrl(context.supabase, agency.logo_path)}
          />
          <AgencySettingsForm agency={agency} />
        </CardContent>
      </Card>
      <ProcessingSettings
        agencyId={context.agencyId}
        initial={processing}
        available={processingAvailability()}
      />
      <Card className="mt-5 shadow-none">
        <CardHeader className="border-b pb-4">
          <CardTitle>Workflow templates</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose one when opening a job. Active jobs keep their own stage
            snapshot.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3">
          {workflows.items.map((workflow) => (
            <div key={workflow.id} className="rounded-lg border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{workflow.name}</p>
                <span className="text-xs text-muted-foreground">
                  {workflow.workflow_stages.length} stages
                </span>
              </div>
              {workflow.description ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {workflow.description}
                </p>
              ) : null}
              <p className="mt-3 text-xs text-muted-foreground">
                {workflow.workflow_stages
                  .map((stage) => stage.name)
                  .join(" → ")}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

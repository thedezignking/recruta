import { redirect } from "next/navigation";
import { QuestionLibrary } from "@/components/settings/question-library";
import { listLibraryQuestions } from "@/server/services/question-library";
import { AgencySettingsForm } from "@/components/settings/agency-settings-form";
import { AgencyLogo } from "@/components/settings/agency-logo";
import { agencyLogoUrl } from "@/server/services/agency-logo";
import { ProcessingSettings } from "@/components/settings/processing-settings";
import {
  getProcessingSettings,
  processingAvailability,
} from "@/server/services/processing-settings";
import { Panel } from "@/components/shared/page-header";
import { SettingsLayout } from "@/components/shared/settings-layout";
import { agencyCan } from "@/server/authorization/permissions";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getAgencyProfile,
  listWorkflowTemplates,
} from "@/server/services/workspace";

export default async function SettingsPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  if (context.role === "recruitment_manager")
    return (
      <SettingsLayout
        title="Settings"
        sections={[{ id: "question-bank", label: "Question bank" }]}
      >
        <QuestionLibrary
          agencyId={context.agencyId}
          initial={await listLibraryQuestions(
            context.supabase,
            context.agencyId,
            true,
          )}
        />
      </SettingsLayout>
    );
  if (!agencyCan(context.role, "manage_agency")) redirect("/app");
  const [agency, workflows, processing, library] = await Promise.all([
    getAgencyProfile(context.supabase, context.agencyId),
    listWorkflowTemplates(context.supabase, context.agencyId),
    getProcessingSettings(context.supabase, context.agencyId),
    listLibraryQuestions(context.supabase, context.agencyId, true),
  ]);

  return (
    <SettingsLayout
      title="Settings"
      sections={[
        { id: "agency-profile", label: "Agency profile" },
        { id: "processing", label: "Applicant processing" },
        { id: "question-bank", label: "Question bank" },
        { id: "workflows", label: "Workflow templates" },
      ]}
    >
      <Panel title="Agency profile" anchorId="agency-profile">
        <AgencyLogo
          agencyId={agency.id}
          initialPath={agency.logo_path}
          initialUrl={agencyLogoUrl(context.supabase, agency.logo_path)}
        />
        <AgencySettingsForm agency={agency} />
      </Panel>
      <ProcessingSettings
        agencyId={context.agencyId}
        initial={processing}
        available={processingAvailability()}
      />
      <QuestionLibrary agencyId={context.agencyId} initial={library} />
      <Panel
        title="Workflow templates"
        anchorId="workflows"
        count={workflows.items.length}
        bodyClassName="p-0"
      >
        <p className="px-4 pb-2 text-xs text-muted-foreground">
          Choose one when opening a job. Active jobs keep their own stage
          snapshot.
        </p>
        <ul className="pb-2">
          {workflows.items.map((workflow) => (
            <li key={workflow.id} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{workflow.name}</p>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {workflow.workflow_stages.length} stages
                </span>
              </div>
              {workflow.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {workflow.description}
                </p>
              ) : null}
              <ol className="mt-2 flex flex-wrap items-center gap-1 text-[11px]">
                {workflow.workflow_stages.map((stage, index) => (
                  <li
                    key={`${index}-${stage.name}`}
                    className="flex items-center gap-1"
                  >
                    {index > 0 && (
                      <span aria-hidden="true" className="text-border">
                        —
                      </span>
                    )}
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {stage.name}
                    </span>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ul>
      </Panel>
    </SettingsLayout>
  );
}

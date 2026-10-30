import Link from "next/link";
import { CaseRoundIcon, UsersGroupRoundedIcon } from "@solar-icons/react/bold";
import {
  ArrowRightIcon,
  LinkCircleIcon,
  PenIcon,
} from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { CopyApplicationLink } from "@/components/jobs/copy-application-link";
import { JobLifecycleActions } from "@/components/jobs/job-lifecycle-actions";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicEnv } from "@/lib/env";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getJobPipeline,
  listApplications,
} from "@/server/services/applications";
import { getJob } from "@/server/services/jobs";
import { getJobCollaborators } from "@/server/services/collaboration";
import { JobCollaborators } from "@/components/collaboration/job-collaborators";
import { JobToolbarTitle } from "@/components/layout/toolbar-title-context";
import { NewJobDialog } from "@/components/jobs/new-job-dialog";
import { JobRoleDetails } from "@/components/jobs/job-role-details";
import type { FormValues } from "@/components/jobs/new-job-form";
import { listClients } from "@/server/services/clients";
import {
  listAgencyMembers,
  listWorkflowTemplates,
} from "@/server/services/workspace";
import { companyProfileSchema } from "@/lib/organization";
import { getCompanyLookupEnv } from "@/lib/env";
import { isAcceptingPublicApplications } from "@/lib/job-publication";
import { contentShape } from "@/lib/job-content";
import { z } from "zod";

export default async function JobPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; review?: string }>;
}) {
  const { id } = await params;
  const { edit, review } = await searchParams;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const job = await getJob(context.supabase, id).catch(() => null);
  if (!job || job.agency_id !== context.agencyId) notFound();
  const canCollaborate =
    context.role !== "recruiter" ||
    job.job_assignments.some(
      (a: { user_id: string }) => a.user_id === context.user.id,
    );
  const canEditDraft =
    job.status === "draft" &&
    (canCollaborate || job.created_by === context.user.id);
  const showEdit = edit === "1" && canEditDraft;
  const collaborators = canCollaborate
    ? await getJobCollaborators(
        context.supabase,
        context.agencyId,
        id,
        job.client_id,
      )
    : null;
  const [applicationResult, agencyResult, pipeline] = await Promise.all([
    listApplications(context.supabase, context.agencyId, { jobId: id }),
    context.supabase
      .from("agencies")
      .select("slug")
      .eq("id", context.agencyId)
      .single(),
    getJobPipeline(context.supabase, context.agencyId, id),
  ]);
  const [clientResult, memberResult, workflowResult] = showEdit
    ? await Promise.all([
        listClients(context.supabase, context.agencyId),
        listAgencyMembers(context.supabase, context.agencyId),
        listWorkflowTemplates(context.supabase, context.agencyId),
      ])
    : [null, null, null];
  const clientOptions =
    clientResult?.items.map((client) => ({
      id: client.id,
      name: client.name,
      website: client.website ?? undefined,
      location: client.location ?? undefined,
      logoUrl:
        companyProfileSchema.safeParse(client.company_profile).data?.logoUrl ||
        undefined,
    })) ?? [];
  if (
    showEdit &&
    !clientOptions.some((client) => client.id === job.client_id)
  ) {
    const { data: selectedClient } = await context.supabase
      .from("clients")
      .select("id,name,website,location,company_profile")
      .eq("agency_id", context.agencyId)
      .eq("id", job.client_id)
      .maybeSingle();
    if (selectedClient)
      clientOptions.unshift({
        id: selectedClient.id,
        name: selectedClient.name,
        website: selectedClient.website ?? undefined,
        location: selectedClient.location ?? undefined,
        logoUrl:
          companyProfileSchema.safeParse(selectedClient.company_profile).data
            ?.logoUrl || undefined,
      });
  }
  const stages: { id: string; name: string }[] = job.job_workflow_stages.map(
    (stage: { id: string; name: string }) => ({
      id: stage.id,
      name: stage.name,
    }),
  );
  const applicationUrl =
    isAcceptingPublicApplications(job) && job.public_slug && agencyResult.data
      ? `${getPublicEnv().NEXT_PUBLIC_APP_URL}/careers/${agencyResult.data.slug}/jobs/${job.public_slug}`
      : null;
  const initialDraft:
    | { id: string; updatedAt: string; values: FormValues }
    | undefined = showEdit
    ? {
        id: job.id,
        updatedAt: job.updated_at,
        values: {
          clientId: job.client_id,
          title: job.title,
          description: job.description,
          department: job.department ?? "",
          positionsRequired: job.positions_required,
          location: job.location ?? "",
          employmentType: job.employment_type ?? "",
          ...z.object(contentShape).parse({
            employmentArrangement: job.employment_arrangement ?? "",
            workingHours: job.working_hours,
            contractDuration: job.contract_duration ?? "",
            remoteEligibility: job.remote_eligibility ?? "",
            remoteDetails: job.remote_details ?? "",
            salaryVisibility: job.salary_visibility,
            salaryBasis: job.salary_basis,
            hiringReason: job.internalBrief?.hiring_reason ?? "",
            targetStartDate: job.internalBrief?.target_start_date ?? "",
            sourcingBrief: job.internalBrief?.sourcing_brief ?? "",
          }),
          workArrangement: (job.work_arrangement ?? undefined) as
            | undefined
            | "hybrid"
            | "on_site"
            | "remote",
          experienceMinYears: job.experience_min_years ?? undefined,
          seniorityLevel: (job.seniority_level ?? "") as
            | ""
            | "entry"
            | "mid"
            | "senior"
            | "lead"
            | "executive",
          salaryMin:
            job.internalBrief?.salary_min ?? job.salary_min ?? undefined,
          salaryMax:
            job.internalBrief?.salary_max ?? job.salary_max ?? undefined,
          currency: job.currency ?? "NGN",
          salaryPeriod: job.salary_period ?? "monthly",
          deadlineAt: job.deadline_at?.slice(0, 10) ?? "",
          priority: job.priority as "low" | "normal" | "high" | "urgent",
          workflowTemplateId: job.workflow_template_id ?? "",
          primaryRecruiterId: job.primary_recruiter_id ?? context.user.id,
          applicationFormIntro: job.application_form_intro ?? "",
          requirements:
            job.draftContent?.requirements ??
            job.job_requirements.map(
              (item: {
                requirement_type: string;
                label: string;
                description: string | null;
              }) => ({
                type: item.requirement_type as "required" | "preferred",
                label: item.label,
                description: item.description ?? "",
              }),
            ),
          questions:
            job.draftContent?.questions ??
            job.job_application_questions.map(
              (item: {
                label: string;
                help_text: string | null;
                question_type: string;
                options: unknown;
                is_required: boolean;
              }) => ({
                label: item.label,
                helpText: item.help_text ?? "",
                questionType: item.question_type as
                  | "short_text"
                  | "long_text"
                  | "yes_no"
                  | "single_select",
                options: Array.isArray(item.options)
                  ? item.options.filter(
                      (option: unknown): option is string =>
                        typeof option === "string",
                    )
                  : [],
                isRequired: item.is_required,
              }),
            ),
          publish: false,
        },
      }
    : undefined;

  return (
    <div className="pb-20 lg:pb-0">
      <JobToolbarTitle title={job.title} />
      <PageHeader
        title={job.title}
        description={`${job.clients?.name ?? "Organization"} · ${job.positions_required} ${job.positions_required === 1 ? "position" : "positions"}`}
        actions={
          <>
            <StatusBadge status={job.status} className="h-7 px-3" />
            {canEditDraft && (
              <ButtonLink
                href={`/app/jobs/${job.id}?edit=1`}
                variant="outline"
                size="sm"
              >
                <PenIcon data-icon="inline-start" aria-hidden="true" />
                Edit draft
              </ButtonLink>
            )}
            {job.status === "draft" && canEditDraft ? (
              <ButtonLink
                href={`/app/jobs/${job.id}?edit=1&review=1`}
                size="sm"
              >
                Review &amp; publish
              </ButtonLink>
            ) : applicationUrl ? (
              <CopyApplicationLink url={applicationUrl} />
            ) : null}
            {canCollaborate && (
              <JobLifecycleActions
                agencyId={context.agencyId}
                jobId={job.id}
                status={job.status}
                source={job.source}
                applicationCount={job.applications?.[0]?.count ?? 0}
              />
            )}
          </>
        }
      />

      {job.status === "draft" ? (
        <div className="mt-6 rounded-[10px] border border-border bg-[#F8F8F8] px-4 py-3">
          <p className="text-sm font-semibold">This job is a draft</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Candidates cannot apply until you review and publish it.
          </p>
        </div>
      ) : applicationUrl ? (
        <Card className="mt-6 border-primary/20 bg-primary/[0.035] shadow-none">
          <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
                <LinkCircleIcon aria-hidden="true" size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">Applications are open</p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {applicationUrl}
                </p>
              </div>
            </div>
            <ButtonLink
              href={applicationUrl}
              target="_blank"
              variant="outline"
              size="sm"
            >
              Open public page
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </ButtonLink>
          </CardContent>
        </Card>
      ) : null}

      {stages.length ? (
        <section className="mt-7" aria-labelledby="workflow-heading">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="workflow-heading" className="text-sm font-semibold">
              Hiring workflow
            </h2>
            <span className="text-xs text-muted-foreground">
              {stages.length} stages
            </span>
          </div>
          <ol
            aria-label="Configured recruitment stages"
            className="flex gap-0 overflow-x-auto rounded-[10px] border border-border bg-white p-3"
          >
            {stages.map((stage, index) => (
              <li
                key={stage.id}
                className="flex min-w-[132px] flex-1 items-center last:flex-none"
              >
                <div className="flex min-w-0 items-center gap-2 rounded-md px-1 py-1.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-primary/25 bg-primary/[0.07] text-[11px] font-semibold text-primary tabular-nums">
                    {index + 1}
                  </span>
                  <span className="min-w-0 text-xs font-medium leading-4">
                    {stage.name}
                  </span>
                </div>
                {index < stages.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="mx-2 h-px min-w-3 flex-1 bg-border"
                  />
                )}
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
        {job.status === "draft" ? (
          <Card className="h-fit shadow-none">
            <CardHeader className="border-b border-border pb-4">
              <CardTitle>Role preview</CardTitle>
            </CardHeader>
            <CardContent className="py-5">
              <JobRoleDetails
                description={job.description}
                department={job.department}
                location={job.location}
                employmentType={job.employment_type}
                employmentArrangement={job.employment_arrangement}
                workingHours={job.working_hours}
                contractDuration={job.contract_duration}
                remoteEligibility={job.remote_eligibility}
                remoteDetails={job.remote_details}
                salaryVisibility={job.salary_visibility}
                salaryBasis={job.salary_basis}
                workArrangement={job.work_arrangement}
                experienceMinYears={job.experience_min_years}
                seniorityLevel={job.seniority_level}
                positions={job.positions_required}
                salaryMin={job.salary_min}
                salaryMax={job.salary_max}
                currency={job.currency}
                salaryPeriod={job.salary_period}
                deadline={job.deadline_at}
                requirements={job.job_requirements.map(
                  (item: {
                    label: string;
                    description: string | null;
                    requirement_type: string;
                  }) => ({
                    label: item.label,
                    description: item.description,
                    type: item.requirement_type,
                  }),
                )}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none">
            <CardHeader className="border-b pb-4">
              <div>
                <CardTitle>Latest applications</CardTitle>
              </div>
              <ButtonLink
                href={`/app/applications?jobId=${job.id}`}
                variant="ghost"
                size="sm"
              >
                View all
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </ButtonLink>
            </CardHeader>
            <CardContent className="p-0">
              {applicationResult.items.length ? (
                <div className="divide-y">
                  {applicationResult.items.slice(0, 6).map((application) => (
                    <Link
                      key={application.id}
                      href={`/app/applications/${application.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div>
                        <p className="font-medium">
                          {application.candidates?.full_name ?? "Candidate"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Applied{" "}
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(application.submitted_at))}
                        </p>
                      </div>
                      <StatusBadge status={application.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <CaseRoundIcon
                    aria-hidden="true"
                    size={28}
                    className="mx-auto text-muted-foreground"
                  />
                  <p className="mt-4 font-medium">No applications yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {job.status === "draft"
                      ? "Publish this draft to start receiving applications."
                      : "Share the application link to start receiving candidates."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        <div className="flex flex-col gap-5">
          {job.status !== "draft" && (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-semibold tabular-nums">
                      {job.applications?.[0]?.count ?? 0}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Applications received
                    </p>
                  </div>
                  <UsersGroupRoundedIcon
                    aria-hidden="true"
                    size={28}
                    className="text-primary"
                  />
                </div>
                <ul className="mt-5 flex flex-col gap-3">
                  {pipeline.map((stage) => (
                    <li key={stage.status}>
                      <Link
                        href={`/app/applications?jobId=${job.id}&status=${stage.status}`}
                        className="flex items-center justify-between gap-3 text-sm hover:text-primary"
                      >
                        <span className="capitalize">
                          {stage.status.replaceAll("_", " ")}
                        </span>
                        <span className="font-mono text-xs tabular-nums">
                          {stage.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          {job.status === "draft" ? (
            <Card className="shadow-none">
              <CardHeader className="border-b border-border pb-4">
                <CardTitle>Application form</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 py-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Candidate details
                  </span>
                  <span className="font-medium">Standard fields</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    Screening questions
                  </span>
                  <span className="font-medium tabular-nums">
                    {job.job_application_questions.length}
                  </span>
                </div>
                {job.job_application_questions.length > 0 && (
                  <ul className="space-y-2 border-t border-border pt-3 text-xs text-muted-foreground">
                    {job.job_application_questions.map(
                      (question: { id: string; label: string }) => (
                        <li key={question.id} className="line-clamp-2">
                          {question.label}
                        </li>
                      ),
                    )}
                  </ul>
                )}
                <ButtonLink
                  href={`/preview/jobs/${job.id}`}
                  target="_blank"
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Preview application form
                </ButtonLink>
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Role details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-4 text-sm">
                  <div>
                    <dt className="text-muted-foreground">Location</dt>
                    <dd className="mt-1 font-medium">
                      {job.location || "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Working arrangement
                    </dt>
                    <dd className="mt-1 font-medium capitalize">
                      {job.work_arrangement?.replace("_", "-") ||
                        "Not specified"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deadline</dt>
                    <dd className="mt-1 font-mono text-xs">
                      {job.deadline_at
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(job.deadline_at))
                        : "No deadline"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      {collaborators && (
        <JobCollaborators
          agencyId={context.agencyId}
          jobId={id}
          clientId={job.client_id}
          data={collaborators}
        />
      )}
      {job.internalBrief && (
        <section
          className="mt-5 rounded-[10px] border bg-white p-4"
          aria-label="Internal hiring brief"
        >
          <h2 className="text-sm font-semibold">
            Internal hiring brief · agency team only
          </h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            {job.internalBrief.hiring_reason && (
              <div>
                <dt className="text-muted-foreground">Hiring reason</dt>
                <dd className="capitalize">
                  {job.internalBrief.hiring_reason}
                </dd>
              </div>
            )}
            {job.internalBrief.target_start_date && (
              <div>
                <dt className="text-muted-foreground">Target start date</dt>
                <dd>{job.internalBrief.target_start_date}</dd>
              </div>
            )}
            {job.salary_visibility !== "public" &&
              (job.internalBrief.salary_min != null ||
                job.internalBrief.salary_max != null) && (
                <div>
                  <dt className="text-muted-foreground">
                    Internal salary budget
                  </dt>
                  <dd>
                    {job.internalBrief.currency}{" "}
                    {job.internalBrief.salary_min ?? "—"} –{" "}
                    {job.internalBrief.salary_max ?? "—"}{" "}
                    {job.internalBrief.salary_period} ·{" "}
                    {job.salary_basis.replaceAll("_", " ")}
                  </dd>
                </div>
              )}
          </dl>
          {job.internalBrief.sourcing_brief && (
            <p className="mt-3 whitespace-pre-wrap text-sm">
              {job.internalBrief.sourcing_brief}
            </p>
          )}
        </section>
      )}
      {showEdit &&
        clientResult &&
        memberResult &&
        workflowResult &&
        initialDraft && (
          <NewJobDialog
            agencyId={context.agencyId}
            lookupClientId={getCompanyLookupEnv().clientId}
            clients={clientOptions}
            workflows={workflowResult.items.map((workflow) => ({
              id: workflow.id,
              name: workflow.name,
              stages: workflow.workflow_stages,
            }))}
            recruiters={memberResult.items
              .filter((member) => member.status === "active")
              .map((member) => ({
                userId: member.user_id,
                name: member.profile?.full_name ?? "Team member",
                role: member.role,
              }))}
            currentUserId={context.user.id}
            initialClientId={job.client_id}
            initialDraft={initialDraft}
            initialStep={review === "1" ? 4 : 1}
            returnTo={`/app/jobs/${job.id}`}
          />
        )}
    </div>
  );
}

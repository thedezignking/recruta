import { Fragment } from "react";
import Link from "next/link";
import { CaseRoundIcon } from "@solar-icons/react/bold";
import {
  AltArrowRightIcon,
  CalendarIcon,
  CaseMinimalisticIcon,
  MapPointIcon,
  PenIcon,
  SquareTopDownIcon,
} from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { CopyApplicationLink } from "@/components/jobs/copy-application-link";
import { JobLifecycleActions } from "@/components/jobs/job-lifecycle-actions";
import { ButtonLink } from "@/components/shared/button-link";
import { DetailHeader, Panel } from "@/components/shared/page-header";
import { getJobOpenings } from "@/server/services/pipeline";
import { CompanyLogo } from "@/components/organizations/company-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { MatchBadge } from "@/components/applications/match-badge";
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

const stageLabels: Record<string, string> = {
  received: "Received",
  in_review: "In review",
  shortlisted: "Shortlisted",
  client_review: "Client review",
  interview: "Interview",
  offer: "Offer",
  placed: "Placed",
};

function daysUntil(date: Date) {
  return Math.ceil((date.getTime() - Date.now()) / 86_400_000);
}

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
  const [applicationResult, agencyResult, pipeline, openings] =
    await Promise.all([
      listApplications(context.supabase, context.agencyId, { jobId: id }),
      context.supabase
        .from("agencies")
        .select("slug")
        .eq("id", context.agencyId)
        .single(),
      getJobPipeline(context.supabase, context.agencyId, id),
      getJobOpenings(context.supabase, context.agencyId, id),
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

  const applicationCount = job.applications?.[0]?.count ?? 0;
  const pipelineCount = (status: string) =>
    pipeline.find((stage) => stage.status === status)?.count ?? 0;
  const activePipeline = pipeline.filter(
    (stage) => !["rejected", "withdrawn"].includes(stage.status),
  );
  const pipelineMax = Math.max(1, ...activePipeline.map((s) => s.count));
  const closed = pipelineCount("rejected") + pipelineCount("withdrawn");
  const logoUrl = companyProfileSchema.safeParse(job.clients?.company_profile)
    .data?.logoUrl;
  const deadline = job.deadline_at ? new Date(job.deadline_at) : null;
  const daysLeft = deadline ? daysUntil(deadline) : null;
  const formatDate = (value: string | Date) =>
    new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
      new Date(value),
    );
  const stats = [
    {
      label: "Applicants",
      value: applicationCount,
      href: `/app/applications?jobId=${job.id}`,
    },
    {
      label: "In review",
      value: pipelineCount("in_review"),
      href: `/app/applications?jobId=${job.id}&status=in_review`,
    },
    {
      label: "Shortlisted",
      value: pipelineCount("shortlisted"),
      href: `/app/applications?jobId=${job.id}&status=shortlisted`,
    },
    {
      label: "Openings",
      value: job.positions_required,
      hint: `${pipelineCount("placed")} placed`,
    },
  ];
  const roleFacts = [
    ["Department", job.department],
    ["Location", job.location],
    [
      "Workplace",
      job.work_arrangement
        ? job.work_arrangement
            .replace("_", "-")
            .replace(/^./, (c: string) => c.toUpperCase())
        : null,
    ],
    ["Employment", job.employment_type],
    [
      "Seniority",
      job.seniority_level
        ? job.seniority_level.replace(/^./, (c: string) => c.toUpperCase())
        : null,
    ],
    [
      "Experience",
      job.experience_min_years != null
        ? `${job.experience_min_years}+ years`
        : null,
    ],
    ["Deadline", deadline ? formatDate(deadline) : "No deadline"],
  ].filter(([, value]) => value) as [string, string][];

  return (
    <div className="pb-20 lg:pb-0">
      <JobToolbarTitle title={job.title} />
      <DetailHeader
        media={
          <span className="grid size-11 place-items-center overflow-hidden rounded-[10px] border border-border bg-white text-sm font-semibold text-primary">
            {logoUrl ? (
              <CompanyLogo src={logoUrl} />
            ) : (
              (job.clients?.name?.slice(0, 1).toUpperCase() ?? (
                <CaseMinimalisticIcon aria-hidden="true" size={20} />
              ))
            )}
          </span>
        }
        title={job.title}
        status={<StatusBadge status={job.status} />}
        meta={[
          job.clients?.name ? (
            <Link
              href={`/app/clients/${job.client_id}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {job.clients.name}
            </Link>
          ) : null,
          job.location ? (
            <Fragment key="location">
              <MapPointIcon aria-hidden="true" size={14} />
              {job.location}
            </Fragment>
          ) : null,
          job.employment_type ? (
            <Fragment key="type">
              <CaseMinimalisticIcon aria-hidden="true" size={14} />
              {job.employment_type}
            </Fragment>
          ) : null,
          <Fragment key="deadline">
            <CalendarIcon aria-hidden="true" size={14} />
            {deadline
              ? daysLeft !== null && daysLeft >= 0
                ? `Closes ${formatDate(deadline)} · ${daysLeft === 0 ? "today" : `${daysLeft}d left`}`
                : `Closed ${formatDate(deadline)}`
              : "No deadline"}
          </Fragment>,
        ]}
        actions={
          <>
            {canCollaborate && (
              <JobLifecycleActions
                agencyId={context.agencyId}
                jobId={job.id}
                status={job.status}
                source={job.source}
                applicationCount={applicationCount}
              />
            )}
            {canEditDraft && (
              <ButtonLink href={`/app/jobs/${job.id}?edit=1`} variant="outline">
                <PenIcon data-icon="inline-start" aria-hidden="true" />
                Edit draft
              </ButtonLink>
            )}
            {job.status === "draft" && canEditDraft ? (
              <ButtonLink href={`/app/jobs/${job.id}?edit=1&review=1`}>
                Review &amp; publish
              </ButtonLink>
            ) : applicationCount > 0 ? (
              <ButtonLink href={`/app/applications?jobId=${job.id}`}>
                Review applicants
              </ButtonLink>
            ) : null}
          </>
        }
      />

      {job.status === "draft" ? (
        <div className="mt-5 flex items-center gap-3 rounded-[10px] border border-border bg-[#F8F8F8] px-4 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-muted-foreground ring-1 ring-border">
            <PenIcon aria-hidden="true" size={16} />
          </span>
          <div>
            <p className="text-sm font-medium">This job is a draft</p>
            <p className="text-xs text-muted-foreground">
              Candidates cannot apply until you review and publish it.
            </p>
          </div>
        </div>
      ) : (
        <section aria-label="Job summary" className="mt-5">
          <dl className="grid grid-cols-2 overflow-hidden rounded-[10px] border border-border md:grid-cols-4">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`min-w-0 p-4 ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b md:border-b-0" : ""} ${index === 1 ? "md:border-r" : ""} border-border`}
              >
                <dt className="text-xs font-medium text-muted-foreground">
                  {stat.href ? (
                    <Link
                      href={stat.href}
                      className="rounded-sm outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {stat.label}
                    </Link>
                  ) : (
                    stat.label
                  )}
                </dt>
                <dd className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-[24px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
                    {stat.value}
                  </span>
                  {stat.hint && (
                    <span className="text-xs text-muted-foreground">
                      {stat.hint}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          {job.status === "draft" ? (
            <Panel title="Role preview">
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
            </Panel>
          ) : (
            <>
              <Panel
                title="Pipeline"
                actions={
                  closed > 0 ? (
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {closed} closed
                    </span>
                  ) : undefined
                }
              >
                <ol className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
                  {activePipeline.map((stage) => (
                    <li key={stage.status}>
                      <Link
                        href={`/app/applications?jobId=${job.id}&status=${stage.status}`}
                        className="group grid grid-cols-[96px_minmax(0,1fr)_28px] items-center gap-3 rounded-md text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="truncate text-muted-foreground group-hover:text-foreground">
                          {stageLabels[stage.status] ?? stage.status}
                        </span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-[#EFEFEF]">
                          <span
                            className="block h-full rounded-full bg-primary/80 group-hover:bg-primary"
                            style={{
                              width: `${stage.count ? Math.max(4, (stage.count / pipelineMax) * 100) : 0}%`,
                            }}
                          />
                        </span>
                        <span className="text-right font-medium tabular-nums">
                          {stage.count}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel
                title="Latest applications"
                count={applicationCount || undefined}
                bodyClassName="p-0"
                actions={
                  applicationCount > 0 ? (
                    <ButtonLink
                      href={`/app/applications?jobId=${job.id}`}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      View all
                      <AltArrowRightIcon
                        data-icon="inline-end"
                        aria-hidden="true"
                      />
                    </ButtonLink>
                  ) : undefined
                }
              >
                {applicationResult.items.length ? (
                  <ul className="pb-2">
                    {applicationResult.items.slice(0, 6).map((application) => {
                      const name =
                        application.candidates?.full_name ?? "Candidate";
                      return (
                        <li key={application.id}>
                          <Link
                            href={`/app/applications/${application.id}`}
                            className="group flex items-center gap-3 px-4 py-3 outline-none hover:bg-[#F8F9FC] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                          >
                            <span
                              aria-hidden="true"
                              className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EDECFD] text-xs font-semibold text-[#4846B8]"
                            >
                              {name
                                .split(/\s+/)
                                .slice(0, 2)
                                .map((part: string) => part[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium group-hover:text-primary">
                                {name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                Applied {formatDate(application.submitted_at)}
                              </span>
                            </span>
                            <MatchBadge
                              match={application.match}
                              className="hidden sm:inline-flex"
                            />
                            <StatusBadge status={application.status} />
                            <AltArrowRightIcon
                              aria-hidden="true"
                              size={16}
                              className="hidden text-muted-foreground group-hover:text-primary sm:block"
                            />
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-col items-center px-6 py-12 text-center">
                    <span className="grid size-10 place-items-center rounded-[10px] bg-[#F8F8F8] text-muted-foreground ring-1 ring-border">
                      <CaseRoundIcon aria-hidden="true" size={20} />
                    </span>
                    <p className="mt-3 text-sm font-medium">
                      No applications yet
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Share the application link to start receiving candidates.
                    </p>
                  </div>
                )}
              </Panel>
            </>
          )}
          {collaborators && (
            <JobCollaborators
              agencyId={context.agencyId}
              jobId={id}
              clientId={job.client_id}
              data={collaborators}
            />
          )}
        </div>

        <aside className="flex flex-col gap-5" aria-label="Job details">
          {openings && job.status !== "draft" && (
            <Panel
              title="Openings"
              actions={
                <span className="text-xs text-muted-foreground tabular-nums">
                  {Math.min(openings.length, job.positions_required)} of{" "}
                  {job.positions_required} filled
                </span>
              }
            >
              <div
                role="img"
                aria-label={`${openings.length} of ${job.positions_required} openings filled`}
                className="flex h-1.5 gap-0.5 overflow-hidden rounded-full"
              >
                {job.positions_required <= 24 ? (
                  Array.from({ length: job.positions_required }, (_, index) => (
                    <span
                      key={index}
                      className={`flex-1 ${index < openings.length ? "bg-success" : "bg-[#EBEBEB]"}`}
                    />
                  ))
                ) : (
                  <span className="flex-1 bg-[#EBEBEB]">
                    <span
                      className="block h-full bg-success"
                      style={{
                        width: `${Math.min(100, (openings.length / job.positions_required) * 100)}%`,
                      }}
                    />
                  </span>
                )}
              </div>
              {openings.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {openings.map((placement) => (
                    <li
                      key={placement.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <Link
                        href={`/app/applications/${placement.applicationId}`}
                        className="min-w-0 truncate font-medium hover:text-primary"
                      >
                        {placement.candidateName}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {placement.status === "started"
                          ? "Started"
                          : `Starts ${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${placement.startDate}T00:00:00Z`))}`}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">
                  Placements appear here once an offer is accepted.
                </p>
              )}
            </Panel>
          )}
          {applicationUrl && (
            <Panel title="Application link">
              <p className="truncate rounded-md border border-border bg-[#F8F8F8] px-2.5 py-2 font-mono text-[11px] text-muted-foreground">
                {applicationUrl}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <CopyApplicationLink url={applicationUrl} />
                <ButtonLink
                  href={applicationUrl}
                  target="_blank"
                  variant="ghost"
                  size="icon"
                  aria-label="Open public job page"
                  title="Open public job page"
                >
                  <SquareTopDownIcon aria-hidden="true" />
                </ButtonLink>
              </div>
            </Panel>
          )}
          {job.status !== "draft" && (
            <Panel title="Role details">
              <dl className="grid gap-3 text-sm">
                {roleFacts.map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-baseline justify-between gap-4"
                  >
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-right text-xs font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          )}
          {stages.length > 0 && (
            <Panel
              title="Hiring workflow"
              actions={
                <span className="text-xs text-muted-foreground">
                  {stages.length} stages
                </span>
              }
            >
              <ol
                aria-label="Configured recruitment stages"
                className="relative flex flex-col gap-2.5"
              >
                <span
                  aria-hidden="true"
                  className="absolute top-2 bottom-2 left-[9px] w-px bg-border"
                />
                {stages.map((stage, index) => (
                  <li
                    key={stage.id}
                    className="relative flex items-center gap-3 text-xs"
                  >
                    <span className="grid size-[19px] shrink-0 place-items-center rounded-full border border-border bg-white text-[10px] font-semibold tabular-nums text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="font-medium">{stage.name}</span>
                  </li>
                ))}
              </ol>
            </Panel>
          )}
          <Panel title="Application form">
            <dl className="grid gap-3 text-xs">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Candidate details</dt>
                <dd className="font-medium">Standard fields</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">Screening questions</dt>
                <dd className="font-medium tabular-nums">
                  {job.job_application_questions.length}
                </dd>
              </div>
            </dl>
            {job.job_application_questions.length > 0 && (
              <ol className="mt-3 flex list-decimal flex-col gap-1.5 pl-4 text-xs text-muted-foreground">
                {job.job_application_questions.map(
                  (question: { id: string; label: string }) => (
                    <li key={question.id} className="line-clamp-2 pl-1">
                      {question.label}
                    </li>
                  ),
                )}
              </ol>
            )}
            <ButtonLink
              href={`/preview/jobs/${job.id}`}
              target="_blank"
              size="sm"
              variant="outline"
              className="mt-4 w-full"
            >
              Preview application form
            </ButtonLink>
          </Panel>
          {job.internalBrief && (
            <Panel title="Internal brief">
              <p className="-mt-1 mb-3 text-[11px] text-muted-foreground">
                Agency team only
              </p>
              <dl className="grid gap-3 text-xs">
                {job.internalBrief.hiring_reason && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Hiring reason</dt>
                    <dd className="text-right font-medium capitalize">
                      {job.internalBrief.hiring_reason}
                    </dd>
                  </div>
                )}
                {job.internalBrief.target_start_date && (
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-muted-foreground">Target start</dt>
                    <dd className="text-right font-medium">
                      {job.internalBrief.target_start_date}
                    </dd>
                  </div>
                )}
                {job.salary_visibility !== "public" &&
                  (job.internalBrief.salary_min != null ||
                    job.internalBrief.salary_max != null) && (
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-muted-foreground">Salary budget</dt>
                      <dd className="text-right font-medium">
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
                <p className="mt-3 whitespace-pre-wrap text-xs leading-5">
                  {job.internalBrief.sourcing_brief}
                </p>
              )}
            </Panel>
          )}
        </aside>
      </div>
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

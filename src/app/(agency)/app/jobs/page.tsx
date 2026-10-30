import Link from "next/link";
import { CaseRoundIcon } from "@solar-icons/react/bold";
import {
  AddIcon,
  CaseMinimalisticIcon,
  ClipboardCheckIcon,
  ClockCircleIcon,
  UsersGroupTwoRoundedIcon,
  AltArrowRightIcon,
  FilterIcon,
  MagnifierIcon,
  CheckIcon,
} from "@solar-icons/react/linear";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/shared/button-link";
import { NewJobDialog } from "@/components/jobs/new-job-dialog";
import { JobSidePanel } from "@/components/jobs/job-side-panel";
import { MetricStrip } from "@/components/overview/metric-strip";
import { OverviewRangeFilter } from "@/components/overview/overview-range-filter";
import { CompanyLogo } from "@/components/organizations/company-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getJob,
  getJobReviewProgress,
  getJobsActivity,
  getJobsListSummary,
  listJobs,
} from "@/server/services/jobs";
import { parseOverviewRange } from "@/lib/overview-range";
import { getJobPipeline } from "@/server/services/applications";
import { listClients } from "@/server/services/clients";
import { getCompanyLookupEnv } from "@/lib/env";
import { companyProfileSchema } from "@/lib/organization";
import {
  listAgencyMembers,
  listWorkflowTemplates,
} from "@/server/services/workspace";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{
    new?: string;
    clientId?: string;
    job?: string;
    status?: string;
    q?: string;
    cursor?: string;
    range?: string;
    due?: string;
    assignee?: string;
  }>;
}) {
  const {
    new: newJob,
    clientId,
    job: selectedJobId,
    status: rawStatus,
    q: rawQuery,
    cursor,
    range: rawRange,
    due: rawDue,
    assignee: rawAssignee,
  } = await searchParams;
  const range = parseOverviewRange(rawRange);
  const closingSoon = rawDue === "soon";
  const unassigned = rawAssignee === "unassigned";
  const showNewJob = newJob === "1";
  const status = ["open", "draft", "on_hold", "filled"].includes(
    rawStatus ?? "",
  )
    ? rawStatus
    : undefined;
  const query =
    typeof rawQuery === "string" ? rawQuery.trim().slice(0, 100) : "";
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [
    jobResult,
    summary,
    activity,
    memberResult,
    clientResult,
    workflowResult,
    selectedJob,
  ] = await Promise.all([
    listJobs(
      context.supabase,
      { agencyId: context.agencyId, status, query, closingSoon, unassigned },
      cursor,
    ),
    getJobsListSummary(context.supabase, context.agencyId),
    getJobsActivity(context.supabase, context.agencyId, range),
    listAgencyMembers(context.supabase, context.agencyId),
    showNewJob
      ? listClients(context.supabase, context.agencyId)
      : Promise.resolve(null),
    showNewJob
      ? listWorkflowTemplates(context.supabase, context.agencyId)
      : Promise.resolve(null),
    selectedJobId
      ? getJob(context.supabase, selectedJobId).catch(() => null)
      : Promise.resolve(null),
  ]);
  const reviewProgress = await getJobReviewProgress(
    context.supabase,
    context.agencyId,
    jobResult.items.map((job) => job.id),
  );
  const panelJob =
    selectedJob?.agency_id === context.agencyId ? selectedJob : null;
  const pipeline = panelJob
    ? await getJobPipeline(context.supabase, context.agencyId, panelJob.id)
    : [];
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
    showNewJob &&
    clientId &&
    !clientOptions.some((item) => item.id === clientId)
  ) {
    const { data } = await context.supabase
      .from("clients")
      .select("id,name,website,location,company_profile")
      .eq("agency_id", context.agencyId)
      .eq("id", clientId)
      .neq("status", "archived")
      .maybeSingle();
    if (data)
      clientOptions.unshift({
        id: data.id,
        name: data.name,
        website: data.website ?? undefined,
        location: data.location ?? undefined,
        logoUrl:
          companyProfileSchema.safeParse(data.company_profile).data?.logoUrl ||
          undefined,
      });
  }
  const memberNames = new Map(
    memberResult.items
      .filter((member) => member.status === "active")
      .map((member) => [
        member.user_id,
        member.profile?.full_name ?? "Team member",
      ]),
  );
  const listHref = (
    next: {
      status?: string;
      job?: string;
      cursor?: string;
      q?: string;
      due?: string;
      assignee?: string;
    } = {},
  ) => {
    const params = new URLSearchParams();
    if (next.status) params.set("status", next.status);
    if (next.q) params.set("q", next.q);
    if (next.cursor) params.set("cursor", next.cursor);
    if (next.job) params.set("job", next.job);
    if (range !== "30d") params.set("range", range);
    if ((next.due ?? (closingSoon ? "soon" : "")) === "soon")
      params.set("due", "soon");
    if ((next.assignee ?? (unassigned ? "unassigned" : "")) === "unassigned")
      params.set("assignee", "unassigned");
    return `/app/jobs${params.size ? `?${params}` : ""}`;
  };
  const baseHref = listHref({ status, q: query, cursor });
  const filterTabs = [
    { label: "All jobs", value: undefined, count: summary.all },
    { label: "Open", value: "open", count: summary.open },
    { label: "Draft", value: "draft", count: summary.draft },
    { label: "On hold", value: "on_hold", count: summary.onHold },
    { label: "Filled", value: "filled", count: summary.filled },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <div className="mb-5 flex justify-end lg:hidden">
        <ButtonLink href="/app/jobs?new=1">
          <AddIcon data-icon="inline-start" aria-hidden="true" />
          New job
        </ButtonLink>
      </div>
      <section aria-label="Jobs at a glance" className="mb-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
            Job activity
          </h2>
          <OverviewRangeFilter value={range} path="/app/jobs" />
        </div>
        <MetricStrip
          idPrefix="jobs-summary"
          range={range}
          periods={activity.periods}
          comparisonLabel={activity.comparisonLabel}
          metrics={[
            {
              label: "Open jobs",
              value: activity.counts.open,
              previous: activity.previous.open,
              trend: activity.series.open,
              activityLabel: "Open jobs created",
              icon: CaseMinimalisticIcon,
              href: listHref({ status: "open" }),
              color: "text-[#3b82f6]",
              iconSurface: "bg-[#3577e8]",
            },
            {
              label: "Positions to fill",
              value: activity.counts.positions,
              previous: activity.previous.positions,
              trend: activity.series.positions,
              activityLabel: "Open positions created",
              icon: UsersGroupTwoRoundedIcon,
              href: listHref({ status: "open" }),
              color: "text-[#a468e8]",
              iconSurface: "bg-[#9360db]",
            },
            {
              label: "Near deadline",
              value: activity.counts.nearDeadline,
              previous: activity.previous.nearDeadline,
              trend: activity.series.nearDeadline,
              activityLabel: "Jobs due within 7 days",
              icon: ClockCircleIcon,
              href: listHref({ due: "soon" }),
              color: "text-[#ec8a71]",
              iconSurface: "bg-[#e77962]",
            },
            {
              label: "Filled",
              value: activity.counts.filled,
              previous: activity.previous.filled,
              trend: activity.series.filled,
              activityLabel: "Filled jobs created",
              icon: ClipboardCheckIcon,
              href: listHref({ status: "filled", due: "" }),
              color: "text-[#42bd86]",
              iconSurface: "bg-[#29a970]",
            },
          ]}
        />
      </section>
      <Card className="gap-0 overflow-visible py-0 shadow-none">
        <CardContent className="p-0">
          <div className="flex flex-col gap-2 border-b border-border px-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div
              role="group"
              aria-label="Job status"
              className="flex gap-1 overflow-x-auto"
            >
              {filterTabs.map((tab) => (
                <Link
                  key={tab.label}
                  aria-current={status === tab.value ? "page" : undefined}
                  href={listHref({
                    status: tab.value,
                    q: query,
                    due: tab.value && tab.value !== "open" ? "" : undefined,
                  })}
                  className={`inline-flex h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-xs ${status === tab.value ? "border-primary font-semibold text-primary" : "border-transparent font-medium text-muted-foreground hover:text-foreground"}`}
                >
                  {tab.label}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${status === tab.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  >
                    {tab.count}
                  </span>
                </Link>
              ))}
            </div>
            <div className="relative mb-2 flex items-center gap-2">
              <form
                method="get"
                action="/app/jobs"
                className="relative w-full sm:w-52"
              >
                {status && <input type="hidden" name="status" value={status} />}
                {range !== "30d" && (
                  <input type="hidden" name="range" value={range} />
                )}
                {closingSoon && <input type="hidden" name="due" value="soon" />}
                {unassigned && (
                  <input type="hidden" name="assignee" value="unassigned" />
                )}
                <MagnifierIcon
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  name="q"
                  defaultValue={query}
                  aria-label="Search jobs"
                  placeholder="Search jobs"
                  className="h-8 w-full rounded-md border border-border bg-[#F8F8F8] pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </form>
              <details className="group/filter relative z-30 shrink-0">
                <summary
                  className={`flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-md border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden ${closingSoon || unassigned ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-white text-foreground"}`}
                >
                  <FilterIcon size={15} aria-hidden="true" /> Filter
                  {(closingSoon || unassigned) && (
                    <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-white">
                      {Number(closingSoon) + Number(unassigned)}
                    </span>
                  )}
                </summary>
                <div className="absolute top-full right-0 mt-2 w-56 rounded-[10px] border border-border bg-white p-2 text-xs shadow-[0_12px_32px_rgb(17_17_17_/_0.12)]">
                  <div className="mb-1 flex items-center justify-between px-2 py-1.5">
                    <span className="font-semibold text-foreground">
                      Filter jobs
                    </span>
                    {(closingSoon || unassigned) && (
                      <Link
                        href={listHref({
                          status,
                          q: query,
                          due: "",
                          assignee: "",
                        })}
                        className="font-medium text-primary hover:underline"
                      >
                        Clear
                      </Link>
                    )}
                  </div>
                  <p className="px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground">
                    Deadline
                  </p>
                  <Link
                    href={listHref({ status, q: query, due: "" })}
                    aria-current={!closingSoon ? "true" : undefined}
                    className={`flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted ${!closingSoon ? "bg-primary/5 font-semibold text-primary" : ""}`}
                  >
                    All deadlines
                    {!closingSoon && <CheckIcon size={14} aria-hidden="true" />}
                  </Link>
                  <Link
                    href={listHref({ status, q: query, due: "soon" })}
                    aria-current={closingSoon ? "true" : undefined}
                    className={`flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted ${closingSoon ? "bg-primary/5 font-semibold text-primary" : ""}`}
                  >
                    Closing in 7 days
                    {closingSoon && <CheckIcon size={14} aria-hidden="true" />}
                  </Link>
                  <p className="mt-1 px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground">
                    Recruiter
                  </p>
                  <Link
                    href={listHref({ status, q: query, assignee: "" })}
                    aria-current={!unassigned ? "true" : undefined}
                    className={`flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted ${!unassigned ? "bg-primary/5 font-semibold text-primary" : ""}`}
                  >
                    All recruiters
                    {!unassigned && <CheckIcon size={14} aria-hidden="true" />}
                  </Link>
                  <Link
                    href={listHref({
                      status,
                      q: query,
                      assignee: "unassigned",
                    })}
                    aria-current={unassigned ? "true" : undefined}
                    className={`flex items-center justify-between rounded-md px-2 py-2 hover:bg-muted ${unassigned ? "bg-primary/5 font-semibold text-primary" : ""}`}
                  >
                    Unassigned
                    {unassigned && <CheckIcon size={14} aria-hidden="true" />}
                  </Link>
                </div>
              </details>
            </div>
          </div>
          {jobResult.items.length ? (
            <Table className="min-w-[1080px] [&_td]:px-3 [&_td]:py-3 [&_th]:px-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Job</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Lead recruiter
                  </TableHead>
                  <TableHead>Applicants</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Review progress
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Openings
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Deadline
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Open details</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobResult.items.map((job) => (
                  <TableRow
                    key={job.id}
                    className={`group relative hover:bg-[#F8F9FC] ${panelJob?.id === job.id ? "bg-primary/[0.045]" : ""}`}
                  >
                    <TableCell className="pl-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-[#F8F8F8] text-primary">
                          <CaseMinimalisticIcon size={17} aria-hidden="true" />
                        </span>
                        <span className="min-w-0">
                          <Link
                            href={listHref({
                              status,
                              q: query,
                              cursor,
                              job: job.id,
                            })}
                            className="font-medium after:absolute after:inset-0 focus-visible:underline"
                          >
                            {job.title}
                          </Link>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {[job.employment_type, job.location]
                              .filter(Boolean)
                              .join(" · ") || "Role details not set"}
                          </span>
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 text-xs font-medium">
                        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white text-xs font-semibold text-primary">
                          {companyProfileSchema.safeParse(
                            job.clients?.company_profile,
                          ).data?.logoUrl ? (
                            <CompanyLogo
                              src={
                                companyProfileSchema.parse(
                                  job.clients?.company_profile,
                                ).logoUrl!
                              }
                            />
                          ) : (
                            (job.clients?.name?.slice(0, 1).toUpperCase() ??
                            "?")
                          )}
                        </span>
                        <span className="max-w-32 truncate">
                          {job.clients?.name ?? "—"}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="flex items-center gap-2 text-xs">
                        <span className="grid size-6 place-items-center rounded-full bg-[#EDECFD] text-[10px] font-semibold text-[#4846B8]">
                          {(job.primary_recruiter_id
                            ? memberNames.get(job.primary_recruiter_id)
                            : null
                          )
                            ?.split(" ")
                            .map((part: string) => part[0])
                            .slice(0, 2)
                            .join("") || "—"}
                        </span>
                        {job.primary_recruiter_id
                          ? (memberNames.get(job.primary_recruiter_id) ??
                            "Assigned recruiter")
                          : "Unassigned"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {job.applications?.[0]?.count ?? 0}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div
                        className="flex items-center gap-2"
                        aria-label={`${reviewProgress.get(job.id) ?? 0} of ${job.applications?.[0]?.count ?? 0} applications reviewed`}
                      >
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E8E8E8]">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{
                              width: `${job.applications?.[0]?.count ? Math.min(100, ((reviewProgress.get(job.id) ?? 0) / job.applications[0].count) * 100) : 0}%`,
                            }}
                          />
                        </span>
                        <span className="text-[11px] tabular-nums text-muted-foreground">
                          {reviewProgress.get(job.id) ?? 0}/
                          {job.applications?.[0]?.count ?? 0}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-xs tabular-nums lg:table-cell">
                      {job.positions_required}
                    </TableCell>
                    <TableCell className="hidden text-xs lg:table-cell">
                      {job.deadline_at
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(job.deadline_at))
                        : "No deadline"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell>
                      <AltArrowRightIcon
                        size={16}
                        className="text-muted-foreground group-hover:text-primary"
                        aria-hidden="true"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CaseRoundIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {summary.all ? "No matching jobs" : "No jobs yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {summary.all
                    ? "Try another status or search term."
                    : "Create a job to start receiving applications."}
                </EmptyDescription>
              </EmptyHeader>
              <ButtonLink href="/app/jobs?new=1" variant="outline">
                <AddIcon data-icon="inline-start" aria-hidden="true" />
                Create your first job
              </ButtonLink>
            </Empty>
          )}
          {jobResult.nextCursor && (
            <div className="border-t border-border px-4 py-3 text-center">
              <Link
                href={listHref({
                  status,
                  q: query,
                  cursor: jobResult.nextCursor,
                })}
                className="text-sm font-medium text-primary hover:underline"
              >
                Next page
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
      {panelJob && (
        <JobSidePanel
          job={panelJob}
          pipeline={pipeline}
          returnHref={baseHref}
          canEditDraft={
            context.role !== "recruiter" ||
            panelJob.job_assignments.some(
              (assignment: { user_id: string }) =>
                assignment.user_id === context.user.id,
            )
          }
        />
      )}
      {showNewJob && (
        <NewJobDialog
          agencyId={context.agencyId}
          lookupClientId={getCompanyLookupEnv().clientId}
          clients={clientOptions}
          workflows={
            workflowResult?.items.map((workflow) => ({
              id: workflow.id,
              name: workflow.name,
              stages: workflow.workflow_stages,
            })) ?? []
          }
          recruiters={memberResult.items
            .filter((member) => member.status === "active")
            .map((member) => ({
              userId: member.user_id,
              name: member.profile?.full_name ?? "Team member",
              role: member.role,
            }))}
          currentUserId={context.user.id}
          initialClientId={clientId}
        />
      )}
    </div>
  );
}

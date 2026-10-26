import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear/add";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { CaseMinimalisticIcon as CaseRoundIcon } from "@solar-icons/react/linear/case-minimalistic";
import { ClipboardCheckIcon } from "@solar-icons/react/linear/clipboard-check";
import { InboxIcon } from "@solar-icons/react/linear/inbox";
import { LinkMinimalisticIcon } from "@solar-icons/react/linear/link-minimalistic";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { CaseRoundIcon as CaseSolidIcon } from "@solar-icons/react/bold/case-round";
import { InboxIcon as InboxSolidIcon } from "@solar-icons/react/bold/inbox";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import type { getWorkspaceOverview } from "@/server/services/overview";
import type { listJobs } from "@/server/services/jobs";
import { OverviewRangeFilter } from "./overview-range-filter";
import type { OverviewRange } from "@/lib/overview-range";
import {
  AttentionQueue,
  type AttentionItem,
} from "@/components/applications/attention-queue";

type Overview = Awaited<ReturnType<typeof getWorkspaceOverview>>;
type Jobs = Awaited<ReturnType<typeof listJobs>>["items"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function WorkspaceOverview({
  overview,
  jobs,
  timezone,
  range = "30d",
  attention = [],
}: {
  overview: Overview;
  jobs: Jobs;
  timezone: string;
  range?: OverviewRange;
  attention?: AttentionItem[];
}) {
  const shareableJob = jobs.find(
    (job) =>
      job.status === "open" && job.published_at && job.accepting_applications,
  );
  const draftJob = jobs.find((job) => job.status === "draft");
  const metrics = [
    {
      label: "Active jobs",
      value: overview.summaryCounts.openJobs,
      icon: CaseRoundIcon,
      href: "/app/jobs",
    },
    {
      label: "Applications received",
      value: overview.summaryCounts.applicationsReceived,
      icon: InboxIcon,
      href: "/app/applications",
    },
    {
      label: "In review",
      value: overview.summaryCounts.inReview,
      icon: DocumentTextIcon,
      href: "/app/applications?status=in_review",
    },
    {
      label: "Shortlisted",
      value: overview.summaryCounts.shortlisted,
      icon: ClipboardCheckIcon,
      href: "/app/applications?status=shortlisted",
    },
  ];

  return (
    <div className="pb-20 lg:pb-2">
      <PageHeader
        title="Overview"
        actions={
          <>
            <OverviewRangeFilter value={range} />
            <ButtonLink href="/app/jobs/new">
              <AddIcon data-icon="inline-start" aria-hidden="true" />
              New job
            </ButtonLink>
          </>
        }
      />

      <section
        aria-label="Recruitment summary"
        className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            aria-label={`View all ${label.toLowerCase()}`}
            aria-describedby={`summary-${label.toLowerCase().replaceAll(" ", "-")}-count summary-period`}
            className="group min-w-0"
          >
            <Card className="h-full gap-3 py-4 group-hover:ring-input">
              <CardHeader className="flex items-start justify-between gap-2 px-3 sm:px-5">
                <p className="min-h-8 text-[11px] font-medium text-muted-foreground sm:min-h-0 sm:text-xs">
                  {label}
                </p>
                <Icon
                  aria-hidden="true"
                  size={18}
                  strokeWidth={1.6}
                  className="hidden text-muted-foreground sm:block"
                />
              </CardHeader>
              <CardContent className="px-3 sm:px-5">
                <p
                  id={`summary-${label.toLowerCase().replaceAll(" ", "-")}-count`}
                  className="text-[26px] leading-none font-medium tracking-[-0.05em] tabular-nums sm:text-[32px]"
                >
                  {value}
                  <AltArrowRightIcon
                    aria-hidden="true"
                    size={16}
                    className="ml-3 hidden text-muted-foreground opacity-0 group-hover:opacity-100 sm:inline"
                  />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
      <p id="summary-period" className="sr-only">
        Summary counts use application received dates and job created dates. In
        review counts only submissions currently in the review stage. Queues
        below show all work.
      </p>

      <div className="mt-7 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Recent jobs</CardTitle>
              </div>
              <CardAction>
                <ButtonLink href="/app/jobs" variant="ghost" size="sm">
                  View jobs
                  <AltArrowRightIcon
                    data-icon="inline-end"
                    aria-hidden="true"
                  />
                </ButtonLink>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {jobs.length ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Openings</TableHead>
                      <TableHead>Applicants</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <span className="sr-only">Open job</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell>
                          <Link
                            href={`/app/jobs/${job.id}`}
                            className="group flex items-center gap-3"
                          >
                            <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-muted/70 text-muted-foreground">
                              <CaseRoundIcon
                                aria-hidden="true"
                                size={18}
                                strokeWidth={1.6}
                              />
                            </span>
                            <div>
                              <p className="font-medium group-hover:text-primary">
                                {job.title}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {job.clients?.name ?? "Organization"}
                              </p>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {job.positions_required}
                          <span className="ml-1 text-xs text-muted-foreground">
                            {job.positions_required === 1
                              ? "position"
                              : "positions"}
                          </span>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {job.applications?.[0]?.count ?? 0}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell>
                          <ButtonLink
                            href={`/app/jobs/${job.id}`}
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Open ${job.title}`}
                            title={`Open ${job.title}`}
                          >
                            <AltArrowRightIcon aria-hidden="true" />
                          </ButtonLink>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Empty className="min-h-64">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <CaseSolidIcon aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No jobs yet</EmptyTitle>
                    <EmptyDescription>
                      Create a job to start receiving applications.
                    </EmptyDescription>
                  </EmptyHeader>
                  <ButtonLink href="/app/jobs/new" variant="outline">
                    <AddIcon data-icon="inline-start" aria-hidden="true" />
                    Open your first job
                  </ButtonLink>
                </Empty>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Latest applications</CardTitle>
                <Badge variant="secondary">
                  {overview.applications.length}
                </Badge>
              </div>
              <CardAction>
                <ButtonLink href="/app/applications" variant="ghost" size="sm">
                  Open inbox
                  <AltArrowRightIcon
                    data-icon="inline-end"
                    aria-hidden="true"
                  />
                </ButtonLink>
              </CardAction>
            </CardHeader>
            <CardContent className="px-0">
              {overview.applications.length ? (
                <div className="divide-y divide-border">
                  {overview.applications.map((application) => (
                    <Link
                      key={application.id}
                      href={`/app/applications/${application.id}`}
                      className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-muted/60"
                    >
                      <Avatar>
                        <AvatarFallback>
                          {initials(
                            application.candidates?.full_name ?? "Candidate",
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {application.candidates?.full_name ?? "Candidate"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {application.jobs?.title} ·{" "}
                          {application.jobs?.clients?.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={application.status} />
                        <time
                          dateTime={application.submitted_at}
                          className="hidden text-xs text-muted-foreground sm:block"
                        >
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                            timeZone: timezone,
                          }).format(new Date(application.submitted_at))}
                        </time>
                        <AltArrowRightIcon
                          aria-hidden="true"
                          size={15}
                          className="text-muted-foreground"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <Empty className="min-h-48">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <InboxSolidIcon aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>No applications yet</EmptyTitle>
                    <EmptyDescription>
                      Publish a job and share its application link.
                    </EmptyDescription>
                  </EmptyHeader>
                  <ButtonLink href="/app/jobs" variant="ghost" size="sm">
                    Find a job to share
                    <AltArrowRightIcon
                      data-icon="inline-end"
                      aria-hidden="true"
                    />
                  </ButtonLink>
                </Empty>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <AttentionQueue items={attention} />
          <Card>
            <CardHeader>
              <CardTitle>Up next</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1 px-2">
              <Link
                href="/app/applications"
                className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <InboxIcon aria-hidden="true" size={17} />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-medium">
                    {overview.counts.applicationsToReview
                      ? `Review ${overview.counts.applicationsToReview} ${overview.counts.applicationsToReview === 1 ? "application" : "applications"}`
                      : "Open application inbox"}
                  </p>
                </div>
                <AltArrowRightIcon
                  aria-hidden="true"
                  size={14}
                  className="text-muted-foreground"
                />
              </Link>
              <Link
                href={
                  shareableJob
                    ? `/app/jobs/${shareableJob.id}`
                    : draftJob
                      ? `/app/jobs/${draftJob.id}`
                      : "/app/jobs/new"
                }
                className="group flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                  <LinkMinimalisticIcon aria-hidden="true" size={17} />
                </span>
                <div className="flex-1">
                  <p className="text-[13px] font-medium">
                    {shareableJob
                      ? "Share application link"
                      : draftJob
                        ? "Finish your draft job"
                        : "Open your next role"}
                  </p>
                </div>
                <AltArrowRightIcon
                  aria-hidden="true"
                  size={14}
                  className="text-muted-foreground"
                />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Hiring requests</CardTitle>
                {overview.requests.length > 0 && (
                  <Badge variant="secondary">
                    {overview.counts.activeRequests}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {overview.requests.length ? (
                <div className="divide-y divide-border">
                  {overview.requests.slice(0, 3).map((request) => (
                    <Link
                      key={request.id}
                      href={`/app/requests/${request.id}`}
                      className="block px-5 py-4 hover:bg-muted/60"
                    >
                      <p className="text-sm font-medium">{request.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.clients?.name} · {request.positions_required}{" "}
                        {request.positions_required === 1
                          ? "opening"
                          : "openings"}
                      </p>
                      <div className="mt-3">
                        <StatusBadge status={request.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-5 pb-1">
                  <p className="text-xs leading-6 text-muted-foreground">
                    No active requests.
                  </p>
                </div>
              )}
              <div className="px-3 pt-2">
                <ButtonLink href="/app/requests" variant="ghost" size="sm">
                  View requests
                  <ArrowRightUpIcon data-icon="inline-end" aria-hidden="true" />
                </ButtonLink>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

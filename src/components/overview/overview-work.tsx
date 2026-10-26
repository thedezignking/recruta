import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear/add";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { CaseMinimalisticIcon } from "@solar-icons/react/linear/case-minimalistic";
import { CaseRoundIcon } from "@solar-icons/react/bold/case-round";
import { ButtonLink } from "@/components/shared/button-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { CopyApplicationLink } from "@/components/jobs/copy-application-link";
import {
  AttentionQueue,
  type AttentionItem,
} from "@/components/applications/attention-queue";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardContent,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import type {
  getWorkspaceOverview,
  getOverviewJobs,
} from "@/server/services/overview";
import type { AgencyRole } from "@/types/domain";

export type OverviewWorkProps = {
  overview: Awaited<ReturnType<typeof getWorkspaceOverview>>;
  work: Awaited<ReturnType<typeof getOverviewJobs>>;
  attention: AttentionItem[];
  role: AgencyRole;
  timezone: string;
  applicationBaseUrl: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function OverviewWork({
  overview,
  work,
  attention,
  role,
  timezone,
  applicationBaseUrl,
}: OverviewWorkProps) {
  const requests = role === "recruiter" ? [] : overview.requests;
  const firstJob = work.totalJobs === 0 && role !== "recruiter";
  const showInbox =
    work.publishedJobs > 0 || overview.counts.applicationsReceived > 0;
  return (
    <div className="mt-7 flex flex-col gap-6">
      {attention.length > 0 && (
        <section aria-label="Needs attention">
          <AttentionQueue items={attention} limit={4} />
        </section>
      )}
      <div
        className={`grid items-start gap-6 ${requests.length ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1"}`}
      >
        <div className="flex min-w-0 flex-col gap-6">
          {showInbox && (
            <section aria-label="Application inbox">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle>Application inbox</CardTitle>
                    {overview.counts.applicationsToReview > 0 && (
                      <Badge
                        variant="secondary"
                        aria-label={`${overview.counts.applicationsToReview} applications in the inbox`}
                      >
                        {overview.counts.applicationsToReview}
                      </Badge>
                    )}
                  </div>
                  <CardAction>
                    <ButtonLink
                      href="/app/applications"
                      variant="ghost"
                      size="sm"
                    >
                      Open inbox
                      <AltArrowRightIcon
                        data-icon="inline-end"
                        aria-hidden="true"
                      />
                    </ButtonLink>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  {overview.applications.length > 0 ? (
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
                                application.candidates?.full_name ??
                                  "Candidate",
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
                            <AltArrowRightIcon aria-hidden="true" size={15} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-3 px-5 pb-5">
                      <div>
                        <p className="text-sm font-medium">
                          {overview.counts.applicationsReceived === 0 &&
                          work.shareable
                            ? "Waiting for applications"
                            : "No applications waiting for review"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {overview.counts.applicationsReceived === 0 &&
                          work.shareable
                            ? `Share the application link for ${work.shareable.title}.`
                            : "New applications will appear here."}
                        </p>
                      </div>
                      {overview.counts.applicationsReceived === 0 &&
                        work.shareable && (
                          <CopyApplicationLink
                            url={`${applicationBaseUrl}/jobs/${work.shareable.public_slug}`}
                          />
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          )}
          <section aria-label={firstJob ? "Start hiring" : "Active jobs"}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {firstJob ? "Start hiring" : "Active jobs"}
                </CardTitle>
                {work.totalJobs > 0 && (
                  <CardAction>
                    <ButtonLink href="/app/jobs" variant="ghost" size="sm">
                      View jobs
                      <AltArrowRightIcon
                        data-icon="inline-end"
                        aria-hidden="true"
                      />
                    </ButtonLink>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent className="px-0">
                {work.activeJobs.length > 0 ? (
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
                      {work.activeJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell>
                            <Link
                              href={`/app/jobs/${job.id}`}
                              className="group flex items-center gap-3"
                            >
                              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                                <CaseMinimalisticIcon
                                  aria-hidden="true"
                                  size={18}
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
                ) : firstJob ? (
                  <Empty className="py-10 sm:py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <CaseRoundIcon aria-hidden="true" />
                      </EmptyMedia>
                      <EmptyTitle>Open your first job</EmptyTitle>
                      <EmptyDescription>
                        Choose an organization or create one while opening a
                        job.
                      </EmptyDescription>
                    </EmptyHeader>
                    <ButtonLink href="/app/jobs/new" variant="outline">
                      <AddIcon data-icon="inline-start" aria-hidden="true" />
                      Create job
                    </ButtonLink>
                  </Empty>
                ) : (
                  <div className="px-5 pb-5">
                    <p className="text-sm font-medium">
                      {work.draft
                        ? "Your draft is ready to continue"
                        : role === "recruiter" && work.totalJobs === 0
                          ? "No jobs assigned to you"
                          : "No active jobs"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {work.draft
                        ? "Publish it when you're ready to receive applications."
                        : role === "recruiter" && work.totalJobs === 0
                          ? "Ask your manager for an assignment, or open a job."
                          : "Open a job when your next hiring assignment is ready."}
                    </p>
                  </div>
                )}
                {work.draft && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Draft</p>
                      <p className="mt-1 text-sm font-medium">
                        {work.draft.title}
                      </p>
                    </div>
                    <ButtonLink
                      href={`/app/jobs/${work.draft.id}`}
                      variant="outline"
                      size="sm"
                    >
                      Continue draft
                      <AltArrowRightIcon
                        data-icon="inline-end"
                        aria-hidden="true"
                      />
                    </ButtonLink>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>
        </div>
        {requests.length > 0 && (
          <section aria-label="Hiring requests">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Hiring requests</CardTitle>
                  <Badge variant="secondary">
                    {overview.counts.activeRequests}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                <div className="divide-y divide-border">
                  {requests.slice(0, 3).map((request) => (
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
                <div className="px-3 pt-2">
                  <ButtonLink href="/app/requests" variant="ghost" size="sm">
                    View requests
                    <AltArrowRightIcon
                      data-icon="inline-end"
                      aria-hidden="true"
                    />
                  </ButtonLink>
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}

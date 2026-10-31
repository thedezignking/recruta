import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear/add";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { CaseMinimalisticIcon } from "@solar-icons/react/linear/case-minimalistic";
import { CaseRoundIcon } from "@solar-icons/react/bold/case-round";
import { ButtonLink } from "@/components/shared/button-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { MatchBadge } from "@/components/applications/match-badge";
import { SectionHeader } from "@/components/shared/page-header";
import { CompanyLogo } from "@/components/organizations/company-picker";
import { companyProfileSchema } from "@/lib/organization";
import { CopyApplicationLink } from "@/components/jobs/copy-application-link";
import type { AttentionItem } from "@/components/applications/attention-queue";
import { AttentionBanner } from "@/components/applications/attention-banner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  reviewProgress?: Map<string, number>;
  agencyId: string;
  userId: string;
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


function ViewAllLink({ href }: { href: string }) {
  return (
    <ButtonLink
      href={href}
      variant="ghost"
      size="sm"
      className="text-muted-foreground hover:text-foreground"
    >
      View all
      <AltArrowRightIcon data-icon="inline-end" aria-hidden="true" />
    </ButtonLink>
  );
}

export function OverviewWork({
  overview,
  work,
  attention,
  role,
  timezone,
  applicationBaseUrl,
  reviewProgress,
  agencyId,
  userId,
}: OverviewWorkProps) {
  const requests = role === "recruiter" ? [] : overview.requests;
  const firstJob = work.totalJobs === 0 && role !== "recruiter";
  const showInbox =
    work.publishedJobs > 0 || overview.counts.applicationsReceived > 0;
  return (
    <div className="mt-5 flex flex-col gap-4">
      {attention.length > 0 && (
        <section aria-label="Needs attention">
          <AttentionBanner
            items={attention}
            agencyId={agencyId}
            userId={userId}
          />
        </section>
      )}
      <div
        className={`grid items-start gap-4 ${requests.length ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "grid-cols-1"}`}
      >
        <div className="flex min-w-0 flex-col gap-4">
          {showInbox && (
            <section aria-label="Application inbox">
              <SectionHeader
                title="Application inbox"
                count={
                  overview.counts.applicationsToReview > 0
                    ? overview.counts.applicationsToReview
                    : undefined
                }
                countLabel={`${overview.counts.applicationsToReview} applications in the inbox`}
                actions={<ViewAllLink href="/app/applications" />}
                className="mb-2"
              />
              <Card className="gap-0 py-0">
                <CardContent className="px-0">
                  {overview.applications.length > 0 ? (
                    <>
                      <Table className="min-w-[820px] [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4">
                        <TableHeader>
                          <TableRow>
                            <TableHead>Candidate</TableHead>
                            <TableHead>Applied for</TableHead>
                            <TableHead>Organization</TableHead>
                            <TableHead>Stage</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Received</TableHead>
                            <TableHead>
                              <span className="sr-only">Open application</span>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {overview.applications.map((application) => {
                            const name =
                              application.candidates?.full_name ?? "Candidate";
                            return (
                              <TableRow
                                key={application.id}
                                className="group relative hover:bg-[#F8F9FC]"
                              >
                                <TableCell>
                                  <span className="flex items-center gap-3">
                                    <Avatar>
                                      <AvatarFallback className="bg-[#EDECFD] text-xs font-semibold text-[#4846B8]">
                                        {initials(name)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <Link
                                      href={`/app/applications/${application.id}`}
                                      className="font-medium outline-none after:absolute after:inset-0 group-hover:text-primary focus-visible:underline"
                                    >
                                      {name}
                                    </Link>
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs font-medium">
                                  <span className="block max-w-48 truncate">
                                    {application.jobs?.title}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <span className="flex items-center gap-2 text-xs font-medium">
                                    <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white text-xs font-semibold text-primary">
                                      {companyProfileSchema.safeParse(
                                        application.jobs?.clients
                                          ?.company_profile,
                                      ).data?.logoUrl ? (
                                        <CompanyLogo
                                          src={
                                            companyProfileSchema.parse(
                                              application.jobs?.clients
                                                ?.company_profile,
                                            ).logoUrl!
                                          }
                                        />
                                      ) : (
                                        (application.jobs?.clients?.name
                                          ?.slice(0, 1)
                                          .toUpperCase() ?? "?")
                                      )}
                                    </span>
                                    <span className="max-w-32 truncate">
                                      {application.jobs?.clients?.name ?? "—"}
                                    </span>
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <StatusBadge status={application.status} />
                                </TableCell>
                                <TableCell>
                                  <MatchBadge match={application.match} />
                                </TableCell>
                                <TableCell className="text-xs">
                                  <time dateTime={application.submitted_at}>
                                    {new Intl.DateTimeFormat("en", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                      timeZone: timezone,
                                    }).format(
                                      new Date(application.submitted_at),
                                    )}
                                  </time>
                                </TableCell>
                                <TableCell>
                                  <AltArrowRightIcon
                                    aria-hidden="true"
                                    size={16}
                                    className="text-muted-foreground group-hover:text-primary"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      {overview.counts.applicationsToReview >
                        overview.applications.length && (
                        <div className="flex items-center justify-between gap-3 bg-[#FBFBFB] px-4 py-2.5 text-xs text-muted-foreground">
                          <span>
                            Oldest {overview.applications.length} of{" "}
                            <span className="font-medium tabular-nums text-foreground">
                              {overview.counts.applicationsToReview}
                            </span>{" "}
                            waiting
                          </span>
                          <Link
                            href="/app/applications"
                            className="rounded-sm font-medium text-foreground outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Open inbox
                          </Link>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex flex-col items-start gap-3 p-5">
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
            <SectionHeader
              title={firstJob ? "Start hiring" : "Active jobs"}
              count={
                overview.counts.openJobs > 0
                  ? overview.counts.openJobs
                  : undefined
              }
              countLabel={`${overview.counts.openJobs} active jobs`}
              actions={
                work.totalJobs > 0 ? (
                  <ViewAllLink href="/app/jobs?status=open" />
                ) : undefined
              }
              className="mb-2"
            />
            <Card className="gap-0 py-0">
              <CardContent className="px-0">
                {work.activeJobs.length > 0 ? (
                  <Table className="min-w-[820px] [&_td]:px-4 [&_td]:py-2.5 [&_th]:px-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job</TableHead>
                        <TableHead>Organization</TableHead>
                        <TableHead>Applicants</TableHead>
                        <TableHead>Review progress</TableHead>
                        <TableHead>Openings</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>
                          <span className="sr-only">Open job</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {work.activeJobs.map((job) => (
                        <TableRow key={job.id} className="hover:bg-[#F8F9FC]">
                          <TableCell>
                            <Link
                              href={`/app/jobs/${job.id}`}
                              className="group flex items-center gap-3"
                            >
                              <span className="grid size-8 shrink-0 place-items-center rounded-md border border-border bg-[#F8F8F8] text-primary">
                                <CaseMinimalisticIcon
                                  aria-hidden="true"
                                  size={18}
                                />
                              </span>
                              <div className="min-w-0">
                                <p className="font-medium group-hover:text-primary">
                                  {job.title}
                                </p>
                                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                  {[job.employment_type, job.location]
                                    .filter(Boolean)
                                    .join(" · ") || "Role details not set"}
                                </p>
                              </div>
                            </Link>
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
                                  (job.clients?.name
                                    ?.slice(0, 1)
                                    .toUpperCase() ?? "?")
                                )}
                              </span>
                              <span className="max-w-32 truncate">
                                {job.clients?.name ?? "—"}
                              </span>
                            </span>
                          </TableCell>
                          <TableCell className="font-medium tabular-nums">
                            {job.applications?.[0]?.count ?? 0}
                          </TableCell>
                          <TableCell>
                            <div
                              className="flex items-center gap-2"
                              aria-label={`${reviewProgress?.get(job.id) ?? 0} of ${job.applications?.[0]?.count ?? 0} applications reviewed`}
                            >
                              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#E8E8E8]">
                                <span
                                  className="block h-full rounded-full bg-primary"
                                  style={{
                                    width: `${(job.applications?.[0]?.count ?? 0) > 0 ? Math.min(100, ((reviewProgress?.get(job.id) ?? 0) / (job.applications?.[0]?.count ?? 1)) * 100) : 0}%`,
                                  }}
                                />
                              </span>
                              <span className="text-[11px] tabular-nums text-muted-foreground">
                                {reviewProgress?.get(job.id) ?? 0}/
                                {job.applications?.[0]?.count ?? 0}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="tabular-nums">
                            {job.positions_required}
                          </TableCell>
                          <TableCell className="text-xs">
                            {job.deadline_at
                              ? new Intl.DateTimeFormat("en", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                  timeZone: timezone,
                                }).format(new Date(job.deadline_at))
                              : "—"}
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
                    <ButtonLink href="/app?new=1" variant="outline">
                      <AddIcon data-icon="inline-start" aria-hidden="true" />
                      Create job
                    </ButtonLink>
                  </Empty>
                ) : (
                  <div className="p-5">
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
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FBFBFB] px-5 py-3">
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
                <div className="py-1">
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

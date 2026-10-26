import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear/add";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { CaseMinimalisticIcon as CaseRoundIcon } from "@solar-icons/react/linear/case-minimalistic";
import { ClipboardCheckIcon } from "@solar-icons/react/linear/clipboard-check";
import { InboxIcon } from "@solar-icons/react/linear/inbox";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type {
  getWorkspaceOverview,
  getOverviewJobs,
} from "@/server/services/overview";
import { OverviewRangeFilter } from "./overview-range-filter";
import type { OverviewRange } from "@/lib/overview-range";
import type { AttentionItem } from "@/components/applications/attention-queue";
import type { AgencyRole } from "@/types/domain";
import { OverviewWork } from "./overview-work";

type Overview = Awaited<ReturnType<typeof getWorkspaceOverview>>;

export function WorkspaceOverview({
  overview,
  work,
  role,
  applicationBaseUrl,
  timezone,
  range = "30d",
  attention = [],
}: {
  overview: Overview;
  work: Awaited<ReturnType<typeof getOverviewJobs>>;
  role: AgencyRole;
  applicationBaseUrl: string;
  timezone: string;
  range?: OverviewRange;
  attention?: AttentionItem[];
}) {
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

      <OverviewWork
        overview={overview}
        work={work}
        attention={attention}
        role={role}
        timezone={timezone}
        applicationBaseUrl={applicationBaseUrl}
      />
    </div>
  );
}

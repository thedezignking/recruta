import { AddIcon } from "@solar-icons/react/linear/add";
import { CaseMinimalisticIcon as CaseRoundIcon } from "@solar-icons/react/linear/case-minimalistic";
import { ClipboardCheckIcon } from "@solar-icons/react/linear/clipboard-check";
import { InboxIcon } from "@solar-icons/react/linear/inbox";
import { UserCheckRoundedIcon } from "@solar-icons/react/linear/user-check-rounded";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
import type {
  getWorkspaceOverview,
  getOverviewJobs,
  getOverviewTrends,
} from "@/server/services/overview";
import { OverviewRangeFilter } from "./overview-range-filter";
import { MetricStrip } from "./metric-strip";
import type { OverviewRange } from "@/lib/overview-range";
import type { AttentionItem } from "@/components/applications/attention-queue";
import type { AgencyRole } from "@/types/domain";
import { OverviewWork } from "./overview-work";

type Overview = Awaited<ReturnType<typeof getWorkspaceOverview>>;
type Trends = Awaited<ReturnType<typeof getOverviewTrends>>;

export function WorkspaceOverview({
  overview,
  trends,
  work,
  role,
  applicationBaseUrl,
  timezone,
  range = "30d",
  attention = [],
  reviewProgress,
  agencyId,
  userId,
}: {
  overview: Overview;
  trends?: Trends | null;
  work: Awaited<ReturnType<typeof getOverviewJobs>>;
  role: AgencyRole;
  applicationBaseUrl: string;
  timezone: string;
  range?: OverviewRange;
  attention?: AttentionItem[];
  reviewProgress?: Map<string, number>;
  agencyId: string;
  userId: string;
}) {
  const metrics = [
    {
      label: "Active jobs",
      value: overview.summaryCounts.openJobs,
      icon: CaseRoundIcon,
      href: "/app/jobs",
      trend: trends?.openJobs,
      activityLabel: "Open jobs created",
      previous: trends?.previous.openJobs,
      color: "text-[#cf7029]",
      iconSurface: "bg-[#d57936]",
    },
    {
      label: "Applications received",
      value: overview.summaryCounts.applicationsReceived,
      icon: InboxIcon,
      href: "/app/applications",
      trend: trends?.applicationsReceived,
      activityLabel: "Applications received",
      previous: trends?.previous.applicationsReceived,
      color: "text-[#386bd0]",
      iconSurface: "bg-[#4177d1]",
    },
    {
      label: "Shortlisted",
      value: overview.summaryCounts.shortlisted,
      icon: ClipboardCheckIcon,
      href: "/app/applications?status=shortlisted",
      trend: trends?.shortlisted,
      activityLabel: "Now shortlisted",
      previous: trends?.previous.shortlisted,
      color: "text-[#8060bb]",
      iconSurface: "bg-[#8766c5]",
    },
    {
      label: "Placements",
      value: overview.summaryCounts.placements,
      icon: UserCheckRoundedIcon,
      href: "/app/applications?status=placed",
      trend: trends?.placements,
      activityLabel: "Placements recorded",
      previous: trends?.previous.placements,
      color: "text-[#18886d]",
      iconSurface: "bg-[#26947b]",
    },
  ];

  return (
    <div className="pb-20 lg:pb-2">
      <PageHeader title="Overview" />

      <section aria-label="Recruitment summary">
        <SectionHeader
          title="Hiring activity"
          actions={
            <>
              <OverviewRangeFilter value={range} />
              <ButtonLink href="/app?new=1">
                <AddIcon data-icon="inline-start" aria-hidden="true" />
                New job
              </ButtonLink>
            </>
          }
        />
        {trends === null && (
          <p role="status" className="mt-2 text-xs text-muted-foreground">
            Activity charts are unavailable.
          </p>
        )}
        <MetricStrip
          metrics={metrics}
          range={range}
          periods={trends?.periods}
          comparisonLabel={trends?.comparisonLabel}
          idPrefix="summary"
        />
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
        reviewProgress={reviewProgress}
        agencyId={agencyId}
        userId={userId}
        role={role}
        timezone={timezone}
        applicationBaseUrl={applicationBaseUrl}
      />
    </div>
  );
}

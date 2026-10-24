import Link from "next/link";
import {
  Buildings2Icon,
  CaseRoundIcon,
  ClipboardListIcon,
  InboxIcon,
} from "@solar-icons/react/bold";
import { ArrowRightIcon } from "@solar-icons/react/linear";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getWorkspaceOverview } from "@/server/services/overview";

export default async function OverviewPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [overview, profileResult, agencyResult] = await Promise.all([
    getWorkspaceOverview(context.supabase, context.agencyId),
    context.supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", context.user.id)
      .single(),
    context.supabase
      .from("agencies")
      .select("timezone")
      .eq("id", context.agencyId)
      .single(),
  ]);
  const firstName = profileResult.data?.full_name.split(/\s+/)[0] ?? "there";
  const today = new Intl.DateTimeFormat("en-NG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: agencyResult.data?.timezone || "Africa/Lagos",
  }).format(new Date());
  const metrics = [
    {
      label: "Open jobs",
      value: overview.counts.openJobs,
      detail: "Currently recruiting",
      icon: CaseRoundIcon,
      href: "/app/jobs",
    },
    {
      label: "Applications to review",
      value: overview.counts.applicationsToReview,
      detail: "Received or in review",
      icon: InboxIcon,
      href: "/app/applications",
    },
    {
      label: "Active requests",
      value: overview.counts.activeRequests,
      detail: "Need agency or client action",
      icon: ClipboardListIcon,
      href: "/app/requests",
    },
    {
      label: "Organizations",
      value: overview.counts.organizations,
      detail: "Active client relationships",
      icon: Buildings2Icon,
      href: "/app/clients",
    },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        eyebrow={today}
        title={`Good morning, ${firstName}`}
        description="Start with the work that needs a human decision today."
        actions={<ButtonLink href="/app/jobs/new">Open a job</ButtonLink>}
      />

      <section
        aria-label="Workspace summary"
        className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Link key={metric.label} href={metric.href} className="group">
              <Card className="h-full gap-3 py-4 shadow-none transition-[border-color,box-shadow] group-hover:border-primary/25 group-hover:shadow-[0_10px_28px_rgb(23_24_43_/_0.05)]">
                <CardHeader className="grid grid-cols-[1fr_auto] items-start px-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {metric.label}
                    </p>
                    <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.04em] tabular-nums">
                      {metric.value}
                    </CardTitle>
                  </div>
                  <span className="grid size-9 place-items-center rounded-lg bg-primary/8 text-primary">
                    <Icon aria-hidden="true" size={18} />
                  </span>
                </CardHeader>
                <CardContent className="px-4">
                  <p className="text-xs text-muted-foreground">
                    {metric.detail}
                  </p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
        <Card className="shadow-none">
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle>New applications</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                The newest people entering your recruitment queue.
              </p>
            </div>
            <CardAction>
              <ButtonLink variant="ghost" size="sm" href="/app/applications">
                Review inbox
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </ButtonLink>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {overview.applications.length ? (
              <div className="divide-y">
                {overview.applications.map((application) => (
                  <Link
                    key={application.id}
                    href={`/app/applications?jobId=${application.jobs?.id ?? ""}`}
                    className="grid gap-3 px-5 py-4 hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div>
                      <p className="font-medium">
                        {application.candidates?.full_name ?? "Candidate"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {application.jobs?.title} ·{" "}
                        {application.jobs?.clients?.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={application.processing_status} />
                      <span className="font-mono text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en", {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(application.submitted_at))}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <InboxIcon
                  aria-hidden="true"
                  size={28}
                  className="mx-auto text-muted-foreground"
                />
                <p className="mt-4 font-medium">No applications yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Publish a job and share its application link.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle>Hiring requests</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Employer work waiting to move forward.
              </p>
            </div>
            <CardAction>
              <ButtonLink variant="ghost" size="sm" href="/app/requests">
                View all
                <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </ButtonLink>
            </CardAction>
          </CardHeader>
          <CardContent className="p-0">
            {overview.requests.length ? (
              <div className="divide-y">
                {overview.requests.map((request) => (
                  <Link
                    key={request.id}
                    href={`/app/requests/${request.id}`}
                    className="block px-5 py-4 hover:bg-muted/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {request.clients?.name} · {request.positions_required}{" "}
                          {request.positions_required === 1
                            ? "position"
                            : "positions"}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="px-6 py-14 text-center">
                <ClipboardListIcon
                  aria-hidden="true"
                  size={28}
                  className="mx-auto text-muted-foreground"
                />
                <p className="mt-4 font-medium">No active requests</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  New client requests will appear here.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

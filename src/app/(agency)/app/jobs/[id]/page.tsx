import Link from "next/link";
import { CaseRoundIcon, UsersGroupRoundedIcon } from "@solar-icons/react/bold";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LinkCircleIcon,
} from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { CopyApplicationLink } from "@/components/jobs/copy-application-link";
import { JobLifecycleActions } from "@/components/jobs/job-lifecycle-actions";
import { PublishJobButton } from "@/components/jobs/publish-job-button";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { StageRail } from "@/components/shared/stage-rail";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPublicEnv } from "@/lib/env";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listApplications } from "@/server/services/applications";
import { getJob } from "@/server/services/jobs";

export default async function JobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const job = await getJob(context.supabase, id).catch(() => null);
  if (!job) notFound();
  const [applicationResult, agencyResult] = await Promise.all([
    listApplications(context.supabase, context.agencyId, { jobId: id }),
    context.supabase
      .from("agencies")
      .select("slug")
      .eq("id", context.agencyId)
      .single(),
  ]);
  const stages = job.job_workflow_stages.map(
    (
      stage: {
        id: string;
        name: string;
        stage_type: string;
      },
      index: number,
    ) => ({
      id: stage.id,
      name: stage.name,
      owner:
        stage.stage_type === "client_review"
          ? ("client" as const)
          : ("agency" as const),
      complete: false,
      active: index === 0,
    }),
  );
  const applicationUrl =
    job.public_slug && agencyResult.data
      ? `${getPublicEnv().NEXT_PUBLIC_APP_URL}/careers/${agencyResult.data.slug}/jobs/${job.public_slug}`
      : null;

  return (
    <div className="pb-20 lg:pb-0">
      <Link
        href="/app/jobs"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} />
        Jobs
      </Link>
      <PageHeader
        eyebrow={
          job.source === "manual" ? "Agency-created job" : "Hiring request job"
        }
        title={job.title}
        description={`${job.clients?.name ?? "Organization"} · ${job.positions_required} ${job.positions_required === 1 ? "position" : "positions"}`}
        actions={
          <>
            <StatusBadge status={job.status} className="h-7 px-3" />
            {applicationUrl ? (
              <CopyApplicationLink url={applicationUrl} />
            ) : (
              <PublishJobButton jobId={job.id} />
            )}
          </>
        }
      />

      {applicationUrl ? (
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
        <Card className="mt-5 shadow-none">
          <CardContent className="py-5">
            <StageRail stages={stages} />
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
        <Card className="shadow-none">
          <CardHeader className="border-b pb-4">
            <div>
              <CardTitle>Latest applications</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                New candidates waiting for recruiter review.
              </p>
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
                  <div
                    key={application.id}
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
                    <StatusBadge status={application.processing_status} />
                  </div>
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
                  Share the application link to start receiving candidates.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="flex flex-col gap-5">
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
            </CardContent>
          </Card>
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
                  <dt className="text-muted-foreground">Working arrangement</dt>
                  <dd className="mt-1 font-medium capitalize">
                    {job.work_arrangement?.replace("_", "-") || "Not specified"}
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
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Job controls</CardTitle>
              <p className="text-sm text-muted-foreground">
                Change availability or remove an accidental empty job.
              </p>
            </CardHeader>
            <CardContent>
              <JobLifecycleActions
                jobId={job.id}
                status={job.status}
                source={job.source}
                applicationCount={job.applications?.[0]?.count ?? 0}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

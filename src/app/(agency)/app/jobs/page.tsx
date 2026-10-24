import Link from "next/link";
import { CaseRoundIcon } from "@solar-icons/react/bold";
import { AddIcon } from "@solar-icons/react/linear";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
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
import { listJobs } from "@/server/services/jobs";
import { listAgencyMembers } from "@/server/services/workspace";

export default async function JobsPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [jobResult, memberResult] = await Promise.all([
    listJobs(context.supabase, { agencyId: context.agencyId }),
    listAgencyMembers(context.supabase, context.agencyId),
  ]);
  const memberNames = new Map(
    memberResult.items.map((member) => [
      member.user_id,
      member.profile?.full_name ?? "Team member",
    ]),
  );

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title="Jobs"
        description="Create, publish, and run every active search from one workspace."
        actions={
          <ButtonLink href="/app/jobs/new">
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            New job
          </ButtonLink>
        }
      />
      <Card className="mt-6 shadow-none">
        <CardContent className="p-0">
          {jobResult.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Lead recruiter</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobResult.items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell>
                      <Link
                        href={`/app/jobs/${job.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {job.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {job.source === "manual"
                          ? "Created by agency"
                          : "Created from request"}
                      </p>
                    </TableCell>
                    <TableCell>{job.clients?.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {job.applications?.[0]?.count ?? 0}
                    </TableCell>
                    <TableCell>
                      {job.primary_recruiter_id
                        ? (memberNames.get(job.primary_recruiter_id) ??
                          "Assigned recruiter")
                        : "Unassigned"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {job.deadline_at
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(job.deadline_at))
                        : "No deadline"}
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
                <EmptyTitle>No jobs yet</EmptyTitle>
                <EmptyDescription>
                  Create a role for an existing organization or add the
                  organization while you work.
                </EmptyDescription>
              </EmptyHeader>
              <ButtonLink href="/app/jobs/new">
                <AddIcon data-icon="inline-start" aria-hidden="true" />
                Create your first job
              </ButtonLink>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

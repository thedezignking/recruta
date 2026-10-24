import { InboxIcon, UsersGroupRoundedIcon } from "@solar-icons/react/bold";
import { redirect } from "next/navigation";
import { OpenResumeButton } from "@/components/applications/open-resume-button";
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
import { listApplications } from "@/server/services/applications";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const result = await listApplications(context.supabase, context.agencyId, {
    jobId,
  });

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        eyebrow="Recruiter inbox"
        title="Applications"
        description="Review new applicants, processing state, and the role they applied for."
      />
      <Card className="mt-6 shadow-none">
        <CardContent className="p-0">
          {result.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Application</TableHead>
                  <TableHead>Processing</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>
                    <span className="sr-only">Document</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-full bg-primary/8 text-primary">
                          <UsersGroupRoundedIcon aria-hidden="true" size={16} />
                        </span>
                        <div>
                          <p className="font-medium">
                            {application.candidates?.full_name ?? "Candidate"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {application.candidates?.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{application.jobs?.title}</TableCell>
                    <TableCell>{application.jobs?.clients?.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={application.status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={application.processing_status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(application.submitted_at))}
                    </TableCell>
                    <TableCell>
                      {application.candidate_documents[0] ? (
                        <OpenResumeButton
                          applicationId={application.id}
                          documentId={application.candidate_documents[0].id}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No applications yet</EmptyTitle>
                <EmptyDescription>
                  Published jobs and their shareable application links will feed
                  this inbox.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

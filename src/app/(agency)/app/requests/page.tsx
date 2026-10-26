import Link from "next/link";
import { ClipboardListIcon } from "@solar-icons/react/bold";
import { redirect } from "next/navigation";
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
import { listHiringRequests } from "@/server/services/hiring-requests";

const nextActions: Record<string, string> = {
  draft: "Finish draft",
  submitted: "Start review",
  under_review: "Make a decision",
  clarification_requested: "Await client response",
  approved: "Create job",
  declined: "No action",
  cancelled: "No action",
};

export default async function RequestsPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const result = await listHiringRequests(context.supabase, {
    agencyId: context.agencyId,
  });
  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader title="Hiring requests" />
      <Card className="mt-6 shadow-none">
        <CardContent className="p-0">
          {result.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Positions</TableHead>
                  <TableHead>Next action</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell>
                      <Link
                        href={`/app/requests/${request.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {request.title}
                      </Link>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {request.id.slice(0, 8).toUpperCase()}
                      </p>
                    </TableCell>
                    <TableCell>
                      {request.clients?.name ?? "Organization"}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {request.department || "No department"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={request.status} />
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {request.positions_required}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {nextActions[request.status] ?? "Review"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {request.submitted_at
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(request.submitted_at))
                        : "Not submitted"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardListIcon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No hiring requests</EmptyTitle>
                <EmptyDescription>
                  Requests submitted by invited clients or your public employer
                  form will appear here.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

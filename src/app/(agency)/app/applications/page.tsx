import Link from "next/link";
import { InboxIcon } from "@solar-icons/react/bold";
import { ArrowRightIcon } from "@solar-icons/react/linear";
import { redirect } from "next/navigation";
import { InboxFilters } from "@/components/applications/inbox-filters";
import { PageHeader } from "@/components/shared/page-header";
import { ButtonLink } from "@/components/shared/button-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { applicationFiltersSchema } from "@/lib/applicant-operations";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listApplications } from "@/server/services/applications";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const parsed = applicationFiltersSchema.safeParse(await searchParams);
  if (!parsed.success)
    return (
      <div>
        <PageHeader title="Applications" />
        <Alert className="mt-6">
          <AlertDescription>
            These filters are invalid.{" "}
            <Link href="/app/applications">Clear filters</Link> to continue.
          </AlertDescription>
        </Alert>
      </div>
    );
  const filters = parsed.data;
  const [result, jobs, agency] = await Promise.all([
    listApplications(context.supabase, context.agencyId, filters),
    context.supabase
      .from("jobs")
      .select("id,title")
      .eq("agency_id", context.agencyId)
      .order("title")
      .limit(200),
    context.supabase
      .from("agencies")
      .select("timezone")
      .eq("id", context.agencyId)
      .single(),
  ]);
  if (jobs.error || agency.error)
    throw new Error("Inbox filters could not be loaded.");
  const timezone = agency.data.timezone;
  const filtered = Object.values(filters).some(Boolean);
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(filters))
    if (value && key !== "cursor") next.set(key, value);
  const firstPage = next.size
    ? `/app/applications?${next}`
    : "/app/applications";
  if (result.nextCursor) next.set("cursor", result.nextCursor);
  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <PageHeader
        title="Applications"
        actions={
          <span className="text-sm text-muted-foreground tabular-nums">
            {result.total} {result.total === 1 ? "application" : "applications"}
          </span>
        }
      />
      <InboxFilters
        key={JSON.stringify(filters)}
        filters={filters}
        jobs={jobs.data ?? []}
      />
      <Card>
        <CardContent className="p-0">
          {result.items.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Candidate</TableHead>
                  <TableHead>Role / organization</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>
                    <span className="sr-only">Open application</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((application) => (
                  <TableRow key={application.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {application.candidates.full_name
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <Link
                            href={`/app/applications/${application.id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {application.candidates.full_name}
                          </Link>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {application.candidates.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/app/jobs/${application.jobs.id}`}
                        className="hover:underline"
                      >
                        {application.jobs.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {application.jobs.clients.name}
                      </p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={application.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {application.owner_name ??
                        (application.owner_user_id
                          ? "Former teammate"
                          : "Unassigned")}
                    </TableCell>
                    <TableCell>
                      <time
                        dateTime={application.submitted_at}
                        className="whitespace-nowrap font-mono text-xs text-muted-foreground"
                      >
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeZone: timezone,
                        }).format(new Date(application.submitted_at))}
                      </time>
                    </TableCell>
                    <TableCell>
                      <ButtonLink
                        href={`/app/applications/${application.id}`}
                        variant="ghost"
                        size="sm"
                        aria-label={`Review ${application.candidates.full_name}`}
                      >
                        Review
                        <ArrowRightIcon
                          data-icon="inline-end"
                          aria-hidden="true"
                        />
                      </ButtonLink>
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
                <EmptyTitle>
                  {filtered
                    ? "No matching applications"
                    : "No applications yet"}
                </EmptyTitle>
                <EmptyDescription>
                  {filtered
                    ? "Try a different search or clear your filters."
                    : "Publish a job and share its application link."}
                </EmptyDescription>
              </EmptyHeader>
              <ButtonLink
                href={filtered ? "/app/applications" : "/app/jobs"}
                variant="outline"
                size="sm"
              >
                {filtered ? "Clear filters" : "View jobs"}
              </ButtonLink>
            </Empty>
          )}
        </CardContent>
      </Card>
      {(filters.cursor || result.nextCursor) && (
        <nav
          aria-label="Application pages"
          className="flex items-center justify-between gap-3"
        >
          <ButtonLink href={firstPage} variant="ghost">
            First page
          </ButtonLink>
          {result.nextCursor && (
            <ButtonLink href={`/app/applications?${next}`} variant="outline">
              Next page
              <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
            </ButtonLink>
          )}
        </nav>
      )}
    </div>
  );
}

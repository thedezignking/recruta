import Link from "next/link";
import { Buildings2Icon } from "@solar-icons/react/bold";
import { AddIcon, AltArrowRightIcon } from "@solar-icons/react/linear";
import { redirect } from "next/navigation";
import { CompanyLogo } from "@/components/organizations/company-picker";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
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
import { companyProfileSchema } from "@/lib/organization";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listClients } from "@/server/services/clients";

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>;
}) {
  const { cursor } = await searchParams;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const result = await listClients(context.supabase, context.agencyId, cursor);
  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader title="Organizations" />
      <SectionHeader
        title="All organizations"
        count={result.items.length || undefined}
        actions={
          <ButtonLink href="/app/clients/new">
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            Add organization
          </ButtonLink>
        }
        className="mb-3"
      />
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="p-0">
          {result.items.length ? (
            <Table className="min-w-[760px] [&_td]:px-3 [&_td]:py-3 [&_th]:px-3">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4">Organization</TableHead>
                  <TableHead>Primary contact</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Requests</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>
                    <span className="sr-only">Open organization</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((client) => {
                  const primary =
                    client.client_contacts.find(
                      (contact) => contact.is_primary,
                    ) ?? client.client_contacts[0];
                  const logoUrl = companyProfileSchema.safeParse(
                    client.company_profile,
                  ).data?.logoUrl;
                  return (
                    <TableRow
                      key={client.id}
                      className="group relative hover:bg-[#F8F9FC]"
                    >
                      <TableCell className="pl-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white text-xs font-semibold text-primary">
                            {logoUrl ? (
                              <CompanyLogo src={logoUrl} />
                            ) : (
                              client.name.slice(0, 1).toUpperCase()
                            )}
                          </span>
                          <span className="min-w-0">
                            <Link
                              href={`/app/clients/${client.id}`}
                              className="font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
                            >
                              {client.name}
                            </Link>
                            <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                              {[client.industry, client.location]
                                .filter(Boolean)
                                .join(" · ") || "Profile not set"}
                            </span>
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {primary ? (
                          <span className="block text-xs">
                            <span className="block font-medium">
                              {primary.full_name}
                            </span>
                            <span className="block truncate text-muted-foreground">
                              {primary.email}
                            </span>
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Not added
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {client.jobs?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {client.hiring_requests?.[0]?.count ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                        }).format(new Date(client.created_at))}
                      </TableCell>
                      <TableCell>
                        <AltArrowRightIcon
                          size={16}
                          className="text-muted-foreground group-hover:text-primary"
                          aria-hidden="true"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <Empty className="py-16">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Buildings2Icon aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>No organizations yet</EmptyTitle>
                <EmptyDescription>
                  Add an employer now, or create one inline when you open a job.
                </EmptyDescription>
              </EmptyHeader>
              <ButtonLink href="/app/clients/new" variant="outline">
                <AddIcon data-icon="inline-start" aria-hidden="true" />
                Add organization
              </ButtonLink>
            </Empty>
          )}
          {result.nextCursor && (
            <div className="border-t border-border px-4 py-3 text-center">
              <Link
                href={`/app/clients?cursor=${encodeURIComponent(result.nextCursor)}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Next page
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

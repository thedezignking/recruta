import Link from "next/link";
import { Buildings2Icon } from "@solar-icons/react/bold";
import { AddIcon } from "@solar-icons/react/linear";
import { redirect } from "next/navigation";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listClients } from "@/server/services/clients";

export default async function OrganizationsPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const result = await listClients(context.supabase, context.agencyId);
  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader
        title="Organizations"
        actions={
          <ButtonLink href="/app/clients/new">
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            Add organization
          </ButtonLink>
        }
      />
      {result.items.length ? (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {result.items.map((client) => {
            const primary =
              client.client_contacts.find((contact) => contact.is_primary) ??
              client.client_contacts[0];
            return (
              <Link
                key={client.id}
                href={`/app/clients/${client.id}`}
                className="group"
              >
                <Card className="h-full shadow-none transition-[transform,border-color,box-shadow] duration-150 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-[0_14px_34px_rgb(23_24_43_/_0.06)]">
                  <CardContent className="px-5">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary">
                        <Buildings2Icon aria-hidden="true" size={20} />
                      </span>
                      <div className="min-w-0">
                        <h2 className="truncate font-medium">{client.name}</h2>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[client.industry, client.location]
                            .filter(Boolean)
                            .join(" · ") || "Organization profile"}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-3 border-t pt-4">
                      <div>
                        <dt className="text-xs text-muted-foreground">Jobs</dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums">
                          {client.jobs?.[0]?.count ?? 0}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-muted-foreground">
                          Requests
                        </dt>
                        <dd className="mt-1 text-lg font-semibold tabular-nums">
                          {client.hiring_requests?.[0]?.count ?? 0}
                        </dd>
                      </div>
                    </dl>
                    <p className="mt-4 truncate text-xs text-muted-foreground">
                      Primary contact{" "}
                      <span className="font-medium text-foreground">
                        {primary?.full_name ?? "Not added"}
                      </span>
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <Card className="mt-6 shadow-none">
          <CardContent>
            <Empty className="py-14">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}

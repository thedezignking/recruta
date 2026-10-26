import Link from "next/link";
import { CaseRoundIcon } from "@solar-icons/react/bold";
import { AddIcon, ArrowLeftIcon, LetterIcon } from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { OrganizationDeleteAction } from "@/components/organizations/organization-delete-action";
import { CompanyLogo } from "@/components/organizations/company-picker";
import { companyProfileSchema } from "@/lib/organization";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getClientRecord } from "@/server/services/clients";

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const organization = await getClientRecord(
    context.supabase,
    context.agencyId,
    id,
  ).catch(() => null);
  if (!organization) notFound();
  const profile = companyProfileSchema.safeParse(organization.company_profile);
  const company = profile.success ? profile.data : undefined;
  const primary =
    organization.client_contacts.find((contact) => contact.is_primary) ??
    organization.client_contacts[0];
  return (
    <div className="pb-20 lg:pb-0">
      <Link
        href="/app/clients"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} />
        Organizations
      </Link>
      <PageHeader
        title={organization.name}
        description={
          [organization.industry, organization.location]
            .filter(Boolean)
            .join(" · ") || "Client organization"
        }
        actions={
          <ButtonLink href={`/app/jobs/new?clientId=${organization.id}`}>
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            Open a job
          </ButtonLink>
        }
      />
      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          {(organization.website || company?.address || company?.logoUrl) && (
            <Card>
              <CardHeader>
                <CardTitle>Company details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4">
                  {company?.logoUrl && (
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border">
                      <CompanyLogo src={company.logoUrl} />
                    </span>
                  )}
                  <div className="flex min-w-0 flex-col gap-2 text-sm">
                    {organization.website && (
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all text-primary hover:underline"
                      >
                        {organization.website}
                      </a>
                    )}
                    {company?.address && (
                      <p className="whitespace-pre-wrap break-words text-muted-foreground">
                        {company.address}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card className="shadow-none">
            <CardHeader className="border-b pb-4">
              <CardTitle>Jobs</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {organization.jobs.length ? (
                <div className="divide-y">
                  {organization.jobs.slice(0, 8).map((job) => (
                    <Link
                      key={job.id}
                      href={`/app/jobs/${job.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">{job.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {job.positions_required}{" "}
                          {job.positions_required === 1
                            ? "position"
                            : "positions"}
                        </p>
                      </div>
                      <StatusBadge status={job.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <CaseRoundIcon
                    aria-hidden="true"
                    size={26}
                    className="mx-auto text-muted-foreground"
                  />
                  <p className="mt-3 font-medium">
                    No jobs for this organization
                  </p>
                  <ButtonLink
                    href={`/app/jobs/new?clientId=${organization.id}`}
                    variant="link"
                    className="mt-1"
                  >
                    Open the first role
                  </ButtonLink>
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="border-b pb-4">
              <CardTitle>Hiring requests</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {organization.hiring_requests.length ? (
                <div className="divide-y">
                  {organization.hiring_requests.slice(0, 6).map((request) => (
                    <Link
                      key={request.id}
                      href={`/app/requests/${request.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium">{request.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {request.positions_required}{" "}
                          {request.positions_required === 1
                            ? "position"
                            : "positions"}
                        </p>
                      </div>
                      <StatusBadge status={request.status} />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-muted-foreground">
                  No hiring requests yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card className="h-fit shadow-none">
            <CardHeader>
              <CardTitle>Primary contact</CardTitle>
            </CardHeader>
            <CardContent>
              {primary ? (
                <div>
                  <p className="font-medium">{primary.full_name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {primary.job_title || "Client contact"}
                  </p>
                  <a
                    href={`mailto:${primary.email}`}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <LetterIcon aria-hidden="true" size={16} />
                    {primary.email}
                  </a>
                  {primary.phone ? (
                    <p className="mt-2 text-sm">{primary.phone}</p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No primary contact has been added.
                </p>
              )}
            </CardContent>
          </Card>
          {["owner", "administrator", "recruitment_manager"].includes(
            context.role,
          ) ||
          (context.role === "recruiter" &&
            organization.account_manager_id === context.user.id) ? (
            <Card className="h-fit shadow-none">
              <CardHeader>
                <CardTitle>Organization controls</CardTitle>
              </CardHeader>
              <CardContent>
                <OrganizationDeleteAction
                  organizationId={organization.id}
                  hasActivity={
                    organization.jobs.length > 0 ||
                    organization.hiring_requests.length > 0
                  }
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

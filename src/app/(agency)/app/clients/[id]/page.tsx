import { Fragment } from "react";
import Link from "next/link";
import { CaseRoundIcon } from "@solar-icons/react/bold";
import {
  AddIcon,
  AltArrowRightIcon,
  GlobalIcon,
  LetterIcon,
  MapPointIcon,
  PhoneIcon,
} from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { OrganizationDeleteAction } from "@/components/organizations/organization-delete-action";
import { CompanyLogo } from "@/components/organizations/company-picker";
import { ToolbarBreadcrumb } from "@/components/layout/toolbar-title-context";
import { companyProfileSchema } from "@/lib/organization";
import { ButtonLink } from "@/components/shared/button-link";
import { DetailHeader, Panel } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
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
  const openJobs = organization.jobs.filter(
    (job) => job.status === "open",
  ).length;
  const activeRequests = organization.hiring_requests.filter(
    (request) =>
      !["declined", "cancelled", "approved"].includes(request.status),
  ).length;
  const newJobHref = `/app/jobs?new=1&clientId=${organization.id}`;
  const website = organization.website?.replace(/^https?:\/\//, "");
  const canManage =
    ["owner", "administrator", "recruitment_manager"].includes(context.role) ||
    (context.role === "recruiter" &&
      organization.account_manager_id === context.user.id);
  const stats = [
    { label: "Jobs", value: organization.jobs.length },
    { label: "Open jobs", value: openJobs },
    { label: "Hiring requests", value: organization.hiring_requests.length },
    { label: "Requests in progress", value: activeRequests },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      <ToolbarBreadcrumb
        parent="Organizations"
        parentHref="/app/clients"
        title={organization.name}
      />
      <DetailHeader
        media={
          <span className="grid size-11 place-items-center overflow-hidden rounded-[10px] border border-border bg-white text-base font-semibold text-primary">
            {company?.logoUrl ? (
              <CompanyLogo src={company.logoUrl} />
            ) : (
              organization.name.slice(0, 1).toUpperCase()
            )}
          </span>
        }
        title={organization.name}
        meta={[
          organization.industry,
          organization.location ? (
            <Fragment key="location">
              <MapPointIcon aria-hidden="true" size={14} />
              {organization.location}
            </Fragment>
          ) : null,
          organization.website ? (
            <a
              href={organization.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-primary"
            >
              <GlobalIcon aria-hidden="true" size={14} />
              {website}
            </a>
          ) : null,
        ]}
        actions={
          <ButtonLink href={newJobHref}>
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            Open a job
          </ButtonLink>
        }
      />

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[10px] border border-border md:grid-cols-4">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className={`min-w-0 border-border p-4 ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b md:border-b-0" : ""} ${index === 1 ? "md:border-r" : ""}`}
          >
            <dt className="text-xs font-medium text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="mt-1.5 text-[24px] leading-none font-semibold tracking-[-0.04em] tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel
            title="Jobs"
            count={organization.jobs.length || undefined}
            bodyClassName="p-0"
          >
            {organization.jobs.length ? (
              <ul className="py-1">
                {organization.jobs.slice(0, 20).map((job) => (
                  <li key={job.id}>
                    <Link
                      href={`/app/jobs/${job.id}`}
                      className="group flex items-center gap-3 px-4 py-3 outline-none hover:bg-[#F8F9FC] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-primary">
                          {job.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {job.positions_required}{" "}
                          {job.positions_required === 1
                            ? "opening"
                            : "openings"}
                        </span>
                      </span>
                      <StatusBadge status={job.status} />
                      <AltArrowRightIcon
                        aria-hidden="true"
                        size={16}
                        className="hidden text-muted-foreground group-hover:text-primary sm:block"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center px-6 py-12 text-center">
                <span className="grid size-10 place-items-center rounded-[10px] bg-[#F8F8F8] text-muted-foreground ring-1 ring-border">
                  <CaseRoundIcon aria-hidden="true" size={20} />
                </span>
                <p className="mt-3 text-sm font-medium">
                  No jobs for this organization
                </p>
                <ButtonLink
                  href={newJobHref}
                  variant="outline"
                  size="sm"
                  className="mt-3"
                >
                  <AddIcon data-icon="inline-start" aria-hidden="true" />
                  Open the first role
                </ButtonLink>
              </div>
            )}
          </Panel>
          <Panel
            title="Hiring requests"
            count={organization.hiring_requests.length || undefined}
            bodyClassName="p-0"
          >
            {organization.hiring_requests.length ? (
              <ul className="py-1">
                {organization.hiring_requests.slice(0, 6).map((request) => (
                  <li key={request.id}>
                    <Link
                      href={`/app/requests/${request.id}`}
                      className="group flex items-center gap-3 px-4 py-3 outline-none hover:bg-[#F8F9FC] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-primary">
                          {request.title}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {request.positions_required}{" "}
                          {request.positions_required === 1
                            ? "opening"
                            : "openings"}
                        </span>
                      </span>
                      <StatusBadge status={request.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                No hiring requests yet.
              </p>
            )}
          </Panel>
        </div>

        <aside
          aria-label="Organization details"
          className="flex flex-col gap-5"
        >
          <Panel title="Primary contact">
            {primary ? (
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-[#EDECFD] text-xs font-semibold text-[#4846B8]"
                >
                  {primary.full_name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part: string) => part[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{primary.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {primary.job_title || "Client contact"}
                  </p>
                  <a
                    href={`mailto:${primary.email}`}
                    className="mt-3 flex items-center gap-2 break-all text-xs hover:text-primary"
                  >
                    <LetterIcon
                      aria-hidden="true"
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    {primary.email}
                  </a>
                  {primary.phone ? (
                    <a
                      href={`tel:${primary.phone}`}
                      className="mt-1.5 flex items-center gap-2 text-xs hover:text-primary"
                    >
                      <PhoneIcon
                        aria-hidden="true"
                        size={14}
                        className="shrink-0 text-muted-foreground"
                      />
                      {primary.phone}
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No contact added. Contacts are optional.
              </p>
            )}
          </Panel>
          {(organization.website || company?.address) && (
            <Panel title="Company details">
              <dl className="grid gap-3 text-xs">
                {organization.website && (
                  <div>
                    <dt className="text-muted-foreground">Website</dt>
                    <dd className="mt-0.5">
                      <a
                        href={organization.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all font-medium hover:text-primary"
                      >
                        {website}
                      </a>
                    </dd>
                  </div>
                )}
                {company?.address && (
                  <div>
                    <dt className="text-muted-foreground">Address</dt>
                    <dd className="mt-0.5 whitespace-pre-wrap break-words font-medium">
                      {company.address}
                    </dd>
                  </div>
                )}
              </dl>
            </Panel>
          )}
          {canManage && (
            <Panel title="Organization controls">
              <OrganizationDeleteAction
                organizationId={organization.id}
                hasActivity={
                  organization.jobs.length > 0 ||
                  organization.hiring_requests.length > 0
                }
              />
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

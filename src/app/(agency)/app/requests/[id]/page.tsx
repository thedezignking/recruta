import Link from "next/link";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { ArrowLeftIcon } from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { RequestActions } from "@/components/requests/request-actions";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader } from "@/components/shared/page-header";
import { StageRail } from "@/components/shared/stage-rail";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getHiringRequest,
  listRequestMessages,
} from "@/server/services/hiring-requests";

function salary(
  min: number | null,
  max: number | null,
  currency: string | null,
) {
  if (min === null && max === null) return "Not provided";
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 0,
  });
  return min !== null && max !== null
    ? `${formatter.format(min)}–${formatter.format(max)}`
    : min !== null
      ? `From ${formatter.format(min)}`
      : `Up to ${formatter.format(max ?? 0)}`;
}

export default async function RequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const request = await getHiringRequest(context.supabase, id).catch(
    () => null,
  );
  if (!request) notFound();
  const messages = await listRequestMessages(context.supabase, id);
  const statusOrder = ["submitted", "under_review", "approved"];
  const activeIndex =
    request.status === "clarification_requested"
      ? 1
      : Math.max(0, statusOrder.indexOf(request.status));
  const stages = [
    { id: "submitted", name: "Submitted", owner: "client" as const },
    {
      id: "review",
      name:
        request.status === "clarification_requested"
          ? "Clarification"
          : "Agency review",
      owner:
        request.status === "clarification_requested"
          ? ("client" as const)
          : ("agency" as const),
    },
    { id: "approval", name: "Approved", owner: "agency" as const },
  ].map((stage, index) => ({
    ...stage,
    complete: index < activeIndex,
    active: index === activeIndex,
  }));
  const canApprove = context.role !== "recruiter";

  return (
    <div className="pb-20 lg:pb-0">
      <Link
        href="/app/requests"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon aria-hidden="true" size={16} />
        Hiring requests
      </Link>
      <PageHeader
        eyebrow={request.id.slice(0, 8).toUpperCase()}
        title={request.title}
        description={`${request.clients?.name ?? "Organization"} · ${request.department || "No department"} · ${request.submitted_at ? `Submitted ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(request.submitted_at))}` : "Draft"}`}
        actions={<StatusBadge status={request.status} className="h-7 px-3" />}
      />
      <Card className="mt-6 shadow-none">
        <CardContent className="py-5">
          <StageRail stages={stages} />
        </CardContent>
      </Card>
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_380px]">
        <div className="flex flex-col gap-5">
          <Card className="shadow-none">
            <CardHeader className="border-b pb-4">
              <CardTitle>Role brief</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Detail
                  label="Department"
                  value={request.department || "Not provided"}
                />
                <Detail
                  label="Location"
                  value={
                    [
                      request.location,
                      request.work_arrangement?.replace("_", "-"),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Not provided"
                  }
                />
                <Detail
                  label="Positions"
                  value={String(request.positions_required)}
                />
                <Detail
                  label="Employment type"
                  value={request.employment_type || "Not provided"}
                />
                <Detail
                  label="Salary range"
                  value={salary(
                    request.salary_min,
                    request.salary_max,
                    request.currency,
                  )}
                />
                <Detail
                  label="Target hire date"
                  value={
                    request.target_hire_date
                      ? new Intl.DateTimeFormat("en", {
                          dateStyle: "long",
                        }).format(new Date(request.target_hire_date))
                      : "Not provided"
                  }
                />
              </dl>
              <div className="mt-6 border-t pt-5">
                <h3 className="text-sm font-medium">Description</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {request.description}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="border-b pb-4">
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              {request.hiring_request_requirements.length ? (
                <ul className="flex flex-col gap-4">
                  {request.hiring_request_requirements.map(
                    (requirement: {
                      id: string;
                      label: string;
                      description: string | null;
                    }) => (
                      <li
                        key={requirement.id}
                        className="grid grid-cols-[8px_minmax(0,1fr)] gap-3"
                      >
                        <span
                          aria-hidden="true"
                          className="mt-2.5 size-1.5 rounded-full bg-primary"
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {requirement.label}
                          </p>
                          {requirement.description ? (
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">
                              {requirement.description}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No structured requirements were added.
                </p>
              )}
            </CardContent>
          </Card>
          {messages.items.length ? (
            <Card className="shadow-none">
              <CardHeader className="border-b pb-4">
                <CardTitle>Clarification history</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="flex flex-col gap-4">
                  {messages.items.map((message) => (
                    <li key={message.id} className="rounded-xl bg-muted/45 p-4">
                      <p className="text-sm leading-6">{message.message}</p>
                      <p className="mt-2 font-mono text-xs text-muted-foreground">
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(message.created_at))}
                      </p>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ) : null}
        </div>
        <div className="flex flex-col gap-5">
          <Card className="border-primary/20 shadow-none">
            <CardHeader className="border-b bg-primary/[.035] pb-4">
              <CardTitle>Next action</CardTitle>
              <p className="text-sm text-muted-foreground">
                The request state controls which actions are available.
              </p>
            </CardHeader>
            <CardContent>
              {request.status === "approved" ? (
                <ButtonLink
                  className="w-full"
                  href={`/app/requests/${request.id}/convert`}
                >
                  <CheckCircleIcon
                    data-icon="inline-start"
                    aria-hidden="true"
                  />
                  Create job
                </ButtonLink>
              ) : (
                <RequestActions
                  requestId={request.id}
                  status={request.status}
                  canApprove={canApprove}
                />
              )}
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Revision history</CardTitle>
            </CardHeader>
            <CardContent>
              {request.hiring_request_revisions.length ? (
                <div className="flex flex-col gap-3">
                  {request.hiring_request_revisions.map(
                    (revision: {
                      id: string;
                      revision_number: number;
                      created_at: string;
                    }) => (
                      <div key={revision.id}>
                        <p className="text-sm font-medium">
                          Revision {revision.revision_number}
                        </p>
                        <p className="mt-1 font-mono text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(revision.created_at))}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No submitted revision yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-1.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

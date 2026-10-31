import Link from "next/link";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { ClipboardTextIcon } from "@solar-icons/react/linear";
import { notFound, redirect } from "next/navigation";
import { RequestActions } from "@/components/requests/request-actions";
import { ButtonLink } from "@/components/shared/button-link";
import { DetailHeader, Panel } from "@/components/shared/page-header";
import { ToolbarBreadcrumb } from "@/components/layout/toolbar-title-context";
import { StageRail } from "@/components/shared/stage-rail";
import { StatusBadge } from "@/components/shared/status-badge";
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
      <ToolbarBreadcrumb
        parent="Hiring requests"
        parentHref="/app/requests"
        title={request.title}
      />
      <DetailHeader
        media={
          <span className="grid size-11 place-items-center rounded-[10px] border border-border bg-white text-muted-foreground">
            <ClipboardTextIcon aria-hidden="true" size={20} />
          </span>
        }
        title={request.title}
        status={<StatusBadge status={request.status} />}
        meta={[
          request.clients?.name ? (
            <Link
              href={`/app/clients/${request.client_id}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {request.clients.name}
            </Link>
          ) : null,
          request.department,
          <span key="ref" className="font-mono">
            {request.id.slice(0, 8).toUpperCase()}
          </span>,
          request.submitted_at
            ? `Submitted ${new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(request.submitted_at))}`
            : "Draft",
        ]}
        actions={
          request.status === "approved" && canApprove ? (
            <ButtonLink href={`/app/requests/${request.id}/convert`}>
              <CheckCircleIcon data-icon="inline-start" aria-hidden="true" />
              Create job
            </ButtonLink>
          ) : undefined
        }
      />
      <div className="mt-5 rounded-[10px] border border-border px-4 py-4">
        <StageRail stages={stages} />
      </div>
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Role brief">
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
          </Panel>
          <Panel title="Requirements">
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
          </Panel>
          {messages.items.length ? (
            <Panel title="Clarification history">
              <ol className="flex flex-col gap-4">
                {messages.items.map((message) => (
                  <li
                    key={message.id}
                    className="rounded-md bg-[#F8F8F8] px-3 py-2.5"
                  >
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
            </Panel>
          ) : null}
        </div>
        <aside aria-label="Request actions" className="flex flex-col gap-5">
          <Panel title="Next action">
            {request.status === "approved" ? (
              <p className="text-sm text-muted-foreground">
                {canApprove
                  ? "Approved. Create the job to start recruiting."
                  : "Approved. A manager will create the job."}
              </p>
            ) : (
              <RequestActions
                requestId={request.id}
                status={request.status}
                canApprove={canApprove}
              />
            )}
          </Panel>
          <Panel title="Revision history">
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
          </Panel>
        </aside>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

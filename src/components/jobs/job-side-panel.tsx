"use client";

import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  ArrowRightIcon,
  CloseIcon,
  CaseMinimalisticIcon,
} from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";

type PanelJob = {
  id: string;
  title: string;
  status: string;
  description: string;
  clients: { name: string } | null;
  department: string | null;
  employment_type: string | null;
  work_arrangement: string | null;
  location: string | null;
  positions_required: number;
  deadline_at: string | null;
  published_at: string | null;
  created_at: string;
  job_workflow_stages: { id: string; name: string; sort_order: number }[];
  applications: { count: number }[];
};

const labels: Record<string, string> = {
  received: "Received",
  in_review: "In review",
  shortlisted: "Shortlisted",
  client_review: "Client review",
  interview: "Interview",
  offer: "Offer",
  placed: "Placed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export function JobSidePanel({
  job,
  pipeline,
  returnHref,
  canEditDraft = false,
}: {
  job: PanelJob;
  pipeline: { status: string; count: number }[];
  returnHref: string;
  canEditDraft?: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "applications" | "workflow">(
    "overview",
  );
  const count = job.applications?.[0]?.count ?? 0;
  const byStatus = new Map(pipeline.map((item) => [item.status, item.count]));
  const date = (value: string | null) =>
    value
      ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
          new Date(value),
        )
      : "—";
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) router.replace(returnHref);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/30" />
        <Dialog.Popup className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw,490px)] flex-col border-l border-border bg-white shadow-2xl outline-none">
          <div className="flex items-start gap-3 border-b border-border px-5 py-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <CaseMinimalisticIcon size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <Dialog.Title className="truncate text-base font-semibold">
                {job.title}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {job.clients?.name ?? "Organization"}
                {job.location ? ` · ${job.location}` : ""}
              </Dialog.Description>
              <StatusBadge status={job.status} className="mt-2" />
            </div>
            <Dialog.Close
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Close job details"
                />
              }
            >
              <CloseIcon aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div
            className="flex border-b border-border px-5"
            role="tablist"
            aria-label="Job details"
          >
            {(["overview", "applications", "workflow"] as const).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={tab === item}
                onClick={() => setTab(item)}
                className={`h-10 border-b-2 px-3 text-xs font-medium capitalize ${tab === item ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
            {tab === "overview" && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Applications", count],
                    ["In review", byStatus.get("in_review") ?? 0],
                    ["Shortlisted", byStatus.get("shortlisted") ?? 0],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[10px] border border-border bg-[#F8F8F8] p-3"
                    >
                      <p className="text-xl font-semibold tabular-nums">
                        {value}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>
                <section>
                  <h3 className="text-sm font-semibold">About the role</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {job.description}
                  </p>
                </section>
                <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-[10px] border border-border bg-[#F8F8F8] p-4 text-xs">
                  {[
                    ["Department", job.department],
                    ["Engagement", job.employment_type],
                    [
                      "Work arrangement",
                      job.work_arrangement?.replaceAll("_", " "),
                    ],
                    ["Openings", job.positions_required],
                    ["Published", date(job.published_at)],
                    ["Deadline", date(job.deadline_at)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="mt-1 font-medium capitalize">
                        {value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {tab === "applications" && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {count} {count === 1 ? "application" : "applications"} for
                  this job
                </p>
                <div className="mt-4 divide-y divide-border rounded-[10px] border border-border">
                  {pipeline
                    .filter((item) => item.count > 0)
                    .map((item) => (
                      <div
                        key={item.status}
                        className="flex items-center justify-between px-4 py-3 text-sm"
                      >
                        <span>{labels[item.status] ?? item.status}</span>
                        <span className="font-semibold tabular-nums">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  {!count && (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      No applications yet.
                    </p>
                  )}
                </div>
                <Link
                  href={`/app/applications?jobId=${job.id}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Open job inbox <ArrowRightIcon size={16} aria-hidden="true" />
                </Link>
              </div>
            )}
            {tab === "workflow" && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Configured hiring stages for this job.
                </p>
                <ol className="mt-4 space-y-2">
                  {job.job_workflow_stages.map((stage, index) => (
                    <li
                      key={stage.id}
                      className="flex items-center gap-3 rounded-[10px] border border-border bg-[#F8F8F8] px-4 py-3 text-sm"
                    >
                      <span className="grid size-6 place-items-center rounded-full bg-white text-xs font-medium ring-1 ring-border">
                        {index + 1}
                      </span>
                      {stage.name}
                    </li>
                  ))}
                </ol>
                {!job.job_workflow_stages.length && (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No workflow stages configured.
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-2 border-t border-border bg-white px-5 py-4">
            {job.status === "draft" && canEditDraft && (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/app/jobs/${job.id}?edit=1`}
                  className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
                >
                  Edit draft
                </Link>
                <Link
                  href={`/app/jobs/${job.id}?edit=1&review=1`}
                  className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Review & publish
                </Link>
              </div>
            )}
            {job.status !== "draft" && count > 0 && (
              <Link
                href={`/app/applications?jobId=${job.id}`}
                className="inline-flex h-9 items-center justify-center rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                Review {count} {count === 1 ? "application" : "applications"}
              </Link>
            )}
            <Link
              href={`/app/jobs/${job.id}`}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              Open full job <ArrowRightIcon size={16} aria-hidden="true" />
            </Link>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

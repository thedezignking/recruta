"use client";

import { useRef, useState } from "react";
import {
  CheckCircleIcon,
  CloseCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  TrashBin2Icon,
} from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type JobStatus =
  | "draft"
  | "open"
  | "on_hold"
  | "filled"
  | "cancelled"
  | "closed_unfilled";

const transitionOptions: Partial<
  Record<
    JobStatus,
    Array<{
      status: JobStatus;
      label: string;
      icon: typeof PauseCircleIcon;
      destructive?: boolean;
    }>
  >
> = {
  open: [
    { status: "on_hold", label: "Pause applications", icon: PauseCircleIcon },
    { status: "filled", label: "Mark as filled", icon: CheckCircleIcon },
    {
      status: "closed_unfilled",
      label: "Close without hire",
      icon: CloseCircleIcon,
      destructive: true,
    },
  ],
  on_hold: [
    { status: "open", label: "Reopen applications", icon: PlayCircleIcon },
    {
      status: "closed_unfilled",
      label: "Close without hire",
      icon: CloseCircleIcon,
      destructive: true,
    },
  ],
};

export function JobLifecycleActions({
  jobId,
  status,
  source,
  applicationCount,
}: {
  jobId: string;
  status: string;
  source: string;
  applicationCount: number;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = transitionOptions[status as JobStatus] ?? [];
  const canDelete = source === "manual" && applicationCount === 0;

  async function request(
    action: string,
    input: { method: "POST" | "DELETE"; body?: object },
  ) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPendingAction(action);
    setError(null);
    const requestId = crypto.randomUUID();
    try {
      const response = await fetch(
        input.method === "DELETE"
          ? `/api/v1/jobs/${jobId}`
          : `/api/v1/jobs/${jobId}/transitions`,
        {
          method: input.method,
          headers: {
            "content-type": "application/json",
            "x-request-id": requestId,
          },
          body: input.body ? JSON.stringify(input.body) : undefined,
        },
      );
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(result.error?.message ?? "The job could not be updated.");
        return;
      }
      if (input.method === "DELETE") {
        router.push("/app/jobs");
      } else {
        router.refresh();
      }
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      inFlight.current = false;
      setPendingAction(null);
    }
  }

  if (!options.length && !canDelete) return null;

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const Icon = option.icon;
        return (
          <Button
            key={option.status}
            type="button"
            variant={option.destructive ? "destructive" : "outline"}
            className="w-full justify-start"
            disabled={pendingAction !== null}
            onClick={() =>
              request(option.status, {
                method: "POST",
                body: { status: option.status },
              })
            }
          >
            <Icon data-icon="inline-start" aria-hidden="true" />
            {pendingAction === option.status ? "Updating…" : option.label}
          </Button>
        );
      })}

      {canDelete ? (
        confirmDelete ? (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-sm font-medium">Delete this job permanently?</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Its public link and setup will be removed. This cannot be undone.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pendingAction !== null}
                onClick={() => request("delete", { method: "DELETE" })}
              >
                <TrashBin2Icon data-icon="inline-start" aria-hidden="true" />
                {pendingAction === "delete" ? "Deleting…" : "Delete job"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pendingAction !== null}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-start text-destructive hover:text-destructive"
            onClick={() => setConfirmDelete(true)}
          >
            <TrashBin2Icon data-icon="inline-start" aria-hidden="true" />
            Delete empty job
          </Button>
        )
      ) : null}

      {error ? (
        <p role="alert" className="text-xs leading-5 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

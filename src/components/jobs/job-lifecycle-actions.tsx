"use client";

import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import {
  AltArrowDownIcon,
  CheckCircleIcon,
  CloseCircleIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  TrashBin2Icon,
} from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  agencyId,
  jobId,
  status,
  source,
  applicationCount,
}: {
  agencyId: string;
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
            "x-agency-id": agencyId,
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pendingAction !== null}
            />
          }
        >
          More
          <AltArrowDownIcon aria-hidden="true" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <DropdownMenuItem
                key={option.status}
                variant={option.destructive ? "destructive" : undefined}
                onClick={() =>
                  void request(option.status, {
                    method: "POST",
                    body: { status: option.status },
                  })
                }
              >
                <Icon aria-hidden="true" />
                {option.label}
              </DropdownMenuItem>
            );
          })}
          {canDelete && (
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <TrashBin2Icon aria-hidden="true" />
              Delete empty job
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog.Root open={confirmDelete} onOpenChange={setConfirmDelete}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/35" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-border bg-white p-5 shadow-2xl outline-none">
            <Dialog.Title className="text-base font-semibold">
              Delete this job?
            </Dialog.Title>
            <Dialog.Description className="mt-2 text-sm leading-5 text-muted-foreground">
              Its setup will be removed permanently. This cannot be undone.
            </Dialog.Description>
            {error && (
              <p role="alert" className="mt-3 text-xs text-destructive">
                {error}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={pendingAction !== null}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={pendingAction !== null}
                onClick={() => void request("delete", { method: "DELETE" })}
              >
                {pendingAction === "delete" ? "Deleting…" : "Delete job"}
              </Button>
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {error && !confirmDelete && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </>
  );
}

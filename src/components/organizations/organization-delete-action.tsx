"use client";

import { useRef, useState } from "react";
import { TrashBin2Icon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function OrganizationDeleteAction({
  organizationId,
  hasActivity,
}: {
  organizationId: string;
  hasActivity: boolean;
}) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function remove() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/clients/${organizationId}`, {
        method: "DELETE",
        headers: { "x-request-id": crypto.randomUUID() },
      });
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(
          result.error?.message ?? "The organization could not be deleted.",
        );
        return;
      }
      router.push("/app/clients");
      router.refresh();
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  if (hasActivity) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Organizations with jobs or hiring requests are retained for history.
        Remove an accidental empty job first, or archive active work.
      </p>
    );
  }

  return confirming ? (
    <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
      <p className="text-sm font-medium">Delete this organization?</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        Its empty profile and contacts will be permanently removed.
      </p>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={pending}
          onClick={remove}
        >
          <TrashBin2Icon data-icon="inline-start" aria-hidden="true" />
          {pending ? "Deleting…" : "Delete organization"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  ) : (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start text-destructive hover:text-destructive"
      onClick={() => setConfirming(true)}
    >
      <TrashBin2Icon data-icon="inline-start" aria-hidden="true" />
      Delete empty organization
    </Button>
  );
}

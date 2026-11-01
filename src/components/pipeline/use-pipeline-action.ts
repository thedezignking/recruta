"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PipelineAction } from "@/lib/pipeline";

/** Sends one pipeline change at a time, then refreshes the server page. */
export function usePipelineAction(agencyId: string, applicationId: string) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  async function run(payload: PipelineAction) {
    if (inFlight.current) return false;
    inFlight.current = true;
    setPending(payload.action);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/pipeline`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
          },
          body: JSON.stringify(payload),
        },
      );
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fields = body.error?.fieldErrors as
          | Record<string, string[] | undefined>
          | undefined;
        const first = fields && Object.values(fields).flat().find(Boolean);
        setError(first ?? body.error?.message ?? "That change wasn't saved.");
        return false;
      }
      startRefresh(() => router.refresh());
      return true;
    } catch {
      setError("Couldn't reach Recruta. Check your connection and try again.");
      return false;
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return { run, pending, error, busy: pending !== null || refreshing };
}

/** `datetime-local` value (browser time) to an ISO timestamp. */
export function localToIso(value: string) {
  return value ? new Date(value).toISOString() : "";
}

/** ISO timestamp to a `datetime-local` value in browser time. */
export function isoToLocal(value: string) {
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

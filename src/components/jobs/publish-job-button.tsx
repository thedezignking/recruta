"use client";

import { useState } from "react";
import { UploadIcon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PublishJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function publish() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/jobs/${jobId}/publish`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(result.error?.message ?? "The job could not be published.");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" onClick={publish} disabled={pending}>
        <UploadIcon data-icon="inline-start" aria-hidden="true" />
        {pending ? "Publishing…" : "Publish job"}
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

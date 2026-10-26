"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function SharedResume({
  submissionId,
  clientId,
}: {
  submissionId: string;
  clientId: string;
}) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          setError("");
          try {
            const r = await fetch(
              `/api/v1/portal/submissions/${submissionId}/resume`,
              { headers: { "x-client-id": clientId } },
            );
            const b = await r.json();
            if (!r.ok)
              throw new Error(b.error?.message ?? "Résumé unavailable.");
            setDownloadUrl(b.data.downloadUrl);
            window.open(b.data.downloadUrl, "_blank", "noopener,noreferrer");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setPending(false);
          }
        }}
      >
        Open shared résumé
      </Button>
      {downloadUrl && (
        <a
          className="ml-3 text-sm underline"
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open résumé if the new tab was blocked
        </a>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

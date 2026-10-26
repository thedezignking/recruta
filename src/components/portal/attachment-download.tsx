"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function AttachmentDownload({
  requestId,
  id,
  name,
}: {
  requestId: string;
  id: string;
  name: string;
}) {
  const [error, setError] = useState("");
  return (
    <div>
      <Button
        variant="link"
        className="h-auto px-0"
        onClick={async () => {
          try {
            const r = await fetch(
              `/api/v1/hiring-requests/${requestId}/attachments/${id}/download-url`,
            );
            const b = await r.json();
            if (!r.ok) throw new Error(b.error?.message ?? "File unavailable.");
            window.open(b.data.downloadUrl, "_blank", "noopener,noreferrer");
          } catch (e) {
            setError((e as Error).message);
          }
        }}
      >
        {name}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

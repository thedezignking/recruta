"use client";

import { useState } from "react";
import { DocumentTextIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";

export function OpenResumeButton({
  applicationId,
  documentId,
}: {
  applicationId: string;
  documentId: string;
}) {
  const [pending, setPending] = useState(false);

  async function openResume() {
    setPending(true);
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/documents/${documentId}/download-url`,
        { method: "POST" },
      );
      const result = (await response.json()) as { data?: { url: string } };
      if (response.ok && result.data?.url)
        window.open(result.data.url, "_blank", "noopener,noreferrer");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={openResume}
      disabled={pending}
    >
      <DocumentTextIcon data-icon="inline-start" aria-hidden="true" />
      {pending ? "Opening…" : "Resume"}
    </Button>
  );
}

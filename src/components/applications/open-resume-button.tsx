"use client";

import { useState } from "react";
import { DocumentTextIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";

export function OpenResumeButton({
  applicationId,
  documentId,
  agencyId,
  prominent = false,
}: {
  applicationId: string;
  documentId: string;
  agencyId?: string;
  /** Header placement: an outline button at the standard size. */
  prominent?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openResume() {
    setPending(true);
    setError(null);
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/documents/${documentId}/download-url`,
        {
          method: "POST",
          headers: agencyId ? { "x-agency-id": agencyId } : undefined,
        },
      );
      const result = (await response.json()) as { data?: { url: string } };
      if (!response.ok || !result.data?.url)
        throw new Error("The résumé could not be opened. Try again.");
      if (tab) tab.location.href = result.data.url;
      else throw new Error("Allow pop-ups for Recruta, then try again.");
    } catch (caught) {
      tab?.close();
      setError(
        caught instanceof Error
          ? caught.message
          : "The résumé could not be opened.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        variant={prominent ? "outline" : "ghost"}
        size={prominent ? "default" : "sm"}
        onClick={openResume}
        disabled={pending}
      >
        <DocumentTextIcon data-icon="inline-start" aria-hidden="true" />
        {pending ? "Opening…" : prominent ? "Open résumé" : "Resume"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 max-w-56 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

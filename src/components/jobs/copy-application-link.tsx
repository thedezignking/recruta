"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { CopyIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";

export function CopyApplicationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" variant="outline" onClick={copy}>
      {copied ? (
        <CheckCircleIcon data-icon="inline-start" aria-hidden="true" />
      ) : (
        <CopyIcon data-icon="inline-start" aria-hidden="true" />
      )}
      {copied ? "Link copied" : "Copy application link"}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Application link copied to clipboard." : ""}
      </span>
    </Button>
  );
}

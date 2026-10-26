"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold/check-circle";
import { CopyIcon } from "@solar-icons/react/linear/copy";
import { Button } from "@/components/ui/button";

export function CopyApplicationLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" onClick={copy}>
        {copied ? (
          <CheckCircleIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <CopyIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {copied ? "Link copied" : "Copy application link"}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? "Application link copied to clipboard." : ""}
      </span>
      {failed && (
        <p role="alert" className="text-sm text-muted-foreground">
          Couldn’t copy the link.{" "}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            Open job page
          </a>{" "}
          to copy its address.
        </p>
      )}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type PipelineEmailContext = {
  available: boolean;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  companyName: string;
  agencyName: string;
  timezone: string;
};

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "there";
}

/**
 * A prefilled candidate email the recruiter reviews before it is queued.
 * Interview emails carry a calendar invite; nothing sends without Queue email.
 */
export function EmailCandidate({
  agencyId,
  applicationId,
  kind,
  interviewId,
  to,
  defaultSubject,
  defaultBody,
  note,
  onClose,
}: {
  agencyId: string;
  applicationId: string;
  kind: "interview_invitation" | "interview_update" | "offer";
  interviewId?: string;
  to: string;
  defaultSubject: string;
  defaultBody: string;
  note?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (sent)
    return (
      <div
        role="status"
        className="mt-3 flex items-center justify-between gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success"
      >
        Email queued to {to}. Delivery status is in Messages.
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Done
        </Button>
      </div>
    );

  return (
    <form
      className="mt-3 flex flex-col gap-3 rounded-md border border-border p-3"
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        setPending(true);
        setError(null);
        key.current ??= crypto.randomUUID();
        try {
          const response = await fetch(
            `/api/v1/applications/${applicationId}/messages`,
            {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-agency-id": agencyId,
                "idempotency-key": key.current,
              },
              body: JSON.stringify({ kind, interviewId, subject, body }),
            },
          );
          const result = await response.json().catch(() => ({}));
          if (!response.ok)
            throw new Error(
              result.error?.message ?? "The email could not be queued.",
            );
          setSent(true);
          router.refresh();
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "The email wasn't queued.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <p className="text-xs text-muted-foreground">
        To <span className="font-medium text-foreground">{to}</span>
        {note ? ` · ${note}` : ""}
      </p>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Subject
        <Input
          value={subject}
          maxLength={200}
          required
          onChange={(e) => setSubject(e.target.value.replace(/[\r\n]/g, ""))}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Message
        <Textarea
          value={body}
          rows={9}
          maxLength={10000}
          required
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={pending || !subject.trim() || !body.trim()}
        >
          {pending ? "Queuing…" : "Queue email"}
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { CloseCircleIcon, LetterIcon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function RequestActions({
  requestId,
  status,
  canApprove,
}: {
  requestId: string;
  status: string;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(
    action: "start-review" | "approve" | "decline" | "request-clarification",
  ) {
    setPending(action);
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/hiring-requests/${requestId}/${action}`,
        {
          method: "POST",
          headers:
            action === "request-clarification"
              ? { "content-type": "application/json" }
              : undefined,
          body:
            action === "request-clarification"
              ? JSON.stringify({ message })
              : undefined,
        },
      );
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(result.error?.message ?? "The request could not be updated.");
        return;
      }
      router.refresh();
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      setPending(null);
    }
  }

  return (
    <FieldGroup>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {status === "submitted" ? (
        <Button
          type="button"
          onClick={() => act("start-review")}
          disabled={Boolean(pending)}
        >
          Start review
        </Button>
      ) : null}
      {status === "under_review" ? (
        <>
          <Field>
            <FieldLabel htmlFor="clarificationMessage">
              Clarification message
            </FieldLabel>
            <Textarea
              id="clarificationMessage"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Tell the client exactly what is missing."
            />
          </Field>
          {canApprove ? (
            <Button
              type="button"
              onClick={() => act("approve")}
              disabled={Boolean(pending)}
            >
              <CheckCircleIcon data-icon="inline-start" aria-hidden="true" />
              Approve request
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => act("request-clarification")}
            disabled={Boolean(pending) || message.trim().length < 3}
          >
            <LetterIcon data-icon="inline-start" aria-hidden="true" />
            Request clarification
          </Button>
          {canApprove ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={() => act("decline")}
              disabled={Boolean(pending)}
            >
              <CloseCircleIcon data-icon="inline-start" aria-hidden="true" />
              Decline request
            </Button>
          ) : null}
        </>
      ) : null}
      {status === "clarification_requested" ? (
        <p className="text-sm leading-6 text-muted-foreground">
          The client owns the next action. You will be notified when they
          resubmit.
        </p>
      ) : null}
    </FieldGroup>
  );
}

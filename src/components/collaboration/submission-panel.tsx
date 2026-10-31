"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import type { getSubmissions } from "@/server/services/collaboration";
export function SubmissionPanel({
  agencyId,
  applicationId,
  canShare,
  submissions,
  document,
}: {
  agencyId: string;
  applicationId: string;
  canShare: boolean;
  submissions: Awaited<ReturnType<typeof getSubmissions>>;
  document?: { id: string; file_name: string };
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const active = submissions.find((s) => !s.withdrawn_at);
  async function send(payload: unknown) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const r = await fetch(
        `/api/v1/applications/${applicationId}/submission`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
          },
          body: JSON.stringify(payload),
        },
      );
      const result = await r.json();
      if (!r.ok)
        throw new Error(
          result.error?.message ?? "Submission could not be saved.",
        );
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return (
    <Card size="sm" className="gap-0 py-0">
      <CardHeader className="px-4 pt-4">
        <CardTitle>Hiring manager review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        {active ? (
          <>
            <p className="whitespace-pre-wrap text-sm">{active.summary}</p>
            <p className="text-xs text-muted-foreground">
              Visible to people granted access to this job.
              {active.document_id
                ? " Includes the selected résumé."
                : " No résumé shared."}
            </p>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                void send({ action: "withdraw", submissionId: active.id })
              }
            >
              Withdraw submission
            </Button>
          </>
        ) : canShare ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void send({
                action: "share",
                summary: f.get("summary"),
                documentId:
                  f.get("includeResume") === "on" ? document?.id : null,
              });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="candidate-submission">
                  Summary to share
                </FieldLabel>
                <Textarea
                  id="candidate-submission"
                  name="summary"
                  required
                  minLength={10}
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground">
                  Only the candidate name, this summary, and an explicitly
                  selected résumé are shared. Private notes and AI assessments
                  stay internal.
                </p>
              </Field>
              {document && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="includeResume" />
                  Include {document.file_name}
                </label>
              )}
              <Button variant="outline" type="submit" disabled={pending}>
                Share candidate
              </Button>
            </FieldGroup>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            Shortlist this application before sharing it with a hiring manager.
          </p>
        )}
        {error && <FieldError role="alert">{error}</FieldError>}
        {submissions.flatMap((s) =>
          s.submission_feedback.map((f) => (
            <div key={f.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium capitalize">{f.recommendation}</p>
              {f.strengths && (
                <p className="mt-2 whitespace-pre-wrap">
                  Strengths: {f.strengths}
                </p>
              )}
              {f.concerns && (
                <p className="mt-2 whitespace-pre-wrap">
                  Concerns: {f.concerns}
                </p>
              )}
              <p className="mt-2 whitespace-pre-wrap">{f.comment}</p>
              <time
                className="mt-2 block text-xs text-muted-foreground"
                dateTime={f.created_at}
              >
                {new Date(f.created_at).toLocaleDateString("en")}
              </time>
            </div>
          )),
        )}
      </CardContent>
    </Card>
  );
}

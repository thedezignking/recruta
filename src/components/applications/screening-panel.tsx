"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DocumentTextIcon } from "@solar-icons/react/linear/document-text";
import { RestartIcon } from "@solar-icons/react/linear/restart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { screeningVerdicts } from "@/lib/applicant-processing";
import { screeningCorrectionSchema } from "@/lib/applicant-processing";
import type { ScreeningReviewData } from "@/lib/screening";

export function ScreeningPanel({
  agencyId,
  applicationId,
  data,
  documents,
  enabled,
  timezone,
  intakeFailed = false,
}: {
  agencyId: string;
  applicationId: string;
  data: ScreeningReviewData;
  documents: { id: string; file_name: string }[];
  enabled: boolean;
  timezone: string;
  intakeFailed?: boolean;
}) {
  const router = useRouter();
  const [runId, setRunId] = useState(data.runs[0]?.id ?? "");
  const [documentId, setDocumentId] = useState(documents[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const key = useRef<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const run = data.runs.find((item) => item.id === runId) ?? data.runs[0];
  const context = run ? data.context[run.id] : undefined;
  const active = data.runs.some(
    (item) => item.status === "queued" || item.status === "running",
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [active, router]);
  const date = (value: string) =>
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  async function request() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/screening`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
            "idempotency-key": key.current,
          },
          body: JSON.stringify({ documentId }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Screening could not be requested.",
        );
      key.current = null;
      setRunId(result.data.id);
      setNotice(
        result.data.status === "succeeded"
          ? "Existing evidence is up to date."
          : "Screening queued. You can continue reviewing.",
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Screening could not be requested.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function retryIntake() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/intake/retry`,
        { method: "POST", headers: { "x-agency-id": agencyId } },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Intake could not be retried.",
        );
      setNotice("Intake queued for retry.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Intake could not be retried.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Card id="screening" size="sm" className="gap-0 py-0">
      <CardHeader className="border-b border-border px-4 pt-3">
        <CardTitle className="flex items-center gap-2">
          <DocumentTextIcon size={16} aria-hidden="true" />
          AI screening
        </CardTitle>
        <CardDescription>
          Evidence for your review. Hiring decisions stay with you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 p-4">
        {intakeFailed && (
          <Alert>
            <AlertDescription>
              <p>
                Intake automation could not finish. Check workspace processing
                settings before retrying.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => void retryIntake()}
              >
                Retry intake
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {!enabled && (
          <p className="text-sm text-muted-foreground">
            AI screening is off. An administrator can enable it after operator
            configuration. Manual review remains available.
          </p>
        )}
        <div className="flex flex-wrap items-end gap-3">
          {documents.length > 1 && (
            <Field className="max-w-xs">
              <FieldLabel>Résumé</FieldLabel>
              <Select
                value={documentId}
                onValueChange={(value) => {
                  if (value) {
                    setDocumentId(value);
                    key.current = null;
                  }
                }}
                items={documents.map((item) => ({
                  value: item.id,
                  label: item.file_name,
                }))}
              >
                <SelectTrigger aria-label="Résumé to screen">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {documents.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.file_name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
          )}
          <Button
            variant="outline"
            size="sm"
            disabled={!enabled || !documentId || active || pending}
            onClick={() => void request()}
          >
            <RestartIcon aria-hidden="true" data-icon="inline-start" />
            {pending
              ? "Queuing…"
              : active
                ? "Processing…"
                : run
                  ? "Run screening again"
                  : "Screen résumé"}
          </Button>
          {run && (
            <Badge variant="outline">{run.status.replaceAll("_", " ")}</Badge>
          )}
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
        {data.runs.length > 1 && (
          <Field>
            <FieldLabel>Screening history</FieldLabel>
            <Select
              value={run?.id ?? ""}
              onValueChange={(value) => {
                if (value) setRunId(value);
              }}
              items={data.runs.map((item) => ({
                value: item.id,
                label: `${date(item.created_at)} · ${item.status}`,
              }))}
            >
              <SelectTrigger aria-label="Screening history">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {data.runs.map((item) => (
                    <SelectItem value={item.id} key={item.id}>
                      {date(item.created_at)} · {item.status}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        )}
        {run && (
          <p className="text-xs text-muted-foreground">
            {date(run.created_at)} · {run.model} · {run.prompt_version} ·
            Attempt {run.attempts}
          </p>
        )}
        {run?.status === "failed" && (
          <Alert>
            <AlertDescription>
              Screening could not finish (
              {run.failure_code?.replaceAll("_", " ") ?? "processing error"}).
              Review the résumé manually or retry after resolving the issue.
            </AlertDescription>
          </Alert>
        )}
        {run?.assessment && (
          <>
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {run.assessment.summary}
            </p>
            {run.assessment.warnings.map((warning, index) => (
              <p className="text-sm text-foreground" key={index}>
                {warning}
              </p>
            ))}
            <div className="flex flex-col gap-5">
              {run.assessment.criteria.map((criterion) => {
                const requirement = context?.requirements.find(
                  (item) => item.id === criterion.requirementId,
                );
                const correction = data.corrections.find(
                  (item) =>
                    item.run_id === run.id &&
                    item.requirement_id === criterion.requirementId,
                );
                return (
                  <section
                    key={`${run.id}-${criterion.requirementId}`}
                    className="rounded-lg border p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="text-sm font-medium">
                        {requirement?.label ?? "Requirement"}
                      </h3>
                      <Badge variant="outline">
                        {
                          screeningVerdicts[
                            correction?.verdict ?? criterion.verdict
                          ]
                        }
                      </Badge>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {correction?.explanation ?? criterion.explanation}
                    </p>
                    {correction && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Recruiter correction · {date(correction.created_at)}.
                        Original AI result:{" "}
                        {screeningVerdicts[criterion.verdict]} —{" "}
                        {criterion.explanation}
                      </p>
                    )}
                    {criterion.evidence.map((evidence, index) => {
                      const source = evidence.sourceId.startsWith("resume:")
                        ? run.extraction?.sections[
                            Number(evidence.sourceId.slice(7)) - 1
                          ]?.label
                        : context?.answers.find(
                            (answer) =>
                              `answer:${answer.id}` === evidence.sourceId,
                          )?.question;
                      return (
                        <blockquote
                          key={index}
                          className="mt-3 border-l-2 pl-3 text-sm"
                        >
                          <p className="whitespace-pre-wrap break-words">
                            “{evidence.quote}”
                          </p>
                          <footer className="mt-1 text-xs text-muted-foreground">
                            {source ?? "Source excerpt"}
                          </footer>
                        </blockquote>
                      );
                    })}
                    {criterion.followUp && (
                      <p className="mt-3 text-sm">
                        <span className="font-medium">
                          Suggested follow-up:
                        </span>{" "}
                        {criterion.followUp}
                      </p>
                    )}
                    <CorrectionForm
                      key={`${run.id}-${criterion.requirementId}-${correction?.id ?? "new"}`}
                      agencyId={agencyId}
                      applicationId={applicationId}
                      runId={run.id}
                      requirementId={criterion.requirementId}
                      initialVerdict={correction?.verdict ?? criterion.verdict}
                    />
                  </section>
                );
              })}
            </div>
            {run.assessment.facts.length > 0 && (
              <details>
                <summary className="cursor-pointer text-sm font-medium">
                  Professional facts
                </summary>
                <ul className="mt-3 flex flex-col gap-3 text-sm">
                  {run.assessment.facts.map((fact, index) => (
                    <li key={index}>
                      <p>{fact.statement}</p>
                      {fact.evidence.map((evidence, n) => (
                        <blockquote
                          key={n}
                          className="mt-1 break-words text-muted-foreground"
                        >
                          “{evidence.quote}”
                        </blockquote>
                      ))}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
        {run?.extraction && (
          <details>
            <summary className="cursor-pointer text-sm font-medium">
              Extracted résumé text
            </summary>
            <div className="mt-3 flex max-h-96 flex-col gap-4 overflow-auto">
              {run.extraction.sections.map((section, index) => (
                <section key={index}>
                  <h3 className="text-sm font-medium">{section.label}</h3>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                    {section.text}
                  </p>
                </section>
              ))}
              {run.extraction.warnings.map((warning, index) => (
                <p key={index} className="text-sm text-foreground">
                  {warning}
                </p>
              ))}
            </div>
          </details>
        )}
        {data.runs.length === 20 && (
          <p className="text-xs text-muted-foreground">
            Showing the latest 20 runs.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CorrectionForm({
  agencyId,
  applicationId,
  runId,
  requirementId,
  initialVerdict,
}: {
  agencyId: string;
  applicationId: string;
  runId: string;
  requirementId: string;
  initialVerdict: keyof typeof screeningVerdicts;
}) {
  const [verdict, setVerdict] = useState(initialVerdict);
  const [explanation, setExplanation] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const key = useRef<string | null>(null);
  const router = useRouter();
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    key.current ??= crypto.randomUUID();
    setError("");
    const payload = screeningCorrectionSchema.safeParse({
      id: key.current,
      runId,
      requirementId,
      verdict,
      explanation,
    });
    if (!payload.success) {
      setError("Add a reason of 5–2,000 characters.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/screening/corrections`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
          },
          body: JSON.stringify(payload.data),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Correction could not be saved.",
        );
      setExplanation("");
      key.current = null;
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Correction could not be saved.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-medium">
        Correct this assessment
      </summary>
      <form onSubmit={save} className="mt-3">
        <FieldGroup>
          <Field>
            <FieldLabel>Recruiter assessment</FieldLabel>
            <Select
              value={verdict}
              onValueChange={(value) => {
                if (value) {
                  setVerdict(value);
                  key.current = null;
                }
              }}
              items={Object.entries(screeningVerdicts).map(
                ([value, label]) => ({ value, label }),
              )}
            >
              <SelectTrigger aria-label="Recruiter assessment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {Object.entries(screeningVerdicts).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor={`correction-${requirementId}`}>
              Reason and supporting evidence
            </FieldLabel>
            <Textarea
              id={`correction-${requirementId}`}
              value={explanation}
              onChange={(event) => {
                setExplanation(event.target.value);
                key.current = null;
              }}
              required
              minLength={5}
              maxLength={2000}
              disabled={pending}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button variant="outline" size="sm" disabled={pending} type="submit">
            {pending ? "Saving…" : "Save correction"}
          </Button>
        </FieldGroup>
      </form>
    </details>
  );
}

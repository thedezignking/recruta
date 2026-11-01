"use client";

import { useMemo, useRef, useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import {
  DocumentTextIcon,
  UploadMinimalisticIcon,
} from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "cn";

type PublicQuestion = {
  id: string;
  label: string;
  help_text: string | null;
  question_type: string;
  options: unknown;
  is_required: boolean;
};

type ApiFailure = {
  data?: {
    confirmationEmailStatus?: string;
  };
  error?: {
    message?: string;
    fieldErrors?: Record<string, string[] | undefined>;
  };
};

export function ApplicationForm({
  agencySlug,
  jobSlug,
  jobTitle,
  agencyName,
  questions,
  preview = false,
}: {
  agencySlug: string;
  jobSlug: string;
  jobTitle: string;
  agencyName: string;
  questions: PublicQuestion[];
  preview?: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [resume, setResume] = useState<{ name: string; size: number } | null>(
    null,
  );
  const submissionKey = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined>
  >({});
  const [submitted, setSubmitted] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(true);
  const endpoint = useMemo(
    () =>
      `/api/v1/public/agencies/${encodeURIComponent(agencySlug)}/jobs/${encodeURIComponent(jobSlug)}/applications`,
    [agencySlug, jobSlug],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview) return;
    if (busy.current) return;
    busy.current = true;
    submissionKey.current ??= crypto.randomUUID();
    setPending(true);
    setError(null);
    setFieldErrors({});
    const body = new FormData(event.currentTarget);
    body.set(
      "answers",
      JSON.stringify(
        questions.map((question) => ({
          questionId: question.id,
          answer:
            question.question_type === "yes_no" &&
            answers[question.id] !== undefined &&
            answers[question.id] !== ""
              ? answers[question.id] === "true"
              : (answers[question.id] ?? ""),
        })),
      ),
    );
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Idempotency-Key": submissionKey.current },
        body,
      });
      const result = (await response.json()) as ApiFailure;
      if (!response.ok) {
        setError(
          result.error?.message ?? "Your application could not be submitted.",
        );
        setFieldErrors(result.error?.fieldErrors ?? {});
        return;
      }
      setConfirmationSent(result.data?.confirmationEmailStatus === "sent");
      setSubmitted(true);
    } catch {
      setError(
        "We could not reach the application service. Check your connection and try again.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center py-12 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircleIcon aria-hidden="true" size={24} />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
          Application received
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
          {agencyName} now has your application for {jobTitle}.{" "}
          {confirmationSent
            ? "We sent a confirmation to your email address."
            : "They will contact you if they need anything else."}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <FieldGroup className="gap-6">
        {preview && (
          <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 text-sm text-foreground">
            Preview only. Candidates can apply after this job is published.
          </div>
        )}
        {error ? (
          <div
            role="alert"
            className="rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        <input
          aria-hidden="true"
          className="absolute -left-[10000px] size-px"
          tabIndex={-1}
          autoComplete="off"
          name="website"
        />
        <Field data-invalid={Boolean(fieldErrors.fullName)}>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input
            id="fullName"
            className="h-10"
            name="fullName"
            autoComplete="name"
            required
            aria-invalid={Boolean(fieldErrors.fullName)}
          />
          <FieldError
            errors={fieldErrors.fullName?.map((message) => ({ message }))}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field data-invalid={Boolean(fieldErrors.email)}>
            <FieldLabel htmlFor="email">Email address</FieldLabel>
            <Input
              id="email"
              className="h-10"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              aria-invalid={Boolean(fieldErrors.email)}
            />
            <FieldError
              errors={fieldErrors.email?.map((message) => ({ message }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="phone">
              Phone{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <Input
              id="phone"
              className="h-10"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="linkedinUrl">
            LinkedIn{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="linkedinUrl"
            className="h-10"
            name="linkedinUrl"
            type="url"
            inputMode="url"
            placeholder="https://linkedin.com/in/…"
          />
        </Field>
        <Field data-invalid={Boolean(fieldErrors.resume)}>
          <FieldLabel htmlFor="resume">CV or resume</FieldLabel>
          <div
            className={cn(
              "relative flex items-center gap-3 rounded-xl border border-dashed p-4 transition-colors duration-150 focus-within:border-[#5C5AED] focus-within:ring-3 focus-within:ring-[#5C5AED]/20 hover:border-[#5C5AED]/50",
              resume
                ? "border-[#5C5AED]/40 bg-[#F6F6FE]"
                : "border-[#D9D9DE] bg-[#FAFAFB]",
              fieldErrors.resume && "border-destructive",
            )}
          >
            <span
              aria-hidden="true"
              className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-[#5C5AED] shadow-[0_1px_2px_rgb(17_17_17_/_0.06)] ring-1 ring-[#EBEBEB]"
            >
              {resume ? (
                <DocumentTextIcon size={19} />
              ) : (
                <UploadMinimalisticIcon size={19} />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {resume ? resume.name : "Upload your CV"}
              </span>
              <span className="block text-xs text-muted-foreground">
                {resume
                  ? `${Math.max(1, Math.round(resume.size / 1024))} KB · Choose another file to replace it`
                  : "Drop a file here or browse. PDF or DOCX, up to 10 MB."}
              </span>
            </span>
            <input
              id="resume"
              name="resume"
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              required
              aria-invalid={Boolean(fieldErrors.resume)}
              aria-describedby="resume-help"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setResume(file ? { name: file.name, size: file.size } : null);
              }}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </div>
          <FieldDescription id="resume-help">
            Leave out ID or financial documents.
          </FieldDescription>
          <FieldError
            errors={fieldErrors.resume?.map((message) => ({ message }))}
          />
        </Field>
        {questions.length ? (
          <FieldSet>
            <FieldLegend className="sr-only">Screening questions</FieldLegend>
            {questions.map((question) => {
              const options = Array.isArray(question.options)
                ? question.options.filter(
                    (option): option is string => typeof option === "string",
                  )
                : [];
              return (
                <Field key={question.id}>
                  <FieldLabel htmlFor={`question-${question.id}`}>
                    {question.label}
                    {question.is_required ? (
                      <span aria-hidden="true"> *</span>
                    ) : null}
                  </FieldLabel>
                  {question.question_type === "long_text" ? (
                    <Textarea
                      id={`question-${question.id}`}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      required={question.is_required}
                      rows={4}
                    />
                  ) : question.question_type === "yes_no" ? (
                    <select
                      id={`question-${question.id}`}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      required={question.is_required}
                      className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                    >
                      <option value="">Select an answer</option>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : question.question_type === "single_select" ? (
                    <select
                      id={`question-${question.id}`}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      required={question.is_required}
                      className="h-10 rounded-lg border border-input bg-background px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25"
                    >
                      <option value="">Select an answer</option>
                      {options.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`question-${question.id}`}
                      value={answers[question.id] ?? ""}
                      onChange={(event) =>
                        setAnswers((current) => ({
                          ...current,
                          [question.id]: event.target.value,
                        }))
                      }
                      required={question.is_required}
                      className="h-10"
                    />
                  )}
                  {question.help_text ? (
                    <FieldDescription>{question.help_text}</FieldDescription>
                  ) : null}
                </Field>
              );
            })}
          </FieldSet>
        ) : null}
        <Field>
          <FieldLabel htmlFor="coverNote">
            Note{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Textarea id="coverNote" name="coverNote" rows={3} />
        </Field>
        <Field orientation="horizontal">
          <input
            id="consent"
            name="consent"
            value="true"
            type="checkbox"
            required
            className="mt-1 size-4 accent-[#5C5AED]"
          />
          <FieldLabel
            htmlFor="consent"
            className="text-sm font-normal leading-6 text-muted-foreground"
          >
            I agree that {agencyName} may process my details for this
            application.
          </FieldLabel>
        </Field>
        <Button
          type="submit"
          size="lg"
          disabled={pending || preview}
          className="mk-press h-11 w-full rounded-lg bg-[#5C5AED] text-[15px] shadow-[inset_0_1px_0_rgb(255_255_255_/_0.15),0_1px_2px_rgb(23_24_43_/_0.15)] hover:bg-[#4E4CE0]"
        >
          {preview
            ? "Publish job to accept applications"
            : pending
              ? "Submitting application…"
              : "Submit application"}
        </Button>
      </FieldGroup>
    </form>
  );
}

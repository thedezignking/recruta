"use client";

import { useRef, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { AddIcon, TrashBin2Icon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { manualJobSchema } from "@/lib/validation";
import type { z } from "zod";

type FormValues = z.input<typeof manualJobSchema>;

type ClientOption = { id: string; name: string };
type WorkflowOption = { id: string; name: string };
type RecruiterOption = { userId: string; name: string; role: string };

export function NewJobForm({
  clients,
  workflows,
  recruiters,
  currentUserId,
  initialClientId,
}: {
  clients: ClientOption[];
  workflows: WorkflowOption[];
  recruiters: RecruiterOption[];
  currentUserId: string;
  initialClientId?: string;
}) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const creationRequestId = useRef<string | null>(null);
  const [organizationMode, setOrganizationMode] = useState<"existing" | "new">(
    clients.length ? "existing" : "new",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<
    "draft" | "publish" | null
  >(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(manualJobSchema),
    defaultValues: {
      clientId:
        initialClientId &&
        clients.some((client) => client.id === initialClientId)
          ? initialClientId
          : (clients[0]?.id ?? null),
      newOrganization: {
        name: "",
        industry: "",
        website: "",
        countryCode: "NG",
        location: "",
      },
      title: "",
      description: "",
      department: "",
      positionsRequired: 1,
      location: "",
      employmentType: "Permanent",
      workArrangement: "hybrid",
      currency: "NGN",
      priority: "normal",
      workflowTemplateId: workflows[0]?.id ?? "",
      primaryRecruiterId: currentUserId,
      applicationFormIntro: "",
      requirements: [],
      questions: [],
      publish: false,
    },
  });
  const requirements = useFieldArray({
    control: form.control,
    name: "requirements",
  });
  const questions = useFieldArray({ control: form.control, name: "questions" });
  const previewTitle = useWatch({ control: form.control, name: "title" }) ?? "";
  const previewIntro = useWatch({
    control: form.control,
    name: "applicationFormIntro",
  });
  const previewQuestions =
    useWatch({ control: form.control, name: "questions" }) ?? [];

  async function submit(values: FormValues, publish: boolean) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    creationRequestId.current ??= crypto.randomUUID();
    setSubmitError(null);
    setPendingIntent(publish ? "publish" : "draft");
    const payload = {
      ...values,
      clientId: organizationMode === "existing" ? values.clientId : null,
      newOrganization:
        organizationMode === "new" ? values.newOrganization : undefined,
      publish,
    };
    try {
      const response = await fetch("/api/v1/jobs", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-request-id": creationRequestId.current,
        },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        data?: { id: string };
        error?: { message?: string; fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok || !result.data) {
        setSubmitError(
          result.error?.message ?? "The job could not be created.",
        );
        return;
      }
      router.push(`/app/jobs/${result.data.id}`);
      router.refresh();
    } catch {
      setSubmitError(
        "We could not reach the server. Check your connection and try again.",
      );
    } finally {
      submittingRef.current = false;
      setPendingIntent(null);
    }
  }

  function handlePublishClick() {
    void form.handleSubmit((values) => submit(values, true))();
  }

  function handleDraftClick() {
    void form.handleSubmit((values) => submit(values, false))();
  }

  const errors = form.formState.errors;

  return (
    <form className="mt-6" noValidate>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
        <div className="flex flex-col gap-6">
          {submitError ? (
            <div
              role="alert"
              className="rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive"
            >
              {submitError}
            </div>
          ) : null}

          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Organization</CardTitle>
              <p className="text-sm text-muted-foreground">
                Every published role belongs to a client organization.
              </p>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <FieldSet>
                  <FieldLegend variant="label">
                    How would you like to add it?
                  </FieldLegend>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-input bg-card px-4 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.045]">
                      <input
                        type="radio"
                        name="organizationMode"
                        value="existing"
                        checked={organizationMode === "existing"}
                        onChange={() => setOrganizationMode("existing")}
                        disabled={!clients.length}
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium">
                        Choose existing
                      </span>
                    </label>
                    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-input bg-card px-4 has-[:checked]:border-primary has-[:checked]:bg-primary/[0.045]">
                      <input
                        type="radio"
                        name="organizationMode"
                        value="new"
                        checked={organizationMode === "new"}
                        onChange={() => setOrganizationMode("new")}
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium">
                        Create organization
                      </span>
                    </label>
                  </div>
                </FieldSet>
                {organizationMode === "existing" ? (
                  <Field data-invalid={Boolean(errors.clientId)}>
                    <FieldLabel htmlFor="clientId">Organization</FieldLabel>
                    <select
                      id="clientId"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                      {...form.register("clientId")}
                    >
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                    <FieldError
                      errors={
                        errors.clientId
                          ? [{ message: errors.clientId.message }]
                          : undefined
                      }
                    />
                  </Field>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={Boolean(errors.newOrganization?.name)}>
                      <FieldLabel htmlFor="organizationName">
                        Organization name
                      </FieldLabel>
                      <Input
                        id="organizationName"
                        {...form.register("newOrganization.name")}
                        aria-invalid={Boolean(errors.newOrganization?.name)}
                      />
                      <FieldError
                        errors={
                          errors.newOrganization?.name
                            ? [{ message: errors.newOrganization.name.message }]
                            : undefined
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="industry">Industry</FieldLabel>
                      <Input
                        id="industry"
                        {...form.register("newOrganization.industry")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="organizationLocation">
                        Location
                      </FieldLabel>
                      <Input
                        id="organizationLocation"
                        {...form.register("newOrganization.location")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="organizationWebsite">
                        Website
                      </FieldLabel>
                      <Input
                        id="organizationWebsite"
                        type="url"
                        {...form.register("newOrganization.website")}
                      />
                    </Field>
                  </div>
                )}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Role details</CardTitle>
              <p className="text-sm text-muted-foreground">
                Write this for candidates, not for an internal requisition form.
              </p>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(errors.title)}>
                  <FieldLabel htmlFor="title">Job title</FieldLabel>
                  <Input
                    id="title"
                    {...form.register("title")}
                    aria-invalid={Boolean(errors.title)}
                  />
                  <FieldError
                    errors={
                      errors.title
                        ? [{ message: errors.title.message }]
                        : undefined
                    }
                  />
                </Field>
                <Field data-invalid={Boolean(errors.description)}>
                  <FieldLabel htmlFor="description">Job description</FieldLabel>
                  <Textarea
                    id="description"
                    rows={10}
                    {...form.register("description")}
                    aria-invalid={Boolean(errors.description)}
                  />
                  <FieldDescription>
                    Describe the opportunity, responsibilities, outcomes, and
                    team context.
                  </FieldDescription>
                  <FieldError
                    errors={
                      errors.description
                        ? [{ message: errors.description.message }]
                        : undefined
                    }
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="department">Department</FieldLabel>
                    <Input id="department" {...form.register("department")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="employmentType">
                      Employment type
                    </FieldLabel>
                    <Input
                      id="employmentType"
                      {...form.register("employmentType")}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="positionsRequired">
                      Number of openings
                    </FieldLabel>
                    <Input
                      id="positionsRequired"
                      type="number"
                      min={1}
                      {...form.register("positionsRequired")}
                    />
                    <FieldDescription>
                      One job can track several hires for the same role.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="location">Role location</FieldLabel>
                    <Input id="location" {...form.register("location")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="workArrangement">
                      Working arrangement
                    </FieldLabel>
                    <select
                      id="workArrangement"
                      className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                      {...form.register("workArrangement")}
                    >
                      <option value="on_site">On-site</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="remote">Remote</option>
                    </select>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="deadlineAt">
                      Application deadline
                    </FieldLabel>
                    <Input
                      id="deadlineAt"
                      type="date"
                      {...form.register("deadlineAt")}
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Requirements</CardTitle>
              <p className="text-sm text-muted-foreground">
                These become the evidence checklist for screening later.
              </p>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {requirements.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-xl bg-muted/45 p-4 sm:grid-cols-[140px_minmax(0,1fr)_auto]"
                  >
                    <Field>
                      <FieldLabel htmlFor={`requirement-type-${index}`}>
                        Importance
                      </FieldLabel>
                      <select
                        id={`requirement-type-${index}`}
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                        {...form.register(`requirements.${index}.type`)}
                      >
                        <option value="required">Required</option>
                        <option value="preferred">Preferred</option>
                      </select>
                    </Field>
                    <Field
                      data-invalid={Boolean(
                        errors.requirements?.[index]?.label,
                      )}
                    >
                      <FieldLabel htmlFor={`requirement-${index}`}>
                        Requirement
                      </FieldLabel>
                      <Input
                        id={`requirement-${index}`}
                        {...form.register(`requirements.${index}.label`)}
                      />
                      <FieldError
                        errors={
                          errors.requirements?.[index]?.label
                            ? [
                                {
                                  message:
                                    errors.requirements[index]?.label?.message,
                                },
                              ]
                            : undefined
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove requirement ${index + 1}`}
                      onClick={() => requirements.remove(index)}
                      className="self-end"
                    >
                      <TrashBin2Icon aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() =>
                    requirements.append({
                      type: "required",
                      label: "",
                      description: "",
                    })
                  }
                >
                  <AddIcon data-icon="inline-start" aria-hidden="true" />
                  Add requirement
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Application form</CardTitle>
              <p className="text-sm text-muted-foreground">
                Contact details and resume are included automatically. Add only
                questions that change a decision.
              </p>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="applicationFormIntro">
                    Candidate note
                  </FieldLabel>
                  <Textarea
                    id="applicationFormIntro"
                    rows={3}
                    {...form.register("applicationFormIntro")}
                    placeholder="Tell candidates what to expect after applying."
                  />
                </Field>
                {questions.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid gap-3 rounded-xl bg-muted/45 p-4 sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                  >
                    <Field
                      data-invalid={Boolean(errors.questions?.[index]?.label)}
                    >
                      <FieldLabel htmlFor={`question-${index}`}>
                        Question
                      </FieldLabel>
                      <Input
                        id={`question-${index}`}
                        {...form.register(`questions.${index}.label`)}
                      />
                      <FieldError
                        errors={
                          errors.questions?.[index]?.label
                            ? [
                                {
                                  message:
                                    errors.questions[index]?.label?.message,
                                },
                              ]
                            : undefined
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`question-type-${index}`}>
                        Answer type
                      </FieldLabel>
                      <select
                        id={`question-type-${index}`}
                        className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                        {...form.register(`questions.${index}.questionType`)}
                      >
                        <option value="short_text">Short text</option>
                        <option value="long_text">Long text</option>
                        <option value="yes_no">Yes or no</option>
                      </select>
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove question ${index + 1}`}
                      onClick={() => questions.remove(index)}
                      className="self-end"
                    >
                      <TrashBin2Icon aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  className="w-fit"
                  onClick={() =>
                    questions.append({
                      label: "",
                      helpText: "",
                      questionType: "long_text",
                      options: [],
                      isRequired: false,
                    })
                  }
                >
                  <AddIcon data-icon="inline-start" aria-hidden="true" />
                  Add screening question
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-5 xl:sticky xl:top-22">
          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Ownership and publishing</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="primaryRecruiterId">
                    Lead recruiter
                  </FieldLabel>
                  <select
                    id="primaryRecruiterId"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    {...form.register("primaryRecruiterId")}
                  >
                    {recruiters.map((recruiter) => (
                      <option key={recruiter.userId} value={recruiter.userId}>
                        {recruiter.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="workflowTemplateId">Workflow</FieldLabel>
                  <select
                    id="workflowTemplateId"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    {...form.register("workflowTemplateId")}
                  >
                    {workflows.map((workflow) => (
                      <option key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="priority">Priority</FieldLabel>
                  <select
                    id="priority"
                    className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
                    {...form.register("priority")}
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </Field>
                <div className="rounded-xl bg-primary/[0.055] p-4 text-sm leading-6 text-primary">
                  <CheckCircleIcon
                    aria-hidden="true"
                    size={18}
                    className="mb-2"
                  />
                  Publishing creates the public job page and application link
                  immediately.
                </div>
                <Button
                  type="button"
                  size="lg"
                  disabled={pendingIntent !== null}
                  onClick={handlePublishClick}
                >
                  {pendingIntent === "publish"
                    ? "Publishing…"
                    : "Create and publish"}
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  disabled={pendingIntent !== null}
                  onClick={handleDraftClick}
                >
                  {pendingIntent === "draft" ? "Saving…" : "Save as draft"}
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Candidate application preview</CardTitle>
              <p className="text-sm leading-6 text-muted-foreground">
                These standard details are included automatically on the
                separate application page.
              </p>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Applying for
                </p>
                <p className="mt-2 font-medium">
                  {previewTitle.trim() || "Untitled role"}
                </p>
                {previewIntro?.trim() ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {previewIntro}
                  </p>
                ) : null}
              </div>
              <div className="mt-5">
                <p className="text-sm font-medium">Candidate details</p>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                  <li className="flex justify-between gap-4">
                    <span>Full name</span>
                    <span className="text-xs font-medium text-foreground">
                      Required
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Email address</span>
                    <span className="text-xs font-medium text-foreground">
                      Required
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Phone number</span>
                    <span className="text-xs">Optional</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>LinkedIn profile</span>
                    <span className="text-xs">Optional</span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Resume · PDF or DOCX</span>
                    <span className="text-xs font-medium text-foreground">
                      Required
                    </span>
                  </li>
                  <li className="flex justify-between gap-4">
                    <span>Short note</span>
                    <span className="text-xs">Optional</span>
                  </li>
                </ul>
              </div>
              <div className="mt-5 border-t pt-5">
                <p className="text-sm font-medium">Screening questions</p>
                {previewQuestions.some((question) => question.label.trim()) ? (
                  <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                    {previewQuestions
                      .filter((question) => question.label.trim())
                      .map((question, index) => (
                        <li
                          key={`${question.label}-${index}`}
                          className="flex justify-between gap-4"
                        >
                          <span>{question.label}</span>
                          <span className="shrink-0 text-xs">
                            {question.isRequired ? "Required" : "Optional"}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Add only questions that will change a screening decision.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </form>
  );
}

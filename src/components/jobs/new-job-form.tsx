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
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { manualJobSchema } from "@/lib/validation";
import { JobRoleDetails } from "./job-role-details";
import type { z } from "zod";

import { CompanyPicker } from "@/components/organizations/company-picker";
import { OrganizationFields } from "@/components/organizations/organization-fields";
import { OrganizationDuplicateHint } from "@/components/organizations/organization-duplicate-hint";

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
  agencyId,
  lookupClientId,
}: {
  clients: ClientOption[];
  workflows: WorkflowOption[];
  recruiters: RecruiterOption[];
  currentUserId: string;
  initialClientId?: string;
  agencyId: string;
  lookupClientId?: string;
}) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const creationRequestId = useRef<string | null>(null);
  const [organizationMode, setOrganizationMode] = useState<"existing" | "new">(
    clients.length ? "existing" : "new",
  );
  const [selectedOrganization, setSelectedOrganization] =
    useState<ClientOption | null>(
      clients.find((client) => client.id === initialClientId) ?? null,
    );
  const [organizationDetailsVisible, setOrganizationDetailsVisible] =
    useState(false);
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
          : null,
      newOrganization: undefined,
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
  const preview = useWatch({ control: form.control });
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
          "x-agency-id": agencyId,
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

  function focusInvalid() {
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus(),
    );
  }
  function handlePublishClick() {
    void form.handleSubmit((values) => submit(values, true), focusInvalid)();
  }

  function handleDraftClick() {
    void form.handleSubmit((values) => submit(values, false), focusInvalid)();
  }

  const errors = form.formState.errors;
  const organizationValues = useWatch({
    control: form.control,
    name: "newOrganization",
  });

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
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <CompanyPicker
                  agencyId={agencyId}
                  error={errors.clientId?.message}
                  lookupClientId={lookupClientId}
                  initialOrganizations={clients}
                  onManual={(name) => {
                    setOrganizationMode("new");
                    setOrganizationDetailsVisible(true);
                    setSelectedOrganization(null);
                    form.setValue("clientId", null);
                    if (!form.getValues("newOrganization.name"))
                      form.setValue("newOrganization.name", name);
                  }}
                  onSelect={(details, existingId) => {
                    if (existingId) {
                      setOrganizationMode("existing");
                      setSelectedOrganization({
                        id: existingId,
                        name: details.name,
                      });
                      form.setValue("clientId", existingId);
                      form.setValue("newOrganization", undefined);
                      setOrganizationDetailsVisible(false);
                      return;
                    }
                    setOrganizationMode("new");
                    setSelectedOrganization(null);
                    form.setValue("clientId", null);
                    setOrganizationDetailsVisible(true);
                    for (const key of [
                      "name",
                      "industry",
                      "website",
                      "countryCode",
                      "location",
                      "companyProfile",
                    ] as const) {
                      if (!form.getFieldState(`newOrganization.${key}`).isDirty)
                        form.setValue(`newOrganization.${key}`, details[key], {
                          shouldDirty: false,
                        });
                    }
                  }}
                />
                {organizationMode === "existing" && selectedOrganization && (
                  <div className="rounded-lg border bg-muted/25 px-4 py-3">
                    <p className="text-sm font-medium">
                      {selectedOrganization.name}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Saved organization
                    </p>
                  </div>
                )}
                {organizationMode === "new" && organizationDetailsVisible && (
                  <>
                    <OrganizationDuplicateHint
                      agencyId={agencyId}
                      name={organizationValues?.name ?? ""}
                      website={organizationValues?.website}
                      onUse={(organization) => {
                        setOrganizationMode("existing");
                        setSelectedOrganization(organization);
                        form.setValue("clientId", organization.id);
                        form.setValue("newOrganization", undefined);
                        setOrganizationDetailsVisible(false);
                      }}
                    />
                    <OrganizationFields
                      value={{
                        ...organizationValues,
                        name: organizationValues?.name ?? "",
                      }}
                      onChange={(details) => {
                        form.setValue("newOrganization", details, {
                          shouldDirty: true,
                        });
                      }}
                      errors={{
                        name: errors.newOrganization?.name,
                        website: errors.newOrganization?.website,
                        industry: errors.newOrganization?.industry,
                        location: errors.newOrganization?.location,
                        countryCode: errors.newOrganization?.countryCode,
                      }}
                    />
                  </>
                )}
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Role details</CardTitle>
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
                  <Field data-invalid={Boolean(errors.deadlineAt)}>
                    <FieldLabel htmlFor="deadlineAt">
                      Application deadline
                    </FieldLabel>
                    <Input
                      id="deadlineAt"
                      type="date"
                      {...form.register("deadlineAt")}
                      aria-invalid={Boolean(errors.deadlineAt)}
                      aria-describedby={
                        errors.deadlineAt ? "deadline-error" : undefined
                      }
                    />
                    <FieldError
                      id="deadline-error"
                      errors={
                        errors.deadlineAt
                          ? [{ message: errors.deadlineAt.message }]
                          : undefined
                      }
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="border-b pb-5">
              <CardTitle>Requirements</CardTitle>
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
                Contact details and resume are included.
              </p>
            </CardHeader>
            <CardContent>
              <FieldGroup>
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
            </CardHeader>
            <CardContent>
              <div className="mb-6 border-b pb-6">
                <p className="mb-3 text-sm font-medium">
                  {organizationMode === "new"
                    ? preview.newOrganization?.name
                    : clients.find((c) => c.id === preview.clientId)?.name}
                </p>
                <h2 className="mb-4 text-xl font-semibold">
                  {previewTitle.trim() || "Untitled role"}
                </h2>
                <JobRoleDetails
                  description={preview.description ?? ""}
                  department={preview.department}
                  location={preview.location}
                  employmentType={preview.employmentType}
                  workArrangement={preview.workArrangement}
                  positions={Number(preview.positionsRequired) || 1}
                  salaryMin={
                    preview.salaryMin === "" || preview.salaryMin == null
                      ? null
                      : Number(preview.salaryMin)
                  }
                  salaryMax={
                    preview.salaryMax === "" || preview.salaryMax == null
                      ? null
                      : Number(preview.salaryMax)
                  }
                  currency={preview.currency}
                  deadline={
                    preview.deadlineAt ? String(preview.deadlineAt) : null
                  }
                  requirements={(preview.requirements ?? [])
                    .filter((r) => r.label?.trim())
                    .map((r) => ({
                      label: r.label ?? "",
                      description: r.description,
                      type: r.type ?? "required",
                    }))}
                />
              </div>
              {preview.applicationFormIntro && (
                <p className="mb-5 whitespace-pre-wrap text-sm text-muted-foreground">
                  {preview.applicationFormIntro}
                </p>
              )}
              <div className="rounded-xl bg-muted/45 p-4">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                  Applying for
                </p>
                <p className="mt-2 font-medium">
                  {previewTitle.trim() || "Untitled role"}
                </p>
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
                          <span>
                            {question.label}
                            <span className="mt-1 block text-xs">
                              {question.questionType?.replaceAll("_", " ")}
                              {question.helpText
                                ? ` · ${question.helpText}`
                                : ""}
                              {question.options?.length
                                ? ` · ${question.options.join(", ")}`
                                : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs">
                            {question.isRequired ? "Required" : "Optional"}
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    No screening questions.
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

"use client";

import { useRef, useState } from "react";
import {
  useFieldArray,
  useForm,
  useWatch,
  type FieldErrors,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import {
  AddIcon,
  AltArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  TrashBin2Icon,
  CheckCircleIcon,
} from "@solar-icons/react/linear";
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

import {
  CompanyLogo,
  CompanyPicker,
} from "@/components/organizations/company-picker";
import { OrganizationFields } from "@/components/organizations/organization-fields";
import { OrganizationDuplicateHint } from "@/components/organizations/organization-duplicate-hint";

type FormValues = z.input<typeof manualJobSchema>;

type ClientOption = {
  id: string;
  name: string;
  website?: string;
  logoUrl?: string;
};
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
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
      employmentType: "",
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

  function focusInvalid(fieldErrors: FieldErrors<FormValues>) {
    const basicError =
      fieldErrors.clientId ||
      fieldErrors.newOrganization ||
      fieldErrors.title ||
      fieldErrors.positionsRequired;
    const roleError =
      fieldErrors.description ||
      fieldErrors.deadlineAt ||
      fieldErrors.employmentType ||
      fieldErrors.workArrangement;
    setStep(basicError ? 1 : roleError ? 2 : 3);
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus();
    });
  }
  function handlePublishClick() {
    void form.handleSubmit((values) => submit(values, true), focusInvalid)();
  }

  function handleDraftClick() {
    void form.handleSubmit((values) => submit(values, false), focusInvalid)();
  }

  function continueToDetails() {
    if (
      !form.getValues("clientId") &&
      !form.getValues("newOrganization")?.name?.trim()
    ) {
      form.setError("clientId", {
        message: "Choose an organization or create one here.",
      });
      return;
    }
    void form
      .trigger(["clientId", "newOrganization", "title", "positionsRequired"])
      .then((valid) => {
        if (valid) setStep(2);
        else
          requestAnimationFrame(() =>
            document
              .querySelector<HTMLInputElement>('[aria-invalid="true"]')
              ?.focus(),
          );
      });
  }

  function continueToHiring() {
    void form.handleSubmit(() => setStep(3), focusInvalid)();
  }

  function continueToReview() {
    void form.handleSubmit(() => setStep(4), focusInvalid)();
  }

  const errors = form.formState.errors;
  const organizationValues = useWatch({
    control: form.control,
    name: "newOrganization",
  });

  return (
    <form
      className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-cols-[271px_minmax(0,1fr)]"
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <nav
        className="flex flex-wrap gap-1 overflow-x-auto bg-[#F8F8F8] p-4 text-sm md:flex-col md:flex-nowrap md:overflow-visible md:p-5"
        aria-label="Job creation steps"
      >
        <div className="w-full pb-2 md:pb-5">
          <Dialog.Title className="text-[15px] font-semibold tracking-[-0.02em]">
            Create new job
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs leading-4 text-muted-foreground">
            Set up a role and review it before publishing.
          </Dialog.Description>
        </div>
        {(
          ["Essentials", "Role details", "Hiring setup", "Review"] as const
        ).map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={index + 1 > step}
            onClick={() => setStep((index + 1) as 1 | 2 | 3 | 4)}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left transition-colors md:w-full ${step === index + 1 ? "bg-white font-semibold text-foreground shadow-sm ring-1 ring-border" : index + 1 < step ? "text-foreground hover:bg-white/70" : "text-muted-foreground"}`}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span
              className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] ${step === index + 1 ? "bg-primary text-primary-foreground" : index + 1 < step ? "bg-emerald-500 text-white" : "border border-border bg-white"}`}
            >
              {index + 1 < step ? (
                <CheckIcon size={14} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                index + 1
              )}
            </span>
            {label}
            {step === index + 1 && (
              <AltArrowRightIcon
                size={14}
                className="ml-auto"
                aria-hidden="true"
              />
            )}
          </button>
        ))}
      </nav>
      <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[10px] border border-[#E8E8E8] bg-white">
        <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-5 pr-12">
          <div>
            <p className="text-sm font-semibold">
              {step === 1
                ? "Essentials"
                : step === 2
                  ? "Role details"
                  : step === 3
                    ? "Hiring setup"
                    : "Review"}
            </p>
          </div>
          <div
            className="flex items-center gap-2"
            aria-label={`${step} of 4 steps`}
          >
            <span className="h-1 w-20 rounded-full bg-muted sm:w-28">
              <span
                className="block h-1 rounded-full bg-primary transition-[width]"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </span>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              {step}/4 Complete
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white">
          <div className="flex min-w-0 flex-col gap-3">
            {submitError ? (
              <div
                role="alert"
                className="rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive"
              >
                {submitError}
              </div>
            ) : null}

            {step === 1 && (
              <Card
                size="sm"
                className="gap-0 bg-white py-0 ring-[#ECECEC] shadow-none"
              >
                <CardHeader className="border-b border-[#ECECEC] bg-[#F8F8F8] px-4 py-3">
                  <CardTitle>Organization</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <FieldGroup>
                    <CompanyPicker
                      agencyId={agencyId}
                      error={errors.clientId?.message}
                      lookupClientId={lookupClientId}
                      initialOrganizations={clients.map((client) => ({
                        id: client.id,
                        name: client.name,
                        website: client.website,
                        companyProfile: { logoUrl: client.logoUrl },
                      }))}
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
                            website: details.website,
                            logoUrl:
                              details.companyProfile?.logoUrl || undefined,
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
                          if (
                            !form.getFieldState(`newOrganization.${key}`)
                              .isDirty
                          )
                            form.setValue(
                              `newOrganization.${key}`,
                              details[key],
                              {
                                shouldDirty: false,
                              },
                            );
                        }
                      }}
                    />
                    {organizationMode === "existing" &&
                      selectedOrganization && (
                        <div
                          className="flex items-center gap-3 rounded-[10px] border border-primary/50 bg-primary/[0.045] px-3 py-3 ring-1 ring-primary/10"
                          aria-label={`${selectedOrganization.name} selected organization`}
                        >
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-white text-sm font-semibold text-primary">
                            {selectedOrganization.logoUrl ? (
                              <CompanyLogo src={selectedOrganization.logoUrl} />
                            ) : (
                              selectedOrganization.name
                                .slice(0, 1)
                                .toUpperCase()
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">
                              {selectedOrganization.name}
                            </span>
                            {selectedOrganization.website && (
                              <span className="block truncate text-xs text-muted-foreground">
                                {selectedOrganization.website.replace(
                                  /^https?:\/\//,
                                  "",
                                )}
                              </span>
                            )}
                          </span>
                          <CheckCircleIcon
                            size={18}
                            className="shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    {organizationMode === "new" &&
                      organizationDetailsVisible && (
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
            )}

            {(step === 1 || step === 2) && (
              <Card
                size="sm"
                className="gap-0 bg-white py-0 ring-[#ECECEC] shadow-none"
              >
                <CardHeader className="border-b border-[#ECECEC] bg-[#F8F8F8] px-4 py-3">
                  <CardTitle>
                    {step === 1 ? "The role" : "Role details"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <FieldGroup>
                    {step === 1 && (
                      <>
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
                        <Field data-invalid={Boolean(errors.positionsRequired)}>
                          <FieldLabel htmlFor="positionsRequired">
                            Number of openings
                          </FieldLabel>
                          <Input
                            id="positionsRequired"
                            type="number"
                            min={1}
                            {...form.register("positionsRequired")}
                            aria-invalid={Boolean(errors.positionsRequired)}
                          />
                          <FieldDescription>
                            One job can cover several hires for the same role.
                          </FieldDescription>
                          <FieldError
                            errors={
                              errors.positionsRequired
                                ? [
                                    {
                                      message: errors.positionsRequired.message,
                                    },
                                  ]
                                : undefined
                            }
                          />
                        </Field>
                      </>
                    )}
                    {step === 2 && (
                      <>
                        <Field data-invalid={Boolean(errors.description)}>
                          <FieldLabel htmlFor="description">
                            Job description
                          </FieldLabel>
                          <Textarea
                            id="description"
                            rows={6}
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
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="department">
                              Department
                            </FieldLabel>
                            <Input
                              id="department"
                              {...form.register("department")}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="employmentType">
                              Engagement
                            </FieldLabel>
                            <select
                              id="employmentType"
                              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                              {...form.register("employmentType")}
                            >
                              <option value="">Select engagement</option>
                              <option value="Permanent">Permanent</option>
                              <option value="Fixed-term contract">
                                Fixed-term contract
                              </option>
                              <option value="Freelance / project">
                                Freelance / project
                              </option>
                              <option value="Consulting">Consulting</option>
                              <option value="Part-time">Part-time</option>
                              <option value="Temporary">Temporary</option>
                              <option value="Internship">Internship</option>
                              <option value="Other">Other</option>
                            </select>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="location">
                              Role location
                            </FieldLabel>
                            <Input
                              id="location"
                              {...form.register("location")}
                            />
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
                      </>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <>
                <details
                  className="overflow-hidden rounded-[10px] border border-[#ECECEC] bg-white"
                  open={Boolean(errors.requirements?.length) || undefined}
                >
                  <summary className="cursor-pointer bg-[#F8F8F8] px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Requirements{" "}
                    <span className="ms-2 font-normal text-muted-foreground">
                      Optional
                    </span>
                  </summary>
                  <div className="border-t border-border p-4">
                    <FieldGroup>
                      {requirements.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-3 rounded-md border border-[#ECECEC] bg-white p-3 shadow-sm sm:grid-cols-[140px_minmax(0,1fr)_auto]"
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
                                          errors.requirements[index]?.label
                                            ?.message,
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
                  </div>
                </details>

                <details
                  className="overflow-hidden rounded-[10px] border border-[#ECECEC] bg-white"
                  open={Boolean(errors.questions?.length) || undefined}
                >
                  <summary className="cursor-pointer bg-[#F8F8F8] px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Screening questions{" "}
                    <span className="ms-2 font-normal text-muted-foreground">
                      Optional · Contact details and résumé are already included
                    </span>
                  </summary>
                  <div className="border-t border-border p-4">
                    <FieldGroup>
                      {questions.fields.map((field, index) => (
                        <div
                          key={field.id}
                          className="grid gap-3 rounded-md border border-[#ECECEC] bg-white p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_150px_auto]"
                        >
                          <Field
                            data-invalid={Boolean(
                              errors.questions?.[index]?.label,
                            )}
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
                                          errors.questions[index]?.label
                                            ?.message,
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
                              {...form.register(
                                `questions.${index}.questionType`,
                              )}
                            >
                              <option value="short_text">Short text</option>
                              <option value="long_text">Long text</option>
                              <option value="yes_no">Yes or no</option>
                              <option value="single_select">Choose one</option>
                            </select>
                          </Field>
                          <Field className="sm:col-span-2">
                            <FieldLabel htmlFor={`question-help-${index}`}>
                              Help text
                            </FieldLabel>
                            <Input
                              id={`question-help-${index}`}
                              {...form.register(`questions.${index}.helpText`)}
                            />
                          </Field>
                          {previewQuestions[index]?.questionType ===
                            "single_select" && (
                            <Field
                              className="sm:col-span-2"
                              data-invalid={Boolean(
                                errors.questions?.[index]?.options,
                              )}
                            >
                              <FieldLabel htmlFor={`question-options-${index}`}>
                                Options
                              </FieldLabel>
                              <Input
                                id={`question-options-${index}`}
                                placeholder="Separate options with commas"
                                defaultValue={previewQuestions[
                                  index
                                ]?.options?.join(", ")}
                                onChange={(event) =>
                                  form.setValue(
                                    `questions.${index}.options`,
                                    event.target.value
                                      .split(",")
                                      .map((option) => option.trim())
                                      .filter(Boolean),
                                    { shouldDirty: true, shouldValidate: true },
                                  )
                                }
                              />
                              <FieldError
                                errors={
                                  errors.questions?.[index]?.options
                                    ? [
                                        {
                                          message:
                                            errors.questions[index]?.options
                                              ?.message,
                                        },
                                      ]
                                    : undefined
                                }
                              />
                            </Field>
                          )}
                          <label className="flex items-center gap-2 text-sm sm:col-span-2">
                            <input
                              type="checkbox"
                              {...form.register(
                                `questions.${index}.isRequired`,
                              )}
                            />
                            Required to apply
                          </label>
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
                  </div>
                </details>
              </>
            )}
            {step === 3 && (
              <Card
                size="sm"
                className="gap-0 bg-white py-0 ring-[#ECECEC] shadow-none"
              >
                <CardHeader className="border-b border-[#ECECEC] bg-[#F8F8F8] px-4 py-3">
                  <CardTitle>Assignment</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
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
                          <option
                            key={recruiter.userId}
                            value={recruiter.userId}
                          >
                            {recruiter.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="workflowTemplateId">
                        Workflow
                      </FieldLabel>
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
                  </FieldGroup>
                </CardContent>
              </Card>
            )}
            {step === 4 && (
              <Card
                size="sm"
                className="gap-0 bg-white py-0 ring-[#ECECEC] shadow-none"
              >
                <CardHeader className="border-b border-[#ECECEC] bg-[#F8F8F8] px-4 py-3">
                  <CardTitle>Public job and application preview</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
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
                    {previewQuestions.some((question) =>
                      question.label.trim(),
                    ) ? (
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
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-white px-5 py-3 [&_button]:h-8">
          <div>
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(step === 4 ? 3 : step === 3 ? 2 : 1)}
              >
                <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
                Back
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {step > 1 && (
              <Button
                type="button"
                variant="outline"
                disabled={pendingIntent !== null}
                onClick={handleDraftClick}
              >
                {pendingIntent === "draft" ? "Saving…" : "Save draft"}
              </Button>
            )}
            {step === 1 && (
              <Button type="button" onClick={continueToDetails}>
                Continue{" "}
                <AltArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 2 && (
              <Button type="button" onClick={continueToHiring}>
                Continue{" "}
                <AltArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 3 && (
              <Button type="button" onClick={continueToReview}>
                Review job{" "}
                <AltArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 4 && (
              <Button
                type="button"
                disabled={pendingIntent !== null}
                onClick={handlePublishClick}
              >
                {pendingIntent === "publish"
                  ? "Publishing…"
                  : "Create and publish"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

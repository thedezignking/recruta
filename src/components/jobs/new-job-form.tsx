"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  useFieldArray,
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@base-ui/react/dialog";
import {
  AddIcon,
  AltArrowDownIcon,
  AltArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  TrashBin2Icon,
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jobDraftSchema } from "@/lib/validation";
import { JobRoleDetails } from "./job-role-details";
import { JobDescriptionEditor } from "./job-description-editor";
import type { z } from "zod";
import {
  employmentTypeOptions,
  employmentTypeToModel,
  modelToEmploymentType,
} from "@/lib/job-content";
import {
  PublicationReadiness,
  publicationIssues,
} from "./publication-readiness";
import { priorityDescriptions } from "@/lib/job-content";
import { QuestionLibraryPicker } from "./question-library-picker";

import {
  CompanyLogo,
  CompanyPicker,
} from "@/components/organizations/company-picker";
import { OrganizationFields } from "@/components/organizations/organization-fields";
import { OrganizationDuplicateHint } from "@/components/organizations/organization-duplicate-hint";

export type FormValues = z.input<typeof jobDraftSchema>;
export type DraftFormState = {
  dirty: boolean;
  pending: boolean;
  save: () => void;
};

type ClientOption = {
  id: string;
  name: string;
  website?: string;
  location?: string;
  logoUrl?: string;
};
type WorkflowOption = {
  id: string;
  name: string;
  stages?: { name: string; stage_type?: string; requires_approval?: boolean }[];
};
type RecruiterOption = { userId: string; name: string; role: string };

const currencyOptions = [
  { value: "NGN", label: "NGN · Nigerian naira" },
  { value: "USD", label: "USD · US dollar" },
  { value: "GBP", label: "GBP · British pound" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "GHS", label: "GHS · Ghanaian cedi" },
  { value: "KES", label: "KES · Kenyan shilling" },
  { value: "ZAR", label: "ZAR · South African rand" },
  { value: "CAD", label: "CAD · Canadian dollar" },
  { value: "AUD", label: "AUD · Australian dollar" },
  { value: "AED", label: "AED · UAE dirham" },
] as const;

function JobSelect({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
}: {
  id: string;
  value?: string | null;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  invalid?: boolean;
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(next) => onChange(next ?? "")}
    >
      <SelectTrigger
        id={id}
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? "job-validation-summary" : undefined}
        className="h-9 w-full rounded-md bg-white px-3"
      >
        <SelectValue placeholder={placeholder}>
          {options.find((option) => option.value === value)?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function NewJobForm({
  clients,
  workflows,
  recruiters,
  currentUserId,
  initialClientId,
  agencyId,
  lookupClientId,
  initialDraft,
  initialStep = 1,
  starter,
  onDraftStateChange,
  onSaved,
}: {
  clients: ClientOption[];
  workflows: WorkflowOption[];
  recruiters: RecruiterOption[];
  currentUserId: string;
  initialClientId?: string;
  agencyId: string;
  lookupClientId?: string;
  initialDraft?: { id: string; updatedAt: string; values: FormValues };
  initialStep?: 1 | 4;
  starter?: Pick<FormValues, "title" | "description"> | null;
  onDraftStateChange?: (state: DraftFormState) => void;
  onSaved?: () => void;
}) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const creationRequestId = useRef<string | null>(null);
  const expectedVersion = useRef(initialDraft?.updatedAt);
  const formRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(false);
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
  const [step, setStep] = useState<1 | 2 | 3 | 4>(initialStep);
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [step]);
  const [requirementsOpen, setRequirementsOpen] = useState(
    Boolean(initialDraft?.values.requirements?.length),
  );
  const [questionsOpen, setQuestionsOpen] = useState(
    Boolean(initialDraft?.values.questions?.length),
  );
  const [openSection, setOpenSection] = useState<
    "salary" | "experience" | "details" | null
  >(
    initialDraft?.values.salaryMin != null ||
      initialDraft?.values.salaryMax != null
      ? "salary"
      : initialDraft?.values.seniorityLevel
        ? "experience"
        : initialDraft?.values.department || initialDraft?.values.deadlineAt
          ? "details"
          : null,
  );
  function toggleSection(section: "salary" | "experience" | "details") {
    setOpenSection((current) => (current === section ? null : section));
  }
  const form = useForm<FormValues>({
    resolver: zodResolver(jobDraftSchema),
    defaultValues: {
      clientId:
        initialClientId &&
        clients.some((client) => client.id === initialClientId)
          ? initialClientId
          : null,
      newOrganization: undefined,
      title: starter?.title ?? "",
      description: starter?.description ?? "",
      department: "",
      positionsRequired: 1,
      location: "",
      employmentType: "",
      employmentArrangement: "",
      workingHours: "not_specified",
      remoteEligibility: "",
      remoteDetails: "",
      contractDuration: "",
      salaryVisibility: "public",
      salaryBasis: "not_specified",
      hiringReason: "",
      targetStartDate: "",
      sourcingBrief: "",
      workArrangement: undefined,
      experienceMinYears: undefined,
      seniorityLevel: "",
      currency: "NGN",
      salaryPeriod: "monthly",
      priority: "normal",
      workflowTemplateId: workflows[0]?.id ?? "",
      primaryRecruiterId: currentUserId,
      requirements: [],
      questions: [],
      publish: false,
      ...initialDraft?.values,
    },
  });
  const requirements = useFieldArray({
    control: form.control,
    name: "requirements",
  });
  const questions = useFieldArray({ control: form.control, name: "questions" });
  const previewTitle = useWatch({ control: form.control, name: "title" }) ?? "";
  const preview = useWatch({ control: form.control });
  const [initialFingerprint] = useState(() => JSON.stringify(form.getValues()));
  const dirty = JSON.stringify(preview) !== initialFingerprint;
  const [validationIssues, setValidationIssues] = useState<
    { path: string; message: string }[]
  >([]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (savedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const workArrangement = useWatch({
    control: form.control,
    name: "workArrangement",
  });
  const remoteEligibility = useWatch({
    control: form.control,
    name: "remoteEligibility",
  });
  const employmentArrangement = useWatch({
    control: form.control,
    name: "employmentArrangement",
  });
  const workingHours = useWatch({
    control: form.control,
    name: "workingHours",
  });
  const uiEmploymentType = modelToEmploymentType(
    employmentArrangement,
    workingHours,
  );
  const salaryVisibility = useWatch({
    control: form.control,
    name: "salaryVisibility",
  });
  const selectedWorkflow = workflows.find(
    (w) => w.id === preview.workflowTemplateId,
  );
  const workflowReady = Boolean(selectedWorkflow?.stages?.length);
  const ownerReady = recruiters.some(
    (r) => r.userId === preview.primaryRecruiterId,
  );
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
      location: values.workArrangement === "remote" ? "" : values.location,
      publish,
    };
    try {
      const response = await fetch(
        initialDraft ? `/api/v1/jobs/${initialDraft.id}` : "/api/v1/jobs",
        {
          method: initialDraft ? "PATCH" : "POST",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
            "x-request-id": creationRequestId.current,
            ...(initialDraft
              ? {
                  "x-expected-updated-at":
                    expectedVersion.current ?? initialDraft.updatedAt,
                }
              : {}),
          },
          body: JSON.stringify(payload),
        },
      );
      const result = (await response.json()) as {
        data?: { id: string; updated_at?: string };
        error?: { message?: string; fieldErrors?: Record<string, string[]> };
      };
      if (!response.ok || !result.data) {
        for (const [path, messages] of Object.entries(
          result.error?.fieldErrors ?? {},
        )) {
          if (messages[0])
            form.setError(path as FieldPath<FormValues>, {
              message: messages[0],
            });
        }
        setSubmitError(
          result.error?.message ?? "The job could not be created.",
        );
        return;
      }
      expectedVersion.current =
        result.data.updated_at ?? expectedVersion.current;
      creationRequestId.current = null;
      if (initialDraft && publish) {
        const publishResponse = await fetch(
          `/api/v1/jobs/${initialDraft.id}/publish`,
          {
            method: "POST",
            headers: { "x-agency-id": agencyId },
          },
        );
        if (!publishResponse.ok) {
          const publishResult = await publishResponse.json();
          setSubmitError(
            publishResult.error?.message ??
              "The draft was saved, but could not be published.",
          );
          return;
        }
      }
      savedRef.current = true;
      onSaved?.();
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
      fieldErrors.hiringReason ||
      fieldErrors.targetStartDate ||
      fieldErrors.sourcingBrief ||
      fieldErrors.title ||
      fieldErrors.positionsRequired;
    const roleError =
      fieldErrors.description ||
      fieldErrors.deadlineAt ||
      fieldErrors.employmentType ||
      fieldErrors.employmentArrangement ||
      fieldErrors.contractDuration ||
      fieldErrors.remoteEligibility ||
      fieldErrors.remoteDetails ||
      fieldErrors.workArrangement;
    setStep(
      basicError
        ? 1
        : roleError ||
            fieldErrors.location ||
            fieldErrors.salaryMin ||
            fieldErrors.salaryMax ||
            fieldErrors.experienceMinYears ||
            fieldErrors.seniorityLevel
          ? 2
          : 3,
    );
    requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus();
    });
  }
  function handlePublishClick() {
    if (validatePublication())
      void form.handleSubmit((values) => submit(values, true), focusInvalid)();
  }

  function validatePublication() {
    form.clearErrors();
    const issues = publicationIssues(
      form.getValues(),
      workflowReady,
      ownerReady,
    );
    if (!issues.length) {
      setValidationIssues([]);
      return true;
    }
    setValidationIssues(issues);
    for (const issue of issues)
      form.setError(issue.path as FieldPath<FormValues>, {
        message: issue.message,
      });
    const topLevel = Object.fromEntries(
      issues.map((issue) => [
        issue.path.split(".")[0],
        { message: issue.message },
      ]),
    ) as FieldErrors<FormValues>;
    focusInvalid(topLevel);
    return false;
  }

  function focusIssue(path: string) {
    const key = path.split(".")[0];
    setStep(
      [
        "clientId",
        "newOrganization",
        "title",
        "positionsRequired",
        "hiringReason",
        "targetStartDate",
        "sourcingBrief",
      ].includes(key)
        ? 1
        : [
              "requirements",
              "questions",
              "workflowTemplateId",
              "primaryRecruiterId",
              "priority",
            ].includes(key)
          ? 3
          : 2,
    );
    requestAnimationFrame(() => {
      const control = formRef.current?.elements.namedItem(path);
      if (control instanceof HTMLElement) {
        control.focus();
        return;
      }
      const id =
        path === "description"
          ? "description"
          : path.replace(/^questions\.(\d+)\.options$/, "question-options-$1");
      (
        formRef.current?.querySelector<HTMLElement>(`[id="${id}"]`) ??
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')
      )?.focus();
    });
  }

  function handleDraftClick() {
    setValidationIssues([]);
    void form.handleSubmit((values) => submit(values, false), focusInvalid)();
  }

  useEffect(() => {
    onDraftStateChange?.({
      dirty: dirty && !savedRef.current,
      pending: pendingIntent !== null,
      save: handleDraftClick,
    });
  });

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
            formRef.current
              ?.querySelector<HTMLInputElement>('[aria-invalid="true"]')
              ?.focus(),
          );
      });
  }

  function continueToHiring() {
    void form.handleSubmit(() => setStep(3), focusInvalid)();
  }

  function continueToReview() {
    if (validatePublication()) setStep(4);
  }

  const errors = form.formState.errors;
  const organizationValues = useWatch({
    control: form.control,
    name: "newOrganization",
  });
  const organizationLocation =
    organizationMode === "existing"
      ? selectedOrganization?.location
      : organizationValues?.location;
  useEffect(() => {
    if (
      (workArrangement === "on_site" || workArrangement === "hybrid") &&
      organizationLocation &&
      !form.getValues("location") &&
      !form.getFieldState("location").isDirty
    ) {
      form.setValue("location", organizationLocation, { shouldDirty: false });
    }
  }, [form, organizationLocation, workArrangement]);

  return (
    <form
      ref={formRef}
      aria-busy={pendingIntent !== null}
      className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[271px_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)]"
      noValidate
      onSubmit={(event) => event.preventDefault()}
    >
      <nav
        className="flex flex-wrap gap-1 overflow-x-auto bg-[#F8F8F8] p-4 text-sm md:flex-col md:flex-nowrap md:overflow-visible md:p-5"
        aria-label="Job creation steps"
      >
        <div className="w-full pb-2 md:pb-5">
          <Dialog.Title className="text-[15px] font-semibold tracking-[-0.02em]">
            {initialDraft ? "Edit draft job" : "Create new job"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 text-xs leading-4 text-muted-foreground">
            {initialDraft
              ? "Update the role, then review it before publishing."
              : "Set up a role and review it before publishing."}
          </Dialog.Description>
        </div>
        {(
          ["Essentials", "Role details", "Hiring setup", "Review"] as const
        ).map((label, index) => (
          <button
            key={label}
            type="button"
            disabled={
              pendingIntent !== null || (!initialDraft && index + 1 > step)
            }
            onClick={() => setStep((index + 1) as 1 | 2 | 3 | 4)}
            className={`flex h-8 shrink-0 items-center gap-2 rounded-md px-2 text-left transition-colors md:w-full ${step === index + 1 ? "bg-white font-semibold text-foreground shadow-sm ring-1 ring-border" : index + 1 < step ? "text-foreground hover:bg-white/70" : "text-muted-foreground"}`}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span
              className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] ${step === index + 1 || index + 1 < step ? "bg-primary text-primary-foreground" : "border border-border bg-white"}`}
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
            role="progressbar"
            aria-label="Job creation progress"
            aria-valuemin={1}
            aria-valuemax={4}
            aria-valuenow={step}
            aria-valuetext={`Step ${step} of 4`}
          >
            <span className="h-1 w-20 rounded-full bg-muted sm:w-28">
              <span
                className="block h-1 rounded-full bg-primary transition-[width]"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </span>
            <span className="hidden text-[10px] text-muted-foreground sm:inline">
              Step {step} of 4
            </span>
          </div>
        </div>
        <div
          inert={pendingIntent !== null}
          role="region"
          aria-label="Job form content"
          ref={contentRef}
          tabIndex={0}
          className="min-h-0 flex-1 overflow-y-auto p-5 [&_input]:bg-white [&_select]:bg-white [&_textarea]:bg-white"
        >
          <div className="flex min-w-0 flex-col gap-3">
            {step === 4 && (
              <>
                <PublicationReadiness
                  values={form.getValues()}
                  workflowReady={workflowReady}
                  ownerReady={ownerReady}
                  onIssue={focusIssue}
                />
                <div className="rounded-[10px] border p-4 text-sm">
                  <p className="font-medium">Internal hiring summary</p>
                  <p className="mt-2">
                    {preview.hiringReason
                      ? `Hiring reason: ${preview.hiringReason}. `
                      : ""}
                    {preview.targetStartDate
                      ? `Target start: ${preview.targetStartDate}. `
                      : ""}
                    Priority: {preview.priority ?? "normal"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {priorityDescriptions[preview.priority ?? "normal"]}
                  </p>
                  {preview.sourcingBrief && (
                    <p className="mt-2 whitespace-pre-wrap">
                      {preview.sourcingBrief}
                    </p>
                  )}
                  {preview.salaryVisibility !== "public" && (
                    <p className="mt-2">Salary amounts stay internal.</p>
                  )}
                  <p className="mt-2">
                    Workflow:{" "}
                    {selectedWorkflow?.stages?.map((s) => s.name).join(" → ") ||
                      "No stages selected"}
                  </p>
                </div>
              </>
            )}
            {validationIssues.length > 0 && (
              <div
                id="job-validation-summary"
                role="alert"
                className="rounded-[10px] border border-destructive/25 bg-destructive/5 p-3 text-sm"
              >
                <p className="font-medium">
                  Complete these details before publishing
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1">
                  {validationIssues.map((issue) => (
                    <li key={issue.path}>
                      <button
                        type="button"
                        className="text-start underline underline-offset-2 hover:text-destructive focus-visible:outline-2 focus-visible:outline-ring"
                        onClick={() => focusIssue(issue.path)}
                      >
                        {issue.message}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  You can save a draft and finish these later.
                </p>
              </div>
            )}
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
                  <CardTitle>Company</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <FieldGroup>
                    {!(
                      organizationMode === "existing" && selectedOrganization
                    ) && (
                      <CompanyPicker
                        agencyId={agencyId}
                        label="Select or add a company"
                        manualLabel="Can't find it? Add it manually"
                        error={errors.clientId?.message}
                        lookupClientId={lookupClientId}
                        initialOrganizations={clients.map((client) => ({
                          id: client.id,
                          name: client.name,
                          website: client.website,
                          location: client.location,
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
                              location: details.location,
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
                    )}
                    {organizationMode === "existing" &&
                      selectedOrganization && (
                        <div
                          className="flex items-center gap-3 rounded-[10px] border border-[#E8E8E8] bg-white px-3 py-2.5"
                          aria-label={`${selectedOrganization.name} selected`}
                        >
                          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-[#E8E8E8] bg-white text-sm font-semibold text-foreground">
                            {selectedOrganization.logoUrl ? (
                              <CompanyLogo src={selectedOrganization.logoUrl} />
                            ) : (
                              selectedOrganization.name
                                .slice(0, 1)
                                .toUpperCase()
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-foreground">
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setSelectedOrganization(null);
                              form.setValue("clientId", null);
                            }}
                          >
                            Change
                          </Button>
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
                            placeholder="e.g. Senior Product Designer"
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
                        {/* Description — the heart of the role */}
                        <Field data-invalid={Boolean(errors.description)}>
                          <FieldLabel htmlFor="description">
                            Job description
                          </FieldLabel>
                          <Controller
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <JobDescriptionEditor
                                value={field.value ?? ""}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                invalid={Boolean(errors.description)}
                              />
                            )}
                          />
                          <FieldError
                            errors={
                              errors.description
                                ? [{ message: errors.description.message }]
                                : undefined
                            }
                          />
                        </Field>

                        {/* Core role details */}
                        <div className="grid gap-5 sm:grid-cols-2">
                          <Field>
                            <FieldLabel htmlFor="employmentType">
                              Employment type
                            </FieldLabel>
                            <JobSelect
                              id="employmentType"
                              value={uiEmploymentType}
                              placeholder="Select employment type"
                              onChange={(value) => {
                                const mapped = employmentTypeToModel(value);
                                form.setValue(
                                  "employmentArrangement",
                                  mapped.employmentArrangement as FormValues["employmentArrangement"],
                                  { shouldDirty: true },
                                );
                                form.setValue(
                                  "workingHours",
                                  mapped.workingHours as FormValues["workingHours"],
                                  { shouldDirty: true },
                                );
                              }}
                              options={employmentTypeOptions.map(
                                ([value, label]) => ({ value, label }),
                              )}
                            />
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="workArrangement">
                              Workplace type
                            </FieldLabel>
                            <Controller
                              control={form.control}
                              name="workArrangement"
                              render={({ field }) => (
                                <JobSelect
                                  id="workArrangement"
                                  invalid={Boolean(errors.workArrangement)}
                                  value={field.value}
                                  onChange={field.onChange}
                                  placeholder="Select workplace type"
                                  options={[
                                    { value: "on_site", label: "On-site" },
                                    { value: "hybrid", label: "Hybrid" },
                                    { value: "remote", label: "Remote" },
                                  ]}
                                />
                              )}
                            />
                            <FieldError
                              errors={
                                errors.workArrangement
                                  ? [{ message: "Choose a workplace type." }]
                                  : undefined
                              }
                            />
                          </Field>
                          {["fixed_term", "temporary"].includes(
                            employmentArrangement ?? "",
                          ) && (
                            <Field>
                              <FieldLabel htmlFor="contractDuration">
                                Contract length
                              </FieldLabel>
                              <Input
                                id="contractDuration"
                                {...form.register("contractDuration")}
                                maxLength={160}
                                placeholder="e.g. 6 months or until project completion"
                              />
                            </Field>
                          )}
                          {(workArrangement === "on_site" ||
                            workArrangement === "hybrid") && (
                            <Field>
                              <FieldLabel htmlFor="location">
                                Job location
                              </FieldLabel>
                              <Input
                                id="location"
                                {...form.register("location")}
                                aria-invalid={Boolean(errors.location)}
                                aria-describedby={
                                  errors.location
                                    ? "job-validation-summary"
                                    : undefined
                                }
                                placeholder="City, region or address"
                              />
                            </Field>
                          )}
                        </div>
                        {workArrangement === "remote" && (
                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field>
                              <FieldLabel htmlFor="remoteEligibility">
                                Remote eligibility
                              </FieldLabel>
                              <JobSelect
                                id="remoteEligibility"
                                value={remoteEligibility}
                                placeholder="Choose eligibility"
                                onChange={(value) =>
                                  form.setValue(
                                    "remoteEligibility",
                                    value as FormValues["remoteEligibility"],
                                    { shouldDirty: true },
                                  )
                                }
                                options={[
                                  {
                                    value: "anywhere",
                                    label: "Work from anywhere",
                                  },
                                  {
                                    value: "restricted",
                                    label:
                                      "Specific countries, regions or time zones",
                                  },
                                ]}
                              />
                            </Field>
                            <Field>
                              <FieldLabel htmlFor="remoteDetails">
                                {remoteEligibility === "restricted"
                                  ? "Eligible locations or time zones"
                                  : "Remote working details (optional)"}
                              </FieldLabel>
                              <Input
                                id="remoteDetails"
                                {...form.register("remoteDetails")}
                                maxLength={500}
                                placeholder="e.g. Nigeria, with working hours in WAT"
                              />
                            </Field>
                          </div>
                        )}

                        {/* Optional details — one open at a time */}
                        <div className="overflow-hidden rounded-[10px] border border-[#ECECEC]">
                          <div>
                            <button
                              type="button"
                              aria-expanded={openSection === "salary"}
                              onClick={() => toggleSection("salary")}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-[#FAFAFA]"
                            >
                              <span className="flex items-center gap-2">
                                Salary range
                                {(preview.salaryMin != null ||
                                  preview.salaryMax != null) && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                                    Added
                                  </span>
                                )}
                              </span>
                              <AltArrowDownIcon
                                aria-hidden="true"
                                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${openSection === "salary" ? "rotate-180" : ""}`}
                              />
                            </button>
                            {openSection === "salary" && (
                              <div className="space-y-3 border-t border-[#ECECEC] px-4 pt-3 pb-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                  <Field>
                                    <FieldLabel htmlFor="salaryMin">
                                      Minimum
                                    </FieldLabel>
                                    <Input
                                      id="salaryMin"
                                      type="number"
                                      min={0}
                                      placeholder="e.g. 120000"
                                      {...form.register("salaryMin")}
                                    />
                                  </Field>
                                  <Field
                                    data-invalid={Boolean(errors.salaryMax)}
                                  >
                                    <FieldLabel htmlFor="salaryMax">
                                      Maximum
                                    </FieldLabel>
                                    <Input
                                      id="salaryMax"
                                      type="number"
                                      min={0}
                                      placeholder="e.g. 180000"
                                      aria-invalid={Boolean(errors.salaryMax)}
                                      {...form.register("salaryMax")}
                                    />
                                    <FieldError
                                      errors={
                                        errors.salaryMax
                                          ? [
                                              {
                                                message:
                                                  errors.salaryMax.message,
                                              },
                                            ]
                                          : undefined
                                      }
                                    />
                                  </Field>
                                  <Field>
                                    <FieldLabel htmlFor="currency">
                                      Currency
                                    </FieldLabel>
                                    <Controller
                                      control={form.control}
                                      name="currency"
                                      render={({ field }) => (
                                        <JobSelect
                                          id="currency"
                                          value={field.value}
                                          onChange={field.onChange}
                                          options={[...currencyOptions]}
                                          placeholder="Select currency"
                                        />
                                      )}
                                    />
                                  </Field>
                                  <Field>
                                    <FieldLabel htmlFor="salaryPeriod">
                                      Pay period
                                    </FieldLabel>
                                    <Controller
                                      control={form.control}
                                      name="salaryPeriod"
                                      render={({ field }) => (
                                        <JobSelect
                                          id="salaryPeriod"
                                          value={field.value}
                                          onChange={field.onChange}
                                          options={[
                                            {
                                              value: "hourly",
                                              label: "Hourly",
                                            },
                                            { value: "daily", label: "Daily" },
                                            {
                                              value: "weekly",
                                              label: "Weekly",
                                            },
                                            {
                                              value: "monthly",
                                              label: "Monthly",
                                            },
                                            {
                                              value: "annually",
                                              label: "Annually",
                                            },
                                          ]}
                                          placeholder="Select pay period"
                                        />
                                      )}
                                    />
                                  </Field>
                                </div>
                                <label className="flex items-center gap-2 text-sm text-foreground">
                                  <input
                                    type="checkbox"
                                    checked={salaryVisibility === "hidden"}
                                    onChange={(event) =>
                                      form.setValue(
                                        "salaryVisibility",
                                        event.target.checked
                                          ? "hidden"
                                          : "public",
                                        { shouldDirty: true },
                                      )
                                    }
                                    className="size-4 accent-primary"
                                  />
                                  Keep salary private
                                </label>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-[#ECECEC]">
                            <button
                              type="button"
                              aria-expanded={openSection === "experience"}
                              onClick={() => toggleSection("experience")}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-[#FAFAFA]"
                            >
                              <span className="flex items-center gap-2">
                                Experience level
                                {Boolean(preview.seniorityLevel) && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                                    Added
                                  </span>
                                )}
                              </span>
                              <AltArrowDownIcon
                                aria-hidden="true"
                                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${openSection === "experience" ? "rotate-180" : ""}`}
                              />
                            </button>
                            {openSection === "experience" && (
                              <div className="border-t border-[#ECECEC] px-4 pt-3 pb-4">
                                <Field className="sm:max-w-xs">
                                  <FieldLabel htmlFor="seniorityLevel">
                                    Experience level
                                  </FieldLabel>
                                  <Controller
                                    control={form.control}
                                    name="seniorityLevel"
                                    render={({ field }) => (
                                      <JobSelect
                                        id="seniorityLevel"
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select a level"
                                        options={[
                                          {
                                            value: "entry",
                                            label: "Entry level",
                                          },
                                          { value: "mid", label: "Mid level" },
                                          { value: "senior", label: "Senior" },
                                          { value: "lead", label: "Lead" },
                                          {
                                            value: "executive",
                                            label: "Executive",
                                          },
                                        ]}
                                      />
                                    )}
                                  />
                                </Field>
                              </div>
                            )}
                          </div>
                          <div className="border-t border-[#ECECEC]">
                            <button
                              type="button"
                              aria-expanded={openSection === "details"}
                              onClick={() => toggleSection("details")}
                              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-[#FAFAFA]"
                            >
                              <span className="flex items-center gap-2">
                                Deadline &amp; department
                                {Boolean(
                                  preview.department || preview.deadlineAt,
                                ) && (
                                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-normal text-muted-foreground">
                                    Added
                                  </span>
                                )}
                              </span>
                              <AltArrowDownIcon
                                aria-hidden="true"
                                className={`size-4 shrink-0 text-muted-foreground transition-transform duration-150 ${openSection === "details" ? "rotate-180" : ""}`}
                              />
                            </button>
                            {openSection === "details" && (
                              <div className="border-t border-[#ECECEC] px-4 pt-3 pb-4">
                                <div className="grid gap-5 sm:grid-cols-2">
                                  <Field>
                                    <FieldLabel htmlFor="department">
                                      Department or team
                                    </FieldLabel>
                                    <Input
                                      id="department"
                                      {...form.register("department")}
                                      maxLength={120}
                                      placeholder="e.g. Finance or Customer success"
                                    />
                                  </Field>
                                  <Field
                                    data-invalid={Boolean(errors.deadlineAt)}
                                  >
                                    <FieldLabel htmlFor="deadlineAt">
                                      Application deadline
                                    </FieldLabel>
                                    <Controller
                                      control={form.control}
                                      name="deadlineAt"
                                      render={({ field }) => (
                                        <DatePicker
                                          id="deadlineAt"
                                          value={
                                            typeof field.value === "string" ||
                                            field.value instanceof Date
                                              ? field.value
                                              : null
                                          }
                                          onChange={field.onChange}
                                          invalid={Boolean(errors.deadlineAt)}
                                          describedBy={
                                            errors.deadlineAt
                                              ? "deadline-error"
                                              : undefined
                                          }
                                          minDate={new Date()}
                                        />
                                      )}
                                    />
                                    <FieldError
                                      id="deadline-error"
                                      errors={
                                        errors.deadlineAt
                                          ? [
                                              {
                                                message:
                                                  errors.deadlineAt.message,
                                              },
                                            ]
                                          : undefined
                                      }
                                    />
                                  </Field>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </FieldGroup>
                </CardContent>
              </Card>
            )}

            {step === 3 && (
              <>
                <PublicationReadiness
                  values={form.getValues()}
                  workflowReady={workflowReady}
                  ownerReady={ownerReady}
                  onIssue={focusIssue}
                />
                <details
                  className="overflow-hidden rounded-[10px] border border-[#ECECEC] bg-white"
                  open={
                    requirementsOpen || Boolean(errors.requirements?.length)
                  }
                  onToggle={(event) =>
                    setRequirementsOpen(event.currentTarget.open)
                  }
                >
                  <summary className="cursor-pointer bg-[#F8F8F8] px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Structured criteria{" "}
                    <span className="ms-2 font-normal text-muted-foreground">
                      Optional
                    </span>
                  </summary>
                  <div className="border-t border-border p-4">
                    <p className="mb-4 text-xs leading-5 text-muted-foreground">
                      Your job description can include all requirements. Add
                      criteria here only if you want to review them one by one
                      during screening.
                    </p>
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
                            <Controller
                              control={form.control}
                              name={`requirements.${index}.type`}
                              render={({ field: selectField }) => (
                                <JobSelect
                                  id={`requirement-type-${index}`}
                                  value={selectField.value}
                                  onChange={selectField.onChange}
                                  options={[
                                    { value: "required", label: "Required" },
                                    { value: "preferred", label: "Preferred" },
                                  ]}
                                />
                              )}
                            />
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
                              aria-invalid={Boolean(
                                errors.requirements?.[index]?.label,
                              )}
                            />
                            <FieldLabel
                              htmlFor={`requirement-detail-${index}`}
                              className="mt-2 text-xs"
                            >
                              Evidence or detail (optional)
                            </FieldLabel>
                            <Input
                              id={`requirement-detail-${index}`}
                              {...form.register(
                                `requirements.${index}.description`,
                              )}
                              maxLength={1000}
                              placeholder="What experience would demonstrate this?"
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
                        disabled={requirements.fields.length >= 50}
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
                  open={questionsOpen || Boolean(errors.questions?.length)}
                  onToggle={(event) =>
                    setQuestionsOpen(event.currentTarget.open)
                  }
                >
                  <summary className="cursor-pointer bg-[#F8F8F8] px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Screening questions{" "}
                    <span className="ms-2 rounded bg-white px-1.5 py-0.5 text-[11px] font-normal text-muted-foreground ring-1 ring-border">
                      Optional
                    </span>
                  </summary>
                  <div className="border-t border-border p-4">
                    <p className="mb-3 text-xs text-foreground/75">
                      Ask only job-relevant questions that a résumé does not
                      answer. Avoid salary history, protected characteristics
                      and unnecessary sensitive information. Use required
                      questions sparingly; answers never reject candidates
                      automatically.
                    </p>
                    <QuestionLibraryPicker
                      agencyId={agencyId}
                      disabled={questions.fields.length >= 20}
                      onUse={(q) => questions.append(q)}
                    />
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
                              aria-invalid={Boolean(
                                errors.questions?.[index]?.label,
                              )}
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
                            <Controller
                              control={form.control}
                              name={`questions.${index}.questionType`}
                              render={({ field: selectField }) => (
                                <JobSelect
                                  id={`question-type-${index}`}
                                  value={selectField.value}
                                  onChange={(value) => {
                                    if (
                                      selectField.value === "single_select" &&
                                      value !== "single_select" &&
                                      previewQuestions[index]?.options
                                        ?.length &&
                                      !window.confirm(
                                        "Changing the answer type will remove these answer options. Continue?",
                                      )
                                    )
                                      return;
                                    selectField.onChange(value);
                                    if (value !== "single_select")
                                      form.setValue(
                                        `questions.${index}.options`,
                                        [],
                                      );
                                  }}
                                  options={[
                                    {
                                      value: "short_text",
                                      label: "Short text",
                                    },
                                    { value: "long_text", label: "Long text" },
                                    { value: "yes_no", label: "Yes or no" },
                                    {
                                      value: "single_select",
                                      label: "Choose one",
                                    },
                                  ]}
                                />
                              )}
                            />
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
                              <Textarea
                                id={`question-options-${index}`}
                                aria-invalid={Boolean(
                                  errors.questions?.[index]?.options,
                                )}
                                aria-describedby={
                                  errors.questions?.[index]?.options
                                    ? "job-validation-summary"
                                    : undefined
                                }
                                placeholder="One option per line · at least two different options"
                                defaultValue={previewQuestions[
                                  index
                                ]?.options?.join("\n")}
                                onChange={(event) =>
                                  form.setValue(
                                    `questions.${index}.options`,
                                    event.target.value
                                      .split("\n")
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
                        disabled={questions.fields.length >= 20}
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
                      <Controller
                        control={form.control}
                        name="primaryRecruiterId"
                        render={({ field }) => (
                          <JobSelect
                            id="primaryRecruiterId"
                            value={field.value}
                            onChange={field.onChange}
                            options={recruiters.map((recruiter) => ({
                              value: recruiter.userId,
                              label: recruiter.name,
                            }))}
                          />
                        )}
                      />
                      {(previewQuestions.length > 5 ||
                        previewQuestions.filter(
                          (q) => q.isRequired && q.questionType === "long_text",
                        ).length > 2) && (
                        <p
                          role="status"
                          className="mb-3 text-xs text-muted-foreground"
                        >
                          This is a longer application. Consider removing
                          questions or making long answers optional.
                        </p>
                      )}
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="workflowTemplateId">
                        Workflow
                      </FieldLabel>
                      <Controller
                        control={form.control}
                        name="workflowTemplateId"
                        render={({ field }) => (
                          <JobSelect
                            id="workflowTemplateId"
                            value={field.value}
                            onChange={field.onChange}
                            options={workflows.map((workflow) => ({
                              value: workflow.id,
                              label: workflow.name,
                            }))}
                          />
                        )}
                      />
                    </Field>
                    {selectedWorkflow?.stages?.length ? (
                      <ol
                        className="space-y-1 rounded-md border p-3 text-xs"
                        aria-label="Selected workflow stages"
                      >
                        {selectedWorkflow.stages.map((stage, index) => (
                          <li key={index}>
                            {index + 1}. {stage.name}
                            {stage.requires_approval
                              ? " · Approval required"
                              : ""}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Choose a workflow with stages before publishing.
                      </p>
                    )}
                    <Field>
                      <FieldLabel htmlFor="priority">Priority</FieldLabel>
                      <Controller
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                          <JobSelect
                            id="priority"
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                              { value: "low", label: "Low" },
                              { value: "normal", label: "Normal" },
                              { value: "high", label: "High" },
                              { value: "urgent", label: "Urgent" },
                            ]}
                          />
                        )}
                      />
                      <FieldDescription>
                        {priorityDescriptions[preview.priority ?? "normal"]}
                      </FieldDescription>
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
                <CardContent className="grid items-start gap-4 p-4 xl:grid-cols-2">
                  <section className="overflow-hidden rounded-[10px] border border-border bg-white">
                    <div className="border-b border-border bg-[#F8F8F8] px-4 py-3 text-xs font-semibold">
                      Public job posting
                    </div>
                    <div className="p-4">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {organizationMode === "new"
                          ? preview.newOrganization?.name
                          : clients.find((c) => c.id === preview.clientId)
                              ?.name}
                      </p>
                      <h2 className="mb-4 text-xl font-semibold tracking-[-0.025em]">
                        {previewTitle.trim() || "Untitled role"}
                      </h2>
                      <JobRoleDetails
                        description={preview.description ?? ""}
                        department={preview.department}
                        location={
                          preview.workArrangement === "remote"
                            ? null
                            : preview.location
                        }
                        employmentType={preview.employmentType}
                        employmentArrangement={preview.employmentArrangement}
                        workingHours={preview.workingHours}
                        contractDuration={preview.contractDuration}
                        remoteEligibility={preview.remoteEligibility}
                        remoteDetails={preview.remoteDetails}
                        salaryVisibility={preview.salaryVisibility}
                        salaryBasis={preview.salaryBasis}
                        workArrangement={preview.workArrangement}
                        experienceMinYears={
                          preview.experienceMinYears === "" ||
                          preview.experienceMinYears == null
                            ? null
                            : Number(preview.experienceMinYears)
                        }
                        seniorityLevel={preview.seniorityLevel}
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
                        salaryPeriod={preview.salaryPeriod}
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
                  </section>
                  <section className="overflow-hidden rounded-[10px] border border-border bg-white">
                    <div className="border-b border-border bg-[#F8F8F8] px-4 py-3 text-xs font-semibold">
                      Application form
                    </div>
                    <div className="p-4">
                      {preview.applicationFormIntro && (
                        <p className="mb-5 whitespace-pre-wrap text-sm text-muted-foreground">
                          {preview.applicationFormIntro}
                        </p>
                      )}
                      <div className="rounded-md border border-border bg-[#F8F8F8] p-3">
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
                        <p className="text-sm font-medium">
                          Screening questions
                        </p>
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
                                      {question.questionType?.replaceAll(
                                        "_",
                                        " ",
                                      )}
                                      {question.helpText
                                        ? ` · ${question.helpText}`
                                        : ""}
                                      {question.options?.length
                                        ? ` · ${question.options.join(", ")}`
                                        : ""}
                                    </span>
                                  </span>
                                  <span className="shrink-0 text-xs">
                                    {question.isRequired
                                      ? "Required"
                                      : "Optional"}
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
                    </div>
                  </section>
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
                variant="outline"
                onClick={() => setStep(step === 4 ? 3 : step === 3 ? 2 : 1)}
                disabled={pendingIntent !== null}
              >
                <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
                Back
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={pendingIntent !== null}
              onClick={handleDraftClick}
            >
              {pendingIntent === "draft" ? "Saving…" : "Save draft"}
            </Button>
            {step === 1 && (
              <Button
                type="button"
                disabled={pendingIntent !== null}
                onClick={continueToDetails}
              >
                Continue{" "}
                <AltArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 2 && (
              <Button
                type="button"
                disabled={pendingIntent !== null}
                onClick={continueToHiring}
              >
                Continue{" "}
                <AltArrowRightIcon data-icon="inline-end" aria-hidden="true" />
              </Button>
            )}
            {step === 3 && (
              <Button
                type="button"
                disabled={pendingIntent !== null}
                onClick={continueToReview}
              >
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
                  : initialDraft
                    ? "Publish job"
                    : "Create and publish"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

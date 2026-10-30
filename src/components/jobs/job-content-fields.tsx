"use client";
import { useWatch, type UseFormReturn, type FieldPath } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { arrangementLabels, arrangements } from "@/lib/job-content";
import type { FormValues } from "./new-job-form";

export function JobContentFields({
  form,
  section,
}: {
  form: UseFormReturn<FormValues>;
  section: "role" | "internal" | "salary";
}) {
  const values = useWatch({ control: form.control });
  function select(
    name: FieldPath<FormValues>,
    label: string,
    options: [string, string][],
    placeholder?: string,
  ) {
    const error = form.getFieldState(name, form.formState).error;
    return (
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <select
          id={name}
          {...form.register(name)}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <FieldError
          id={`${name}-error`}
          errors={error ? [{ message: error.message }] : undefined}
        />
      </Field>
    );
  }
  function text(
    name: FieldPath<FormValues>,
    label: string,
    maxLength: number,
    placeholder?: string,
  ) {
    const error = form.getFieldState(name, form.formState).error;
    return (
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor={name}>{label}</FieldLabel>
        <Input
          id={name}
          {...form.register(name)}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
        />
        <FieldError
          id={`${name}-error`}
          errors={error ? [{ message: error.message }] : undefined}
        />
      </Field>
    );
  }
  if (section === "role")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {select(
          "employmentArrangement",
          "Employment arrangement",
          arrangements.map((v) => [v, arrangementLabels[v]]),
          "Choose an arrangement",
        )}
        {select("workingHours", "Working hours", [
          ["not_specified", "Not specified"],
          ["full_time", "Full-time"],
          ["part_time", "Part-time"],
          ["flexible", "Flexible"],
        ])}
        {["fixed_term", "temporary"].includes(
          values.employmentArrangement ?? "",
        ) &&
          text(
            "contractDuration",
            "Contract duration",
            160,
            "e.g. 6 months or until project completion",
          )}
      </div>
    );
  if (section === "salary")
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {select("salaryVisibility", "Salary visibility", [
          ["public", "Show salary on the job ad"],
          ["hidden", "Keep amounts internal"],
          ["negotiable", "Show Salary negotiable"],
        ])}
        {select("salaryBasis", "Gross or net", [
          ["not_specified", "Not specified"],
          ["gross", "Gross · before deductions"],
          ["net", "Net · take-home pay"],
        ])}
        <p className="text-xs text-muted-foreground sm:col-span-2">
          Internal amounts are never included in the public job or employer
          portal.
        </p>
      </div>
    );
  return (
    <details className="rounded-[10px] border border-border bg-white">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
        Internal hiring brief{" "}
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          Agency team only
        </span>
      </summary>
      <div className="grid gap-4 border-t p-4 sm:grid-cols-2">
        {select(
          "hiringReason",
          "Hiring reason (optional)",
          [
            ["growth", "Team growth"],
            ["replacement", "Replacement"],
            ["project", "Project"],
            ["seasonal", "Seasonal hiring"],
            ["other", "Other"],
          ],
          "Not specified",
        )}
        <Field>
          <FieldLabel htmlFor="targetStartDate">
            Target start date (optional)
          </FieldLabel>
          <Input
            id="targetStartDate"
            type="date"
            {...form.register("targetStartDate")}
          />
          <FieldDescription>
            Internal planning date; not an application deadline.
          </FieldDescription>
          <FieldError
            errors={
              form.formState.errors.targetStartDate
                ? [{ message: form.formState.errors.targetStartDate.message }]
                : undefined
            }
          />
        </Field>
        <Field className="sm:col-span-2">
          <FieldLabel htmlFor="sourcingBrief">
            Internal sourcing brief (optional)
          </FieldLabel>
          <Textarea
            id="sourcingBrief"
            {...form.register("sourcingBrief")}
            maxLength={5000}
            rows={4}
            placeholder="Target experience, sourcing channels, employer context and team guidance"
          />
          <FieldDescription>
            Keep confidential context here. Public requirements belong in the
            role description or structured criteria.
          </FieldDescription>
        </Field>
      </div>
    </details>
  );
}

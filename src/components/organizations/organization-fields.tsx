"use client";
import { useId } from "react";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CompanyLogo } from "./company-picker";
import type { OrganizationDetails } from "@/lib/organization";

export function OrganizationFields({
  value,
  onChange,
  errors = {},
}: {
  value: OrganizationDetails;
  onChange: (value: OrganizationDetails) => void;
  errors?: Record<string, { message?: string } | undefined>;
}) {
  const prefix = useId();
  const fields = [
    { key: "name", label: "Organization name" },
    { key: "website", label: "Website", type: "url" },
    { key: "industry", label: "Industry" },
    { key: "location", label: "Head office location" },
    { key: "countryCode", label: "Country code", placeholder: "e.g. NG" },
  ] as const;
  return (
    <FieldGroup className="grid gap-5 sm:grid-cols-2">
      {value.companyProfile?.logoUrl && (
        <div className="flex items-center gap-3 sm:col-span-2">
          <span className="grid size-12 place-items-center overflow-hidden rounded-lg border bg-card">
            <CompanyLogo
              key={value.companyProfile.logoUrl}
              src={value.companyProfile.logoUrl}
            />
          </span>
          <button
            type="button"
            className="text-xs text-muted-foreground underline hover:text-foreground"
            onClick={() =>
              onChange({
                ...value,
                companyProfile: { ...value.companyProfile, logoUrl: "" },
              })
            }
          >
            Remove logo
          </button>
        </div>
      )}
      {fields.map((field) => (
        <Field key={field.key} data-invalid={Boolean(errors[field.key])}>
          <FieldLabel htmlFor={`${prefix}-${field.key}`}>
            {field.label}
          </FieldLabel>
          <Input
            id={`${prefix}-${field.key}`}
            type={"type" in field ? field.type : "text"}
            placeholder={"placeholder" in field ? field.placeholder : undefined}
            value={value[field.key] ?? ""}
            maxLength={
              field.key === "countryCode"
                ? 2
                : field.key === "website"
                  ? 500
                  : 160
            }
            onChange={(event) =>
              onChange({ ...value, [field.key]: event.target.value })
            }
            aria-invalid={Boolean(errors[field.key])}
            aria-describedby={
              errors[field.key] ? `${prefix}-${field.key}-error` : undefined
            }
          />
          <FieldError
            id={`${prefix}-${field.key}-error`}
            errors={errors[field.key] ? [errors[field.key]] : undefined}
          />
        </Field>
      ))}
      <Field>
        <FieldLabel htmlFor={`${prefix}-address`}>
          Address (optional)
        </FieldLabel>
        <Input
          id={`${prefix}-address`}
          value={value.companyProfile?.address ?? ""}
          maxLength={500}
          onChange={(event) =>
            onChange({
              ...value,
              companyProfile: {
                ...value.companyProfile,
                address: event.target.value,
              },
            })
          }
        />
      </Field>
    </FieldGroup>
  );
}

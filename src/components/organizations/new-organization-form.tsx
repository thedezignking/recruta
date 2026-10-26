"use client";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { clientSchema } from "@/lib/validation";
import { CompanyPicker } from "./company-picker";
import { OrganizationFields } from "./organization-fields";
import { OrganizationDuplicateHint } from "./organization-duplicate-hint";
import type { z } from "zod";

type Values = z.input<typeof clientSchema>;

export function NewOrganizationForm({
  agencyId,
  lookupClientId,
}: {
  agencyId: string;
  lookupClientId?: string;
}) {
  const router = useRouter();
  const creationId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [addContact, setAddContact] = useState(false);
  const [existing, setExisting] = useState<{ id: string; name: string } | null>(
    null,
  );
  const form = useForm<Values>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      countryCode: "",
      location: "",
    },
  });
  const values = useWatch({ control: form.control });
  const errors = form.formState.errors;
  async function submit(values: Values) {
    if (submitting.current) return;
    submitting.current = true;
    creationId.current ??= crypto.randomUUID();
    setError(null);
    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
          "x-request-id": creationId.current,
        },
        body: JSON.stringify({
          ...values,
          primaryContact: addContact ? values.primaryContact : undefined,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.data)
        throw new Error(
          result.error?.message ?? "The organization could not be created.",
        );
      router.push(`/app/clients/${result.data.id}`);
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Check your connection and try again.",
      );
    } finally {
      submitting.current = false;
    }
  }
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Organization details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) =>
            void form.handleSubmit(submit, () =>
              requestAnimationFrame(() =>
                document
                  .querySelector<HTMLInputElement>('[aria-invalid="true"]')
                  ?.focus(),
              ),
            )(event)
          }
          noValidate
        >
          <FieldGroup>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <CompanyPicker
              agencyId={agencyId}
              lookupClientId={lookupClientId}
              onManual={(name) => {
                setExisting(null);
                setDetailsVisible(true);
                if (!form.getValues("name")) form.setValue("name", name);
              }}
              onSelect={(details, id) => {
                if (id) {
                  setExisting({ id, name: details.name });
                  setDetailsVisible(false);
                  return;
                }
                setExisting(null);
                setDetailsVisible(true);
                for (const key of [
                  "name",
                  "industry",
                  "website",
                  "countryCode",
                  "location",
                  "companyProfile",
                ] as const) {
                  if (!form.getFieldState(key).isDirty)
                    form.setValue(key, details[key], { shouldDirty: false });
                }
              }}
            />
            {existing && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
                <p className="text-sm">
                  {existing.name} is already in your workspace.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/app/clients/${existing.id}`)}
                >
                  Open organization
                </Button>
              </div>
            )}
            {detailsVisible && (
              <>
                <OrganizationDuplicateHint
                  agencyId={agencyId}
                  name={values.name ?? ""}
                  website={values.website}
                  onUse={(organization) => {
                    setExisting(organization);
                    setDetailsVisible(false);
                  }}
                />
                <OrganizationFields
                  value={{ ...values, name: values.name ?? "" }}
                  onChange={(details) => {
                    for (const key of [
                      "name",
                      "industry",
                      "website",
                      "countryCode",
                      "location",
                      "companyProfile",
                    ] as const)
                      form.setValue(key, details[key], { shouldDirty: true });
                  }}
                  errors={errors}
                />
                <Field orientation="horizontal">
                  <input
                    id="add-contact"
                    type="checkbox"
                    checked={addContact}
                    onChange={(event) => {
                      setAddContact(event.target.checked);
                      form.setValue(
                        "primaryContact",
                        event.target.checked
                          ? { fullName: "", email: "", jobTitle: "", phone: "" }
                          : undefined,
                      );
                    }}
                  />
                  <FieldLabel htmlFor="add-contact">
                    Add a primary contact
                  </FieldLabel>
                </Field>
                {addContact && (
                  <FieldGroup className="grid gap-5 sm:grid-cols-2">
                    <FieldDescription className="sm:col-span-2">
                      Adding a contact does not send an invitation.
                    </FieldDescription>
                    <Field
                      data-invalid={Boolean(errors.primaryContact?.fullName)}
                    >
                      <FieldLabel htmlFor="contact-name">Full name</FieldLabel>
                      <Input
                        id="contact-name"
                        {...form.register("primaryContact.fullName")}
                        aria-invalid={Boolean(errors.primaryContact?.fullName)}
                        aria-describedby="contact-name-error"
                      />
                      <FieldError
                        id="contact-name-error"
                        errors={
                          errors.primaryContact?.fullName
                            ? [errors.primaryContact.fullName]
                            : undefined
                        }
                      />
                    </Field>
                    <Field data-invalid={Boolean(errors.primaryContact?.email)}>
                      <FieldLabel htmlFor="contact-email">
                        Work email
                      </FieldLabel>
                      <Input
                        id="contact-email"
                        type="email"
                        {...form.register("primaryContact.email")}
                        aria-invalid={Boolean(errors.primaryContact?.email)}
                        aria-describedby="contact-email-error"
                      />
                      <FieldError
                        id="contact-email-error"
                        errors={
                          errors.primaryContact?.email
                            ? [errors.primaryContact.email]
                            : undefined
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contact-title">Job title</FieldLabel>
                      <Input
                        id="contact-title"
                        {...form.register("primaryContact.jobTitle")}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
                      <Input
                        id="contact-phone"
                        type="tel"
                        {...form.register("primaryContact.phone")}
                      />
                    </Field>
                  </FieldGroup>
                )}
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  form.formState.isSubmitting ||
                  !detailsVisible ||
                  Boolean(existing)
                }
              >
                {form.formState.isSubmitting
                  ? "Creating…"
                  : "Create organization"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

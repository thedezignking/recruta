"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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
import type { z } from "zod";

type Values = z.input<typeof clientSchema>;

export function NewOrganizationForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<Values>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      industry: "",
      website: "",
      countryCode: "NG",
      location: "",
      primaryContact: { fullName: "", email: "", jobTitle: "", phone: "" },
    },
  });

  async function submit(values: Values) {
    setSubmitError(null);
    try {
      const response = await fetch("/api/v1/clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = (await response.json()) as {
        data?: { id: string };
        error?: { message?: string };
      };
      if (!response.ok || !result.data) {
        setSubmitError(
          result.error?.message ?? "The organization could not be created.",
        );
        return;
      }
      router.push(`/app/clients/${result.data.id}`);
      router.refresh();
    } catch {
      setSubmitError(
        "We could not reach the server. Check your connection and try again.",
      );
    }
  }

  const errors = form.formState.errors;
  return (
    <Card className="mt-6 shadow-none">
      <CardHeader className="border-b pb-5">
        <CardTitle>Organization details</CardTitle>
        <p className="text-sm text-muted-foreground">
          Add the company and the person your team works with most often.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(submit)} noValidate>
          <FieldGroup>
            {submitError ? (
              <div
                role="alert"
                className="rounded-lg bg-destructive/8 px-4 py-3 text-sm text-destructive"
              >
                {submitError}
              </div>
            ) : null}
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.name)}>
                <FieldLabel htmlFor="name">Organization name</FieldLabel>
                <Input
                  id="name"
                  {...form.register("name")}
                  aria-invalid={Boolean(errors.name)}
                />
                <FieldError
                  errors={
                    errors.name ? [{ message: errors.name.message }] : undefined
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="industry">Industry</FieldLabel>
                <Input id="industry" {...form.register("industry")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="location">Head office</FieldLabel>
                <Input id="location" {...form.register("location")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="website">Website</FieldLabel>
                <Input
                  id="website"
                  type="url"
                  inputMode="url"
                  {...form.register("website")}
                />
              </Field>
            </div>
            <div className="rounded-xl bg-muted/45 p-4">
              <h2 className="font-medium">Primary contact</h2>
              <FieldDescription className="mt-1">
                You can invite this person to the client workspace when you are
                ready.
              </FieldDescription>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field data-invalid={Boolean(errors.primaryContact?.fullName)}>
                <FieldLabel htmlFor="contactName">Full name</FieldLabel>
                <Input
                  id="contactName"
                  autoComplete="name"
                  {...form.register("primaryContact.fullName")}
                  aria-invalid={Boolean(errors.primaryContact?.fullName)}
                />
                <FieldError
                  errors={
                    errors.primaryContact?.fullName
                      ? [{ message: errors.primaryContact.fullName.message }]
                      : undefined
                  }
                />
              </Field>
              <Field data-invalid={Boolean(errors.primaryContact?.email)}>
                <FieldLabel htmlFor="email">Work email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  {...form.register("primaryContact.email")}
                  aria-invalid={Boolean(errors.primaryContact?.email)}
                />
                <FieldError
                  errors={
                    errors.primaryContact?.email
                      ? [{ message: errors.primaryContact.email.message }]
                      : undefined
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="jobTitle">Job title</FieldLabel>
                <Input
                  id="jobTitle"
                  {...form.register("primaryContact.jobTitle")}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  {...form.register("primaryContact.phone")}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
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

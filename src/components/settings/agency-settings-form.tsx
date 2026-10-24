"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type AgencyProfile = {
  name: string;
  contact_email: string;
  country_code: string;
  timezone: string;
  primary_specialization: string | null;
};

export function AgencySettingsForm({ agency }: { agency: AgencyProfile }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/v1/agency/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          contactEmail: form.get("contactEmail"),
          countryCode: form.get("countryCode"),
          timezone: form.get("timezone"),
          primarySpecialization: form.get("primarySpecialization"),
        }),
      });
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(result.error?.message ?? "Settings could not be saved.");
        return;
      }
      setMessage("Agency settings saved.");
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {message ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-success"
          >
            <CheckCircleIcon aria-hidden="true" size={18} /> {message}
          </p>
        ) : null}
        <Field>
          <FieldLabel htmlFor="agency-name">Agency name</FieldLabel>
          <Input
            id="agency-name"
            name="name"
            defaultValue={agency.name}
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="specialization">Specialization</FieldLabel>
          <Input
            id="specialization"
            name="primarySpecialization"
            defaultValue={agency.primary_specialization ?? ""}
            placeholder="e.g. Technology and product hiring"
          />
          <FieldDescription>
            Shown on your public careers page.
          </FieldDescription>
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
            <Input
              id="timezone"
              name="timezone"
              defaultValue={agency.timezone}
              required
            />
            <FieldDescription>
              Used for deadlines and activity timestamps.
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="country-code">Country code</FieldLabel>
            <Input
              id="country-code"
              name="countryCode"
              defaultValue={agency.country_code}
              maxLength={2}
              required
              className="uppercase"
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="contact-email">Public contact email</FieldLabel>
          <Input
            id="contact-email"
            name="contactEmail"
            type="email"
            defaultValue={agency.contact_email}
            required
          />
          <FieldDescription>
            Used by candidates on your public careers page.
          </FieldDescription>
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

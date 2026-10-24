"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function OnboardingForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const data = new FormData(event.currentTarget);
    const response = await fetch("/api/v1/agency/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: data.get("fullName"),
        agencyName: data.get("agencyName"),
        slug: data.get("slug"),
        contactEmail: data.get("contactEmail"),
        countryCode: "NG",
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos",
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error?.message || "Workspace setup failed.");
      setPending(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Your name</FieldLabel>
          <Input id="fullName" name="fullName" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="contactEmail">Agency contact email</FieldLabel>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="agencyName">Agency name</FieldLabel>
          <Input id="agencyName" name="agencyName" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="slug">Workspace URL</FieldLabel>
          <div className="flex items-center rounded-lg border bg-background pl-3 text-sm text-muted-foreground">
            <span>recruta.app/</span>
            <Input
              id="slug"
              name="slug"
              required
              pattern="[a-z0-9-]+"
              className="border-0 pl-1 shadow-none focus-visible:ring-0"
            />
          </div>
          <FieldDescription>
            Lowercase letters, numbers, and hyphens only.
          </FieldDescription>
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating workspace…" : "Create workspace"}
        </Button>
      </FieldGroup>
    </form>
  );
}

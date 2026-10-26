"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function AccountForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (pending) return;
        const fullName = new FormData(event.currentTarget).get("fullName");
        setPending(true);
        setMessage(null);
        setError(null);
        try {
          const response = await fetch("/api/v1/account", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ fullName }),
          });
          const body = await response.json();
          if (!response.ok)
            throw new Error(
              body.error?.message ?? "Your name could not be saved.",
            );
          setMessage("Changes saved.");
          router.refresh();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Check your connection and try again.",
          );
        } finally {
          setPending(false);
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Full name</FieldLabel>
          <Input
            id="fullName"
            name="fullName"
            autoComplete="name"
            defaultValue={name}
            required
            minLength={2}
            maxLength={120}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="accountEmail">Email</FieldLabel>
          <Input id="accountEmail" type="email" value={email} readOnly />
        </Field>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        <Button type="submit" disabled={pending} className="self-start">
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}

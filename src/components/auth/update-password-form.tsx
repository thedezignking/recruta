"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/auth/password-input";

export function UpdatePasswordForm({
  inAccount = false,
}: {
  inAccount?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setPending(true);
    setSuccess(false);
    setError(undefined);
    const password = String(new FormData(event.currentTarget).get("password"));
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      setPending(false);
      return;
    }
    try {
      const { error: updateError } = await createClient().auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Your password could not be updated. Check your connection and try again.",
      );
      setPending(false);
      return;
    }
    if (inAccount) {
      formElement.reset();
      setSuccess(true);
      setPending(false);
      return;
    }
    router.push("/login?reset=complete");
    router.refresh();
  }

  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="password">New password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            minLength={10}
            autoComplete="new-password"
            required
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        {success && (
          <p role="status" className="text-sm">
            Password updated.
          </p>
        )}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}

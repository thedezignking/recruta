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
import { Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const password = String(new FormData(event.currentTarget).get("password"));
    if (password.length < 10) {
      setError("Use at least 10 characters.");
      setPending(false);
      return;
    }
    const { error: updateError } = await createClient().auth.updateUser({
      password,
    });
    if (updateError) {
      setError(updateError.message);
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
          <Input
            id="password"
            name="password"
            type="password"
            minLength={10}
            autoComplete="new-password"
            required
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </FieldGroup>
    </form>
  );
}

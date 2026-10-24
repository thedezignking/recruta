"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [state, setState] = useState<{ error?: string; sent?: boolean }>({});
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});
    const form = new FormData(event.currentTarget);
    const { error } = await createClient().auth.resetPasswordForEmail(
      String(form.get("email")),
      { redirectTo: `${location.origin}/auth/callback?next=/update-password` },
    );
    setPending(false);
    setState(error ? { error: error.message } : { sent: true });
  }

  if (state.sent)
    return (
      <div role="status" className="rounded-lg border bg-muted/40 p-4 text-sm">
        Check your inbox for a secure password-reset link.
      </div>
    );
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Work email</FieldLabel>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />
        </Field>
        {state.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </FieldGroup>
    </form>
  );
}

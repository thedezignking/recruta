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
import { PasswordInput } from "@/components/auth/password-input";

export function SignupForm() {
  const [state, setState] = useState<{ error?: string; sent?: boolean }>({});
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});
    const form = new FormData(event.currentTarget);
    try {
      const password = String(form.get("password"));
      if (password.length < 10) throw new Error("Use at least 10 characters.");
      const { error } = await createClient().auth.signUp({
        email: String(form.get("email")),
        password,
        options: {
          data: { full_name: String(form.get("name")) },
          emailRedirectTo: `${location.origin}/auth/callback?next=/onboarding`,
        },
      });
      if (error) throw error;
      setState({ sent: true });
    } catch (caught) {
      setState({
        error:
          caught instanceof Error ? caught.message : "Account creation failed.",
      });
    } finally {
      setPending(false);
    }
  }
  if (state.sent)
    return (
      <div
        role="status"
        className="rounded-lg border border-success/20 bg-success/5 p-4 text-sm leading-6"
      >
        <p className="font-medium text-success">Check your inbox</p>
        <p className="mt-1 text-muted-foreground">
          Use the verification link we sent, then finish setting up your agency.
        </p>
      </div>
    );
  return (
    <form onSubmit={submit}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Full name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
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
        <Field>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </Field>
        {state.error && <FieldError>{state.error}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </FieldGroup>
    </form>
  );
}

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
import { PasswordInput } from "@/components/auth/password-input";
import { EmailCodeStep } from "@/components/auth/email-code-step";

export function SignupForm() {
  const router = useRouter();
  const [state, setState] = useState<{ error?: string; sentTo?: string }>({});
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setState({});
    const form = new FormData(event.currentTarget);
    try {
      const password = String(form.get("password"));
      if (password.length < 10) throw new Error("Use at least 10 characters.");
      const email = String(form.get("email")).trim();
      // Recruta emails a 6-digit code (see supabase/templates/confirmation.html).
      const { error } = await createClient().auth.signUp({
        email,
        password,
        options: { data: { full_name: String(form.get("name")) } },
      });
      if (error) throw error;
      setState({ sentTo: email });
    } catch (caught) {
      setState({
        error:
          caught instanceof Error ? caught.message : "Account creation failed.",
      });
    } finally {
      setPending(false);
    }
  }
  if (state.sentTo)
    return (
      <EmailCodeStep
        email={state.sentTo}
        onVerified={() => {
          router.replace("/onboarding");
          router.refresh();
        }}
        onBack={() => setState({})}
      />
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

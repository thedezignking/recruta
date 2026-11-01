"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

export function LoginForm({ next = "/auth/continue" }: { next?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const destination =
    next.startsWith("/") && !next.startsWith("//") ? next : "/auth/continue";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: String(form.get("password")),
      });
      // Not confirmed yet: send a fresh code and confirm here instead.
      if (authError?.code === "email_not_confirmed") {
        await supabase.auth.resend({ type: "signup", email });
        setConfirming(email);
        return;
      }
      if (authError) throw authError;
      router.push(destination);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setPending(false);
    }
  }
  if (confirming)
    return (
      <EmailCodeStep
        email={confirming}
        onVerified={() => {
          router.push(destination);
          router.refresh();
        }}
        onBack={() => setConfirming(null)}
      />
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
        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </FieldGroup>
    </form>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@solar-icons/react/bold/check-circle";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { createClient } from "@/lib/supabase/client";

export function InvitationAcceptForm({
  token,
  kind,
  setup = false,
}: {
  token: string;
  kind: "agency" | "client";
  setup?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const returnTo = `/invitations/${encodeURIComponent(token)}?kind=${kind}`;

  async function accept() {
    setPending(true);
    setError(undefined);
    try {
      if (setup) {
        if (fullName.trim().length < 2 || password.length < 10)
          throw new Error(
            "Add your name and a password of at least ten characters.",
          );
        const { error: authError } = await createClient().auth.updateUser({
          password,
          data: { full_name: fullName.trim() },
        });
        if (authError) throw authError;
      }
      const response = await fetch("/api/v1/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, kind }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          setError("Sign in with the invited email address, then return here.");
          return;
        }
        throw new Error(
          result.error?.message ?? "Invitation acceptance failed.",
        );
      }
      router.push(kind === "client" ? "/portal" : "/app");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Invitation acceptance failed.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-xl bg-success/10 text-success">
        <CheckCircleIcon aria-hidden="true" size={24} />
      </span>
      <p className="mt-4 text-sm text-muted-foreground">Secure invitation</p>
      <p className="mt-1 font-mono text-xs text-muted-foreground">
        {token.slice(0, 8)}••••
      </p>
      {error && <FieldError className="mt-4">{error}</FieldError>}
      {setup && (
        <div className="mt-5 space-y-4 text-left">
          <Field>
            <FieldLabel htmlFor="invited-name">Full name</FieldLabel>
            <Input
              id="invited-name"
              autoComplete="name"
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invited-password">Create password</FieldLabel>
            <PasswordInput
              id="invited-password"
              autoComplete="new-password"
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        </div>
      )}
      <Button
        className="mt-5 w-full"
        type="button"
        onClick={accept}
        disabled={pending}
      >
        {pending ? "Accepting…" : "Accept invitation"}
      </Button>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Already have an account?{" "}
        <Link
          className="font-medium text-primary hover:underline"
          href={`/login?next=${encodeURIComponent(returnTo)}`}
        >
          Sign in first
        </Link>
      </p>
    </div>
  );
}

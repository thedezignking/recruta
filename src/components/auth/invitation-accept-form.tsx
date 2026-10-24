"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function InvitationAcceptForm({
  token,
  kind,
}: {
  token: string;
  kind: "agency" | "client";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const returnTo = `/invitations/${encodeURIComponent(token)}?kind=${kind}`;

  async function accept() {
    setPending(true);
    setError(undefined);
    try {
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

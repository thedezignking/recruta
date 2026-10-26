"use client";

import { useState } from "react";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { AddIcon } from "@solar-icons/react/linear";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function InviteMemberForm({ agencyId }: { agencyId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("recruiter");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSentTo(null);
    try {
      const response = await fetch("/api/v1/agency/invitations", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({ email, role }),
      });
      const result = (await response.json()) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        setError(result.error?.message ?? "The invitation could not be sent.");
        return;
      }
      setSentTo(email);
      setEmail("");
      router.refresh();
    } catch {
      setError("We could not reach the server. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-muted/25 p-4">
      <FieldGroup>
        <div>
          <h2 className="font-medium">Invite a team member</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            They will receive a secure, expiring invitation by email.
          </p>
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        {sentTo ? (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-success"
          >
            <CheckCircleIcon aria-hidden="true" size={18} /> Invitation sent to{" "}
            {sentTo}.
          </p>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
          <Field>
            <FieldLabel htmlFor="invite-email">Work email</FieldLabel>
            <Input
              id="invite-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="invite-role">Role</FieldLabel>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="recruiter">Recruiter</option>
              <option value="recruitment_manager">Recruitment manager</option>
              <option value="administrator">Administrator</option>
            </select>
          </Field>
          <Button type="submit" disabled={pending}>
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            {pending ? "Sending…" : "Send invite"}
          </Button>
        </div>
        <FieldDescription>
          Administrators can manage settings and members. Recruitment managers
          and recruiters focus on delivery work.
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}

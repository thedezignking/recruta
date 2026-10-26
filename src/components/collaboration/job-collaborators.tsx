"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { getJobCollaborators } from "@/server/services/collaboration";
export function JobCollaborators({
  agencyId,
  jobId,
  clientId,
  data,
}: {
  agencyId: string;
  jobId: string;
  clientId: string;
  data: Awaited<ReturnType<typeof getJobCollaborators>>;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const invitationKey = useRef<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function send(
    url: string,
    method: string,
    payload: unknown,
    key?: string,
  ) {
    if (busy.current) return false;
    busy.current = true;
    setPending(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(url, {
        method,
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body: JSON.stringify(payload),
      });
      const b = await r.json();
      if (!r.ok)
        throw new Error(
          b.error?.message ?? "Hiring manager access could not be updated.",
        );
      setMessage(
        b.data?.delivery?.status === "failed"
          ? "Invitation saved; email delivery failed. Use Resend invitation to try again."
          : "Saved.",
      );
      router.refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setPending(false);
      busy.current = false;
    }
  }
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Hiring managers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Invite people to this job. They can review only candidates you
          explicitly share.
        </p>
        {data.members.map((m) => (
          <div
            key={m.user_id}
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <div>
              <p>{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.role.replaceAll("_", " ")}
              </p>
            </div>
            <Button
              variant="outline"
              disabled={pending}
              onClick={() =>
                void send(`/api/v1/jobs/${jobId}/collaborators`, "PATCH", {
                  userId: m.user_id,
                  action: m.hasAccess ? "revoke" : "grant",
                })
              }
            >
              {m.hasAccess ? "Remove job access" : "Grant job access"}
            </Button>
          </div>
        ))}
        {data.invitations.map((i) => (
          <div
            key={i.id}
            className="flex flex-wrap items-center justify-between gap-3 text-sm"
          >
            <p>
              {i.email}
              <span className="ml-2 text-xs text-muted-foreground">
                {new Date(i.expires_at) < new Date() ? "Expired" : "Invited"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void send(
                    `/api/v1/jobs/${jobId}/invitations/${i.id}/resend`,
                    "POST",
                    {},
                  )
                }
              >
                Resend invitation
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  void send(
                    `/api/v1/clients/${clientId}/invitations/${i.id}`,
                    "DELETE",
                    {},
                  )
                }
              >
                Revoke invitation
              </Button>
            </div>
          </div>
        ))}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const f = e.currentTarget;
            invitationKey.current ??= crypto.randomUUID();
            const d = new FormData(f);
            if (
              await send(
                `/api/v1/jobs/${jobId}/collaborators`,
                "POST",
                { email: d.get("email"), role: d.get("role") },
                invitationKey.current,
              )
            ) {
              invitationKey.current = null;
              f.reset();
            }
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="hiring-manager-email">
                Email address
              </FieldLabel>
              <Input
                id="hiring-manager-email"
                name="email"
                type="email"
                required
                maxLength={254}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="hiring-manager-role">Access</FieldLabel>
              <select
                id="hiring-manager-role"
                name="role"
                className="h-9 rounded-lg border bg-card px-3 text-sm"
              >
                <option value="hiring_manager">Hiring manager</option>
                <option value="reviewer">Reviewer (read only)</option>
              </select>
            </Field>
            <Button type="submit" variant="outline" disabled={pending}>
              {pending ? "Saving…" : "Invite to job"}
            </Button>
          </FieldGroup>
        </form>
        {error && <FieldError role="alert">{error}</FieldError>}
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

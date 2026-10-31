"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog } from "@base-ui/react/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AddIcon,
  CloseIcon,
  UsersGroupRoundedIcon,
} from "@solar-icons/react/linear";
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const activeMembers = data.members.filter((member) => member.hasAccess);
  const availableMembers = data.members.filter((member) => !member.hasAccess);
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
    <section aria-labelledby="hiring-managers-heading">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="hiring-managers-heading"
            className="text-[13px] font-semibold tracking-[-0.01em]"
          >
            Hiring managers
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Job access is separate from candidate sharing.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
          <AddIcon aria-hidden="true" />
          Add person
        </Button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-border bg-white">
        {activeMembers.length ? (
          <div className="py-1">
            {activeMembers.map((member) => (
              <div
                key={member.user_id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
                >
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {member.name}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {member.role.replaceAll("_", " ")}
                  </span>
                </span>
                <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700">
                  Job access
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() =>
                    void send(`/api/v1/jobs/${jobId}/collaborators`, "PATCH", {
                      userId: member.user_id,
                      action: "revoke",
                    })
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-md bg-[#F8F8F8] text-muted-foreground">
              <UsersGroupRoundedIcon size={18} aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">No hiring managers yet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Invite a reviewer when this job needs client input.
              </p>
            </div>
          </div>
        )}
        {data.invitations.length > 0 && (
          <div className="bg-[#FCFCFC] px-4 py-3">
            <p className="mb-2 text-xs font-semibold">Pending invitations</p>
            <div>
              {data.invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center gap-2 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {invitation.email}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(invitation.expires_at) < new Date()
                      ? "Expired"
                      : "Invited"}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      void send(
                        `/api/v1/jobs/${jobId}/invitations/${invitation.id}/resend`,
                        "POST",
                        {},
                      )
                    }
                  >
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() =>
                      void send(
                        `/api/v1/clients/${clientId}/invitations/${invitation.id}`,
                        "DELETE",
                        {},
                      )
                    }
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Dialog.Root open={inviteOpen} onOpenChange={setInviteOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-50 bg-[#111111]/35" />
          <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[10px] border border-border bg-white p-5 shadow-2xl outline-none">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <Dialog.Title className="text-base font-semibold">
                  Add a hiring manager
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-xs leading-5 text-muted-foreground">
                  Give someone access to this job, or invite them by email.
                </Dialog.Description>
              </div>
              <Dialog.Close
                render={
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Close invite"
                  />
                }
              >
                <CloseIcon aria-hidden="true" />
              </Dialog.Close>
            </div>
            <div className="grid gap-4">
              {availableMembers.length > 0 && (
                <div className="rounded-md border border-border bg-white p-3">
                  <p className="mb-2 text-xs font-semibold">
                    People already at this organization
                  </p>
                  {availableMembers.map((member) => (
                    <div
                      key={member.user_id}
                      className="flex items-center gap-2 py-1.5 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {member.name}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          void send(
                            `/api/v1/jobs/${jobId}/collaborators`,
                            "PATCH",
                            { userId: member.user_id, action: "grant" },
                          )
                        }
                      >
                        Give access
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <form
                className="rounded-md border border-border bg-[#F8F8F8] p-3"
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
                    setInviteOpen(false);
                  }
                }}
              >
                <FieldGroup className="grid gap-3">
                  <p className="text-xs font-semibold">Invite by email</p>
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
                    <FieldLabel htmlFor="hiring-manager-role">
                      Access
                    </FieldLabel>
                    <select
                      id="hiring-manager-role"
                      name="role"
                      className="h-9 rounded-md border bg-card px-3 text-sm"
                    >
                      <option value="hiring_manager">Hiring manager</option>
                      <option value="reviewer">Reviewer (read only)</option>
                    </select>
                  </Field>
                  <p className="text-xs text-muted-foreground">
                    They will see only candidates your team shares with them.
                  </p>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="justify-self-end"
                  >
                    {pending ? "Saving…" : "Invite to job"}
                  </Button>
                </FieldGroup>
              </form>
            </div>
            {error && (
              <FieldError role="alert" className="mt-3">
                {error}
              </FieldError>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {error && <FieldError role="alert">{error}</FieldError>}
      {message && (
        <p role="status" className="text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}

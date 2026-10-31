"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  applicationTransitions,
  transitionNeedsReason,
  type ApplicationAction,
} from "@/lib/applicant-operations";
import type { ApplicationStatus, AgencyRole } from "@/types/domain";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/shared/page-header";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ApplicationReview({
  applicationId,
  agencyId,
  status,
  updatedAt,
  ownerId,
  userId,
  role,
  members,
}: {
  applicationId: string;
  agencyId: string;
  status: ApplicationStatus;
  updatedAt: string;
  ownerId: string | null;
  userId: string;
  role: AgencyRole;
  members: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const version = useRef(updatedAt);
  useEffect(() => {
    version.current = updatedAt;
  }, [updatedAt]);
  const [target, setTarget] = useState<string>("");
  const [reason, setReason] = useState("");
  const [owner, setOwner] = useState(ownerId ?? "unassigned");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const inFlight = useRef(false);
  const noteKey = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const manager = role !== "recruiter";
  const reasonRequired = target
    ? transitionNeedsReason(status, target as ApplicationStatus)
    : false;

  async function send(payload: ApplicationAction) {
    if (inFlight.current || refreshing) return;
    inFlight.current = true;
    setPending(payload.action);
    setError(null);
    setSaved(null);
    try {
      const response = await fetch(`/api/v1/applications/${applicationId}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error?.message ?? "Changes could not be saved.");
      if (typeof result.data?.updated_at === "string")
        version.current = result.data.updated_at;
      if (payload.action === "note") {
        setNote("");
        noteKey.current = null;
      }
      if (payload.action === "transition") {
        setTarget("");
        setReason("");
      }
      setSaved(
        payload.action === "note"
          ? "Note added."
          : payload.action === "assign"
            ? "Owner updated."
            : "Stage updated. No email was sent.",
      );
      startRefresh(() => router.refresh());
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Changes could not be saved.",
      );
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
          <Button variant="link" onClick={() => router.refresh()}>
            Refresh application
          </Button>
        </Alert>
      )}
      {saved && (
        <p role="status" className="text-sm text-success">
          {saved}
        </p>
      )}
      <Panel title="Move stage">
        {applicationTransitions[status].length ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (target)
                void send({
                  action: "transition",
                  status: target as ApplicationStatus,
                  reason,
                  expectedUpdatedAt: version.current,
                });
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="next-stage">Move to stage</FieldLabel>
                <Select
                  value={target || null}
                  disabled={!!pending || refreshing}
                  items={applicationTransitions[status].map((value) => ({
                    value,
                    label: value
                      .replaceAll("_", " ")
                      .replace(/^./, (char) => char.toUpperCase()),
                  }))}
                  onValueChange={(value) => setTarget(value ?? "")}
                >
                  <SelectTrigger id="next-stage" className="w-full">
                    <SelectValue placeholder="Choose a stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {applicationTransitions[status].map((value) => (
                        <SelectItem key={value} value={value}>
                          {value
                            .replaceAll("_", " ")
                            .replace(/^./, (char) => char.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="stage-reason">
                  Reason{reasonRequired ? " (required)" : " (optional)"}
                </FieldLabel>
                <Textarea
                  id="stage-reason"
                  disabled={!!pending || refreshing}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={2000}
                  required={reasonRequired}
                  minLength={reasonRequired ? 5 : undefined}
                  rows={3}
                />
                <FieldDescription>
                  Internal only. Changing a stage does not email the candidate.
                </FieldDescription>
              </Field>
              <Button
                type="submit"
                className="w-full"
                disabled={!!pending || refreshing || !target}
              >
                {pending === "transition" ? "Updating…" : "Update stage"}
              </Button>
            </FieldGroup>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            This application is complete.
          </p>
        )}
      </Panel>
      <Panel title="Owner">
        {manager ? (
          <form
            className="flex items-end gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void send({
                action: "assign",
                ownerUserId: owner === "unassigned" ? null : owner,
                expectedUpdatedAt: version.current,
              });
            }}
          >
            <Field className="min-w-0 flex-1">
              <FieldLabel htmlFor="application-owner" className="sr-only">
                Application owner
              </FieldLabel>
              <Select
                value={owner}
                disabled={!!pending || refreshing}
                items={[
                  { value: "unassigned", label: "Unassigned" },
                  ...members.map((member) => ({
                    value: member.id,
                    label: member.name,
                  })),
                ]}
                onValueChange={(value) => setOwner(value ?? "unassigned")}
              >
                <SelectTrigger id="application-owner" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <Button
              variant="outline"
              type="submit"
              disabled={
                !!pending || refreshing || owner === (ownerId ?? "unassigned")
              }
            >
              {pending === "assign" ? "Saving…" : "Save"}
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {ownerId
                ? (members.find((member) => member.id === ownerId)?.name ??
                  "Former teammate")
                : "Unassigned"}
            </p>
            {!ownerId && (
              <Button
                variant="outline"
                size="sm"
                disabled={!!pending || refreshing}
                onClick={() =>
                  void send({
                    action: "assign",
                    ownerUserId: userId,
                    expectedUpdatedAt: version.current,
                  })
                }
              >
                Assign to me
              </Button>
            )}
          </div>
        )}
      </Panel>
      <Panel title="Add internal note">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            noteKey.current ??= crypto.randomUUID();
            void send({
              action: "note",
              noteId: noteKey.current,
              body: note,
            });
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="application-note" className="sr-only">
                Internal note
              </FieldLabel>
              <Textarea
                id="application-note"
                disabled={!!pending || refreshing}
                value={note}
                onChange={(event) => {
                  setNote(event.target.value);
                  noteKey.current = null;
                }}
                maxLength={5000}
                rows={4}
                required
                placeholder="Add context for your team…"
              />
              <FieldDescription>
                Visible to authorized agency reviewers only.
              </FieldDescription>
            </Field>
            <Button
              type="submit"
              variant="outline"
              className="self-end"
              disabled={!!pending || refreshing}
            >
              {pending === "note" ? "Adding…" : "Add note"}
            </Button>
          </FieldGroup>
        </form>
      </Panel>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LetterIcon } from "@solar-icons/react/linear/letter";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
import {
  candidateMessageSchema,
  messageTemplates,
} from "@/lib/applicant-processing";

export type CandidateMessageView = {
  id: string;
  message_type: string;
  subject: string | null;
  body: string | null;
  recipient_email: string;
  reply_to: string | null;
  status: string;
  attempt_count: number;
  failure_code: string | null;
  created_at: string;
  sent_at: string | null;
  delivered_at: string | null;
};
export function CandidateMessages({
  agencyId,
  applicationId,
  email,
  replyTo,
  messages,
  available,
  suppressed,
  status,
  timezone,
}: {
  agencyId: string;
  applicationId: string;
  email: string;
  replyTo: string;
  messages: CandidateMessageView[];
  available: boolean;
  suppressed: boolean;
  status: string;
  timezone: string;
}) {
  const [kind, setKind] = useState<keyof typeof messageTemplates>("custom");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);
  const key = useRef<string | null>(null);
  const router = useRouter();
  const active = messages.some((message) =>
    ["pending", "sending"].includes(message.status),
  );
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 5000);
    return () => clearInterval(timer);
  }, [active, router]);
  async function send(event: React.FormEvent) {
    event.preventDefault();
    if (busy.current) return;
    setError("");
    setNotice("");
    const parsed = candidateMessageSchema.safeParse({
      kind,
      subject,
      body,
      confirmed,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    busy.current = true;
    setPending(true);
    key.current ??= crypto.randomUUID();
    try {
      const response = await fetch(
        `/api/v1/applications/${applicationId}/messages`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
            "idempotency-key": key.current,
          },
          body: JSON.stringify(parsed.data),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "The email could not be queued.",
        );
      setSubject("");
      setBody("");
      setConfirmed(false);
      key.current = null;
      setNotice("Email queued. Delivery status appears below.");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The email could not be queued.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  async function retry(id: string, action = "retry") {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/v1/messages/${id}/${action}`, {
        method: "POST",
        headers: { "x-agency-id": agencyId },
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error?.message ?? "Delivery could not be retried.",
        );
      setNotice(
        action === "cancel"
          ? "Queued email cancelled."
          : "Email queued for retry.",
      );
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Delivery could not be retried.",
      );
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return (
    <Card id="messages">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LetterIcon size={18} aria-hidden="true" />
          Candidate email
        </CardTitle>
        <CardDescription>
          To {email} · Replies go to {replyTo}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {!available && (
          <p className="text-sm text-muted-foreground">
            Email delivery is not enabled. Your operator must configure a
            verified sending domain and the delivery worker.
          </p>
        )}
        {suppressed && (
          <Alert>
            <AlertDescription>
              Email is paused for this candidate after a delivery failure or
              complaint. Resolve the contact preference before sending again.
            </AlertDescription>
          </Alert>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
        <details>
          <summary className="cursor-pointer text-sm font-medium">
            Write an email
          </summary>
          <form className="mt-4" onSubmit={send}>
            <FieldGroup>
              <Field>
                <FieldLabel>Email template</FieldLabel>
                <Select
                  value={kind}
                  onValueChange={(value) => {
                    if (!value) return;
                    setKind(value);
                    setSubject(messageTemplates[value].subject);
                    setBody(messageTemplates[value].body);
                    setConfirmed(false);
                    key.current = null;
                  }}
                  items={Object.entries(messageTemplates).map(
                    ([value, template]) => ({ value, label: template.label }),
                  )}
                  disabled={pending}
                >
                  <SelectTrigger aria-label="Email template">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {Object.entries(messageTemplates).map(
                        ([value, template]) => (
                          <SelectItem key={value} value={value}>
                            {template.label}
                          </SelectItem>
                        ),
                      )}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="candidate-email-subject">
                  Subject
                </FieldLabel>
                <Input
                  id="candidate-email-subject"
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    key.current = null;
                  }}
                  required
                  maxLength={200}
                  disabled={pending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="candidate-email-body">Message</FieldLabel>
                <Textarea
                  id="candidate-email-body"
                  value={body}
                  onChange={(event) => {
                    setBody(event.target.value);
                    key.current = null;
                  }}
                  required
                  maxLength={10000}
                  rows={7}
                  disabled={pending}
                />
                <FieldDescription>
                  Review the full message before sending. Stage changes do not
                  send email automatically.
                </FieldDescription>
              </Field>
              {kind === "rejection" && (
                <Field>
                  <label className="flex items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="mt-1 accent-primary"
                      checked={confirmed}
                      onChange={(event) => setConfirmed(event.target.checked)}
                      required
                      disabled={pending}
                    />
                    I reviewed this rejection message and the application
                    decision.
                  </label>
                  {status !== "rejected" && (
                    <FieldDescription>
                      Move the application to Rejected before sending this
                      template.
                    </FieldDescription>
                  )}
                </Field>
              )}
              <div>
                <Button
                  type="submit"
                  disabled={
                    pending ||
                    !available ||
                    suppressed ||
                    (kind === "rejection" && status !== "rejected")
                  }
                >
                  {pending ? "Queuing…" : "Queue email"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </details>
        <section aria-label="Email history">
          <h3 className="text-sm font-medium">Email history</h3>
          {messages.length ? (
            <ol className="mt-4 flex flex-col gap-5">
              {messages.map((message) => (
                <li key={message.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap justify-between gap-2">
                    <p className="text-sm font-medium">
                      {message.subject ??
                        message.message_type.replaceAll("_", " ")}
                    </p>
                    <Badge variant="outline">
                      {message.status === "pending"
                        ? "Queued"
                        : message.status.replaceAll("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: timezone,
                    }).format(new Date(message.created_at))}{" "}
                    · {message.recipient_email}
                  </p>
                  {message.body && (
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs">
                        View message
                      </summary>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                        {message.body}
                      </p>
                    </details>
                  )}
                  {message.failure_code && (
                    <p className="mt-3 text-xs text-destructive">
                      {message.failure_code.replaceAll("_", " ")}
                    </p>
                  )}
                  {message.status === "failed" && (
                    <Button
                      type="button"
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      disabled={pending || !available || suppressed}
                      onClick={() => void retry(message.id)}
                    >
                      Retry delivery
                    </Button>
                  )}
                  {message.status === "pending" && message.body && (
                    <Button
                      type="button"
                      className="mt-3"
                      variant="outline"
                      size="sm"
                      disabled={pending}
                      onClick={() => void retry(message.id, "cancel")}
                    >
                      Cancel queued email
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              No email history yet.
            </p>
          )}
          {messages.length === 50 && (
            <p className="mt-3 text-xs text-muted-foreground">
              Showing the latest 50 messages.
            </p>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

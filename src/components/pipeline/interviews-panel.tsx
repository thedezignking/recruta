"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AddIcon,
  CalendarIcon,
  MapPointIcon,
  PhoneIcon,
  UsersGroupRoundedIcon,
  VideocameraRecordIcon,
} from "@solar-icons/react/linear";
import { Panel } from "@/components/shared/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  interviewFormatLabels,
  interviewOutcomeLabels,
  interviewStages,
  interviewStatusLabels,
} from "@/lib/pipeline";
import type { ApplicationPipeline } from "@/server/services/pipeline";
import { cn } from "cn";
import {
  isoToLocal,
  localToIso,
  usePipelineAction,
} from "./use-pipeline-action";

type Interview = ApplicationPipeline["interviews"][number];
type Member = { id: string; name: string };

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/25";
const formatIcons = {
  video: VideocameraRecordIcon,
  phone: PhoneIcon,
  in_person: MapPointIcon,
} as const;

export function InterviewsPanel({
  agencyId,
  applicationId,
  status,
  updatedAt,
  interviews,
  members,
  timezone,
}: {
  agencyId: string;
  applicationId: string;
  status: string;
  updatedAt: string;
  interviews: Interview[];
  members: Member[];
  timezone: string;
}) {
  const { run, pending, error, busy } = usePipelineAction(
    agencyId,
    applicationId,
  );
  const [scheduling, setScheduling] = useState(false);
  const canSchedule = (interviewStages as readonly string[]).includes(status);
  const names = new Map(members.map((m) => [m.id, m.name]));
  const when = (start: string, end: string) => {
    const day = new Intl.DateTimeFormat("en", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }).format(new Date(start));
    const time = new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    });
    return `${day} · ${time.format(new Date(start))} – ${time.format(new Date(end))}`;
  };

  return (
    <Panel
      title="Interviews"
      count={interviews.length || undefined}
      actions={
        canSchedule && !scheduling ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setScheduling(true)}
          >
            <AddIcon data-icon="inline-start" aria-hidden="true" />
            Schedule interview
          </Button>
        ) : null
      }
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {scheduling && (
        <ScheduleForm
          members={members}
          round={interviews.length + 1}
          busy={busy}
          pending={pending === "schedule_interview"}
          onCancel={() => setScheduling(false)}
          onSubmit={async (values) => {
            if (await run({ action: "schedule_interview", ...values }))
              setScheduling(false);
          }}
        />
      )}
      {interviews.length ? (
        <ol className={cn("flex flex-col gap-3", scheduling && "mt-5")}>
          {interviews.map((interview) => (
            <InterviewItem
              key={interview.id}
              interview={interview}
              when={when(interview.starts_at, interview.ends_at)}
              interviewers={interview.interviewer_ids
                .map((id: string) => names.get(id) ?? "Former teammate")
                .join(", ")}
              busy={busy}
              pending={pending}
              run={run}
            />
          ))}
        </ol>
      ) : (
        !scheduling && (
          <p className="text-sm text-muted-foreground">
            {canSchedule
              ? "No interviews yet."
              : "Shortlist this candidate to book interviews."}
          </p>
        )
      )}
      {["shortlisted", "client_review"].includes(status) &&
        interviews.some((i) => i.status === "scheduled") && (
          <MoveToInterview
            agencyId={agencyId}
            applicationId={applicationId}
            updatedAt={updatedAt}
          />
        )}
    </Panel>
  );
}

function ScheduleForm({
  members,
  round,
  busy,
  pending,
  onCancel,
  onSubmit,
}: {
  members: Member[];
  round: number;
  busy: boolean;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (values: {
    id: string;
    title: string;
    startsAt: string;
    endsAt: string;
    timezone: string;
    format: "video" | "phone" | "in_person";
    location: string;
    interviewerIds: string[];
    guests: string;
  }) => void;
}) {
  const [key] = useState(() => crypto.randomUUID());
  const [title, setTitle] = useState(
    round === 1 ? "First interview" : `Interview ${round}`,
  );
  const [start, setStart] = useState("");
  const [minutes, setMinutes] = useState("45");
  const [format, setFormat] = useState<"video" | "phone" | "in_person">(
    "video",
  );
  const [location, setLocation] = useState("");
  const [interviewers, setInterviewers] = useState<string[]>([]);
  const [guests, setGuests] = useState("");

  return (
    <form
      className="rounded-md bg-[#F8F8F8] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!start) return;
        const startsAt = localToIso(start);
        onSubmit({
          id: key,
          title,
          startsAt,
          endsAt: new Date(
            new Date(startsAt).getTime() + Number(minutes) * 60000,
          ).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          format,
          location,
          interviewerIds: interviewers,
          guests,
        });
      }}
    >
      <FieldGroup className="gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="interview-title">Title</FieldLabel>
            <Input
              id="interview-title"
              value={title}
              maxLength={120}
              required
              onChange={(e) => setTitle(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="interview-format">Format</FieldLabel>
            <select
              id="interview-format"
              className={selectClass}
              value={format}
              onChange={(e) => setFormat(e.target.value as typeof format)}
            >
              {Object.entries(interviewFormatLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="interview-start">Starts</FieldLabel>
            <Input
              id="interview-start"
              type="datetime-local"
              value={start}
              required
              onChange={(e) => setStart(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="interview-length">Length</FieldLabel>
            <select
              id="interview-length"
              className={selectClass}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            >
              {[15, 30, 45, 60, 90, 120].map((m) => (
                <option key={m} value={m}>
                  {m < 60
                    ? `${m} minutes`
                    : `${m / 60} hour${m > 60 ? "s" : ""}`}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="interview-location">
            {format === "video"
              ? "Meeting link"
              : format === "phone"
                ? "Phone number"
                : "Address"}{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="interview-location"
            value={location}
            maxLength={500}
            onChange={(e) => setLocation(e.target.value)}
          />
        </Field>
        <fieldset>
          <legend className="text-sm font-medium">Interviewers</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {members.map((member) => {
              const on = interviewers.includes(member.id);
              return (
                <button
                  key={member.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setInterviewers((current) =>
                      on
                        ? current.filter((id) => id !== member.id)
                        : [...current, member.id],
                    )
                  }
                  className={cn(
                    "h-7 rounded-full border px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-white hover:border-foreground/30",
                  )}
                >
                  {member.name}
                </button>
              );
            })}
          </div>
        </fieldset>
        <Field>
          <FieldLabel htmlFor="interview-guests">
            Other attendees{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </FieldLabel>
          <Input
            id="interview-guests"
            value={guests}
            maxLength={500}
            placeholder="e.g. Ada from the client's finance team"
            onChange={(e) => setGuests(e.target.value)}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          Nothing is sent to the candidate. Share the details with them by
          email.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || !start}>
            {pending ? "Scheduling…" : "Schedule"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

function InterviewItem({
  interview,
  when,
  interviewers,
  busy,
  pending,
  run,
}: {
  interview: Interview;
  when: string;
  interviewers: string;
  busy: boolean;
  pending: string | null;
  run: ReturnType<typeof usePipelineAction>["run"];
}) {
  const [mode, setMode] = useState<null | "complete" | "cancel" | "reschedule">(
    null,
  );
  const [outcome, setOutcome] = useState<"advance" | "hold" | "decline">(
    "advance",
  );
  const [text, setText] = useState("");
  const [start, setStart] = useState(() => isoToLocal(interview.starts_at));
  const FormatIcon =
    formatIcons[interview.format as keyof typeof formatIcons] ?? CalendarIcon;
  const scheduled = interview.status === "scheduled";
  const length =
    new Date(interview.ends_at).getTime() -
    new Date(interview.starts_at).getTime();

  return (
    <li className="rounded-md border border-border p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold">
            {interview.title}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              Round {interview.round}
            </span>
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarIcon aria-hidden="true" size={13} />
            {when}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-semibold",
            scheduled
              ? "bg-[#F4F4FE] text-[#4644D6]"
              : interview.status === "completed"
                ? "bg-success/10 text-success"
                : "bg-muted text-muted-foreground",
          )}
        >
          {interviewStatusLabels[interview.status] ?? interview.status}
        </span>
      </div>
      <ul className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
        <li className="flex min-w-0 items-center gap-1.5">
          <FormatIcon aria-hidden="true" size={13} className="shrink-0" />
          <span className="truncate">
            {interviewFormatLabels[interview.format]}
            {interview.location ? ` · ${interview.location}` : ""}
          </span>
        </li>
        {(interviewers || interview.guests) && (
          <li className="flex min-w-0 items-center gap-1.5">
            <UsersGroupRoundedIcon
              aria-hidden="true"
              size={13}
              className="shrink-0"
            />
            <span className="truncate">
              {[interviewers, interview.guests].filter(Boolean).join(" · ")}
            </span>
          </li>
        )}
      </ul>
      {interview.status === "completed" && interview.outcome && (
        <div className="mt-3 rounded-md bg-[#F8F8F8] px-3 py-2 text-sm">
          <p className="text-xs font-medium">
            {interviewOutcomeLabels[interview.outcome]}
          </p>
          {interview.outcome_note && (
            <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
              {interview.outcome_note}
            </p>
          )}
        </div>
      )}
      {interview.status === "cancelled" && interview.cancel_reason && (
        <p className="mt-2 text-xs text-muted-foreground">
          Cancelled: “{interview.cancel_reason}”
        </p>
      )}

      {scheduled && !mode && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setMode("complete")}
          >
            Record outcome
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setMode("reschedule")}
          >
            Reschedule
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() =>
              run({ action: "no_show_interview", id: interview.id })
            }
          >
            {pending === "no_show_interview" ? "Saving…" : "No-show"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setMode("cancel")}
          >
            Cancel
          </Button>
        </div>
      )}

      {scheduled && mode === "complete" && (
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await run({
                action: "complete_interview",
                id: interview.id,
                outcome,
                note: text,
              })
            )
              setMode(null);
          }}
        >
          <fieldset className="flex flex-wrap gap-1.5">
            <legend className="sr-only">Outcome</legend>
            {(["advance", "hold", "decline"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={outcome === value}
                onClick={() => setOutcome(value)}
                className={cn(
                  "h-7 rounded-full border px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  outcome === value
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/30",
                )}
              >
                {interviewOutcomeLabels[value]}
              </button>
            ))}
          </fieldset>
          <label className="text-xs text-muted-foreground">
            Feedback (required)
            <Textarea
              value={text}
              rows={3}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              className="mt-1"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            The outcome is a recommendation. It doesn&apos;t change the stage.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode(null)}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={busy || text.trim().length < 5}
            >
              {pending === "complete_interview" ? "Saving…" : "Save outcome"}
            </Button>
          </div>
        </form>
      )}

      {scheduled && mode === "cancel" && (
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            if (
              await run({
                action: "cancel_interview",
                id: interview.id,
                reason: text,
              })
            )
              setMode(null);
          }}
        >
          <label className="text-xs text-muted-foreground">
            Reason for cancelling (required)
            <Textarea
              value={text}
              rows={2}
              maxLength={2000}
              onChange={(e) => setText(e.target.value)}
              className="mt-1"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode(null)}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="sm"
              variant="destructive"
              disabled={busy || text.trim().length < 5}
            >
              {pending === "cancel_interview"
                ? "Cancelling…"
                : "Cancel interview"}
            </Button>
          </div>
        </form>
      )}

      {scheduled && mode === "reschedule" && (
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={async (event) => {
            event.preventDefault();
            const startsAt = localToIso(start);
            if (
              await run({
                action: "reschedule_interview",
                id: interview.id,
                startsAt,
                endsAt: new Date(
                  new Date(startsAt).getTime() + length,
                ).toISOString(),
              })
            )
              setMode(null);
          }}
        >
          <label className="text-xs text-muted-foreground">
            New start time
            <Input
              type="datetime-local"
              value={start}
              required
              onChange={(e) => setStart(e.target.value)}
              className="mt-1"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setMode(null)}
            >
              Back
            </Button>
            <Button type="submit" size="sm" disabled={busy || !start}>
              {pending === "reschedule_interview" ? "Saving…" : "Reschedule"}
            </Button>
          </div>
        </form>
      )}
    </li>
  );
}

function MoveToInterview({
  agencyId,
  applicationId,
  updatedAt,
}: {
  agencyId: string;
  applicationId: string;
  updatedAt: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "saving" | "error">("idle");
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md bg-[#F4F4FE] px-3 py-2.5 text-sm">
      <span>
        {state === "error"
          ? "The stage wasn't changed. Refresh and try again."
          : "An interview is booked. Move this application to Interview?"}
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={state === "saving"}
        onClick={async () => {
          setState("saving");
          const response = await fetch(
            `/api/v1/applications/${applicationId}`,
            {
              method: "PATCH",
              headers: {
                "content-type": "application/json",
                "x-agency-id": agencyId,
              },
              body: JSON.stringify({
                action: "transition",
                status: "interview",
                expectedUpdatedAt: updatedAt,
              }),
            },
          ).catch(() => null);
          if (response?.ok) router.refresh();
          else setState("error");
        }}
      >
        {state === "saving" ? "Moving…" : "Move to Interview"}
      </Button>
    </div>
  );
}

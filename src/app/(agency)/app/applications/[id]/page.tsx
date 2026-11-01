import { Fragment } from "react";
import Link from "next/link";
import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import {
  CalendarIcon,
  DocumentTextIcon,
  LetterIcon,
  PhoneIcon,
} from "@solar-icons/react/linear";
import { ApplicationReview } from "@/components/applications/application-review";
import { ScreeningPanel } from "@/components/applications/screening-panel";
import { CandidateMessages } from "@/components/applications/candidate-messages";
import { getScreeningRuns } from "@/server/services/screening";
import { listCandidateMessages } from "@/server/services/candidate-messages";
import {
  getProcessingSettings,
  processingAvailability,
} from "@/server/services/processing-settings";
import { OpenResumeButton } from "@/components/applications/open-resume-button";
import { DetailHeader, Panel } from "@/components/shared/page-header";
import { ToolbarBreadcrumb } from "@/components/layout/toolbar-title-context";
import { StatusBadge } from "@/components/shared/status-badge";
import { MatchBadge } from "@/components/applications/match-badge";
import { gapVerdictLabels, matchReason } from "@/lib/match-grade";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api";
import { applicationReference } from "@/lib/applicant-operations";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getApplication,
  getApplicationHistory,
  getApplicationMatch,
  listApplications,
} from "@/server/services/applications";
import { listAgencyMembers } from "@/server/services/workspace";
import { getApplicationPipeline } from "@/server/services/pipeline";
import { InterviewsPanel } from "@/components/pipeline/interviews-panel";
import { OfferCard } from "@/components/pipeline/offer-card";
import { getSubmissions } from "@/server/services/collaboration";
import { SubmissionPanel } from "@/components/collaboration/submission-panel";
import { ButtonLink } from "@/components/shared/button-link";

const pipelineEventLabels: Record<string, string> = {
  "interview.scheduled": "Interview scheduled",
  "interview.rescheduled": "Interview rescheduled",
  "interview.cancelled": "Interview cancelled",
  "interview.no_show": "Candidate missed the interview",
  "interview.completed": "Interview outcome recorded",
  "offer.drafted": "Offer drafted",
  "offer.updated": "Offer terms updated",
  "offer.extended": "Offer extended",
  "offer.accepted": "Offer accepted",
  "offer.declined": "Offer declined",
  "offer.withdrawn": "Offer withdrawn",
  "offer.expired": "Offer expired",
  "placement.recorded": "Placement recorded",
  "placement.started": "Candidate started",
  "placement.fell_through": "Placement fell through",
};

const progressStages = [
  { status: "received", label: "Received" },
  { status: "in_review", label: "In review" },
  { status: "shortlisted", label: "Shortlisted" },
  { status: "client_review", label: "Client review" },
  { status: "interview", label: "Interview" },
  { status: "offer", label: "Offer" },
  { status: "placed", label: "Placed" },
] as const;

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    notesBefore?: string;
    eventsBefore?: string;
    tab?: string;
  }>;
}) {
  const { id } = await params;
  const before = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const application = await getApplication(
    context.supabase,
    context.agencyId,
    id,
  ).catch((error) => {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  });
  const [
    history,
    team,
    related,
    agency,
    screening,
    messages,
    processing,
    intake,
    match,
    pipeline,
    job,
  ] = await Promise.all([
    getApplicationHistory(context.supabase, context.agencyId, id, {
      notes: before.notesBefore,
      events: before.eventsBefore,
    }),
    listAgencyMembers(context.supabase, context.agencyId),
    listApplications(context.supabase, context.agencyId, {
      candidateId: application.candidate_id,
    }),
    context.supabase
      .from("agencies")
      .select("timezone,contact_email")
      .eq("id", context.agencyId)
      .single(),
    getScreeningRuns(context.supabase, context.agencyId, id),
    listCandidateMessages(context.supabase, context.agencyId, id),
    getProcessingSettings(context.supabase, context.agencyId),
    context.supabase
      .from("application_intake_tasks")
      .select("status")
      .eq("agency_id", context.agencyId)
      .eq("application_id", id)
      .maybeSingle(),
    getApplicationMatch(context.supabase, context.agencyId, id),
    getApplicationPipeline(context.supabase, context.agencyId, id),
    context.supabase
      .from("jobs")
      .select("currency")
      .eq("agency_id", context.agencyId)
      .eq("id", application.job_id)
      .maybeSingle(),
  ]);
  if (agency.error) throw new Error("Agency timezone could not be loaded.");
  const date = (value: string) =>
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: agency.data.timezone,
    }).format(new Date(value));
  const names = new Map(
    team.items.map((member) => [
      member.user_id,
      member.profile?.full_name ?? "Teammate",
    ]),
  );
  const submissions = await getSubmissions(context.supabase, {
    agencyId: context.agencyId,
    applicationId: id,
  });
  const members = team.items
    .filter(
      (member) =>
        member.status === "active" &&
        (member.role !== "recruiter" ||
          application.jobs.job_assignments.some(
            (assignment) => assignment.user_id === member.user_id,
          )),
    )
    .map((member) => ({
      id: member.user_id,
      name: member.profile?.full_name ?? "Teammate",
    }));
  const otherApplications = related.items.filter((item) => item.id !== id);
  const answers = [...application.application_answers].sort(
    (a, b) =>
      a.job_application_questions.sort_order -
      b.job_application_questions.sort_order,
  );
  const candidateName = application.candidates.full_name;
  const tabs = [
    { key: "overview", label: "Overview", count: 0 },
    { key: "screening", label: "Screening", count: 0 },
    ...(pipeline.available
      ? [
          {
            key: "interviews",
            label: "Interviews",
            count: pipeline.interviews.length,
          } as const,
        ]
      : []),
    { key: "messages", label: "Messages", count: messages.length },
    {
      key: "activity",
      label: "Notes & activity",
      count: history.notes.length,
    },
  ] as const;
  const tab =
    tabs.find((item) => item.key === before.tab)?.key ??
    (before.notesBefore || before.eventsBefore ? "activity" : "overview");
  const progressIndex = progressStages.findIndex(
    (stage) => stage.status === application.status,
  );
  const closedOut = ["rejected", "withdrawn"].includes(application.status);
  const eventLabel = (event: (typeof history.events)[number]) => {
    const metadata = event.metadata as Record<string, unknown>;
    return event.event_type === "application.status_changed"
      ? `Moved from ${String(metadata.from).replaceAll("_", " ")} to ${String(metadata.to).replaceAll("_", " ")}`
      : event.event_type === "application.owner_changed"
        ? `Owner set to ${metadata.toOwner ? (names.get(String(metadata.toOwner)) ?? "former teammate") : "unassigned"}`
        : event.event_type === "application.note_added"
          ? "Internal note added"
          : event.event_type.startsWith("application.processing")
            ? "Screening processing updated"
            : event.event_type === "application.screening_corrected"
              ? "Recruiter corrected screening evidence"
              : pipelineEventLabels[event.event_type]
                ? pipelineEventLabels[event.event_type]
                : event.event_type.startsWith("communication.")
                  ? event.event_type
                      .replaceAll("communication.", "Email ")
                      .replaceAll("_", " ")
                  : event.event_type.replaceAll("_", " ");
  };
  return (
    <div className="pb-20 lg:pb-0">
      <ToolbarBreadcrumb
        parent="Applications"
        parentHref="/app/applications"
        title={candidateName}
      />
      <DetailHeader
        media={
          <span
            aria-hidden="true"
            className="grid size-11 place-items-center rounded-full bg-[#EDECFD] text-sm font-semibold text-[#4846B8]"
          >
            {candidateName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0])
              .join("")
              .toUpperCase()}
          </span>
        }
        title={candidateName}
        status={
          <span className="flex items-center gap-2">
            <StatusBadge status={application.status} />
            {match && <MatchBadge match={match} />}
          </span>
        }
        meta={[
          <Fragment key="job">
            Applied for{" "}
            <Link
              href={`/app/jobs/${application.job_id}`}
              className="font-medium text-foreground hover:text-primary"
            >
              {application.jobs.title}
            </Link>
            <span aria-hidden="true">·</span>
            {application.jobs.clients.name}
          </Fragment>,
          <Fragment key="received">
            <CalendarIcon aria-hidden="true" size={14} />
            <time dateTime={application.submitted_at}>
              {date(application.submitted_at)}
            </time>
          </Fragment>,
          <span key="source" className="capitalize">
            via {application.source.replaceAll("_", " ")}
          </span>,
          <span key="reference" className="font-mono text-[11px]">
            {applicationReference(id)}
          </span>,
        ]}
        actions={
          <>
            {application.candidate_documents[0] && (
              <OpenResumeButton
                applicationId={id}
                documentId={application.candidate_documents[0].id}
                agencyId={context.agencyId}
                prominent
              />
            )}
            <ButtonLink
              href={`mailto:${application.candidates.email}`}
              variant="outline"
            >
              <LetterIcon data-icon="inline-start" aria-hidden="true" />
              Email
            </ButtonLink>
          </>
        }
      />

      {!closedOut && progressIndex >= 0 && (
        <ol
          aria-label="Application progress"
          className="mt-4 flex items-center gap-1 overflow-x-auto"
        >
          {progressStages.map((stage, index) => {
            const done = index < progressIndex;
            const current = index === progressIndex;
            return (
              <li
                key={stage.status}
                aria-current={current ? "step" : undefined}
                className="flex min-w-[104px] flex-1 flex-col gap-1.5"
              >
                <span
                  aria-hidden="true"
                  className={`h-1 rounded-full ${done || current ? "bg-primary" : "bg-[#EBEBEB]"}`}
                />
                <span
                  className={`text-[11px] ${current ? "font-semibold text-foreground" : done ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {stage.label}
                  {done && <span className="sr-only"> (complete)</span>}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      {application.submitted_profile?.fullName &&
        application.submitted_profile.fullName.trim().toLowerCase() !==
          candidateName.trim().toLowerCase() && (
          <Alert className="mt-5">
            <AlertTitle>Check candidate identity</AlertTitle>
            <AlertDescription>
              This application was submitted as{" "}
              {application.submitted_profile.fullName}, using an email already
              linked to {candidateName}. The existing name was preserved.
              Confirm the identity before sharing or making a decision.
            </AlertDescription>
          </Alert>
        )}

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <nav
            aria-label="Application sections"
            className="flex gap-1 overflow-x-auto border-b border-border"
          >
            {tabs.map((item) => (
              <Link
                key={item.key}
                href={
                  item.key === "overview"
                    ? `/app/applications/${id}`
                    : `/app/applications/${id}?tab=${item.key}`
                }
                scroll={false}
                aria-current={tab === item.key ? "page" : undefined}
                className={`-mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 px-3 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset ${tab === item.key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {item.label}
                {item.count ? (
                  <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            ))}
          </nav>

          <div className="mt-5 flex flex-col gap-5">
            {tab === "overview" && (
              <>
                {match && (
                  <Panel
                    title="Requirement match"
                    actions={
                      <span className="text-xs text-muted-foreground">
                        Advisory · you decide
                      </span>
                    }
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <MatchBadge match={match} />
                      <span className="text-sm text-muted-foreground">
                        {matchReason(match)}
                      </span>
                    </div>
                    {match.gaps.length > 0 ? (
                      <ul className="mt-4 flex flex-col gap-2.5">
                        {match.gaps.map((gap) => (
                          <li
                            key={gap.requirementId}
                            className="rounded-md bg-[#F8F8F8] px-3 py-2.5"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm font-medium">
                                {gap.label}
                                <span className="ml-2 text-xs font-normal text-muted-foreground">
                                  {gap.type === "required"
                                    ? "Required"
                                    : "Preferred"}
                                </span>
                              </span>
                              <span className="text-xs font-medium text-[#8C5109]">
                                {gapVerdictLabels[gap.verdict]}
                              </span>
                            </div>
                            {gap.followUp && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Ask: {gap.followUp}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Every requirement is supported by the CV or answers.
                      </p>
                    )}
                  </Panel>
                )}
                {application.cover_note && (
                  <Panel title="Message from the candidate">
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">
                      {application.cover_note}
                    </p>
                  </Panel>
                )}
                <Panel
                  title="Screening answers"
                  count={answers.length || undefined}
                >
                  {answers.length ? (
                    <dl className="flex flex-col gap-5">
                      {answers.map((answer, index) => (
                        <div
                          key={answer.id}
                          className="grid gap-1.5 sm:grid-cols-[24px_minmax(0,1fr)]"
                        >
                          <span
                            aria-hidden="true"
                            className="hidden text-xs tabular-nums text-muted-foreground sm:block"
                          >
                            {index + 1}.
                          </span>
                          <div className="min-w-0">
                            <dt className="text-xs font-medium text-muted-foreground">
                              {answer.job_application_questions.label}
                            </dt>
                            <dd className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                              {typeof answer.answer === "boolean"
                                ? answer.answer
                                  ? "Yes"
                                  : "No"
                                : typeof answer.answer === "string" ||
                                    typeof answer.answer === "number"
                                  ? String(answer.answer) || "—"
                                  : JSON.stringify(answer.answer)}
                            </dd>
                          </div>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      This application has no screening answers.
                    </p>
                  )}
                </Panel>
                <Panel
                  title="Documents"
                  count={application.candidate_documents.length || undefined}
                  bodyClassName="p-0"
                >
                  {application.candidate_documents.length ? (
                    <ul className="py-1">
                      {application.candidate_documents.map((document) => (
                        <li
                          key={document.id}
                          className="flex items-center justify-between gap-4 px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-[#F8F8F8] text-muted-foreground">
                              <DocumentTextIcon aria-hidden="true" size={18} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {document.file_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(document.size_bytes / 1024).toFixed(0)} KB ·
                                Private
                              </p>
                            </div>
                          </div>
                          <OpenResumeButton
                            applicationId={id}
                            documentId={document.id}
                            agencyId={context.agencyId}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                      No documents attached.
                    </p>
                  )}
                </Panel>
              </>
            )}
            {tab === "interviews" && (
              <InterviewsPanel
                agencyId={context.agencyId}
                applicationId={id}
                status={application.status}
                updatedAt={application.updated_at}
                interviews={pipeline.interviews}
                members={team.items
                  .filter((member) => member.status === "active")
                  .map((member) => ({
                    id: member.user_id,
                    name: member.profile?.full_name ?? "Teammate",
                  }))}
                timezone={agency.data.timezone}
              />
            )}
            {tab === "screening" && (
              <ScreeningPanel
                agencyId={context.agencyId}
                applicationId={id}
                data={screening}
                documents={application.candidate_documents}
                enabled={
                  processing.screeningEnabled &&
                  processingAvailability().screening
                }
                timezone={agency.data.timezone}
                intakeFailed={intake.data?.status === "failed"}
              />
            )}
            {tab === "messages" && (
              <CandidateMessages
                agencyId={context.agencyId}
                applicationId={id}
                email={application.candidates.email}
                replyTo={agency.data.contact_email}
                messages={messages}
                available={processingAvailability().email}
                suppressed={application.candidates.email_suppressed}
                status={application.status}
                timezone={agency.data.timezone}
              />
            )}
            {tab === "activity" && (
              <>
                <Panel
                  title="Internal notes"
                  count={history.notes.length || undefined}
                >
                  {history.notes.length ? (
                    <ol className="flex flex-col gap-4">
                      {history.notes.map((note) => {
                        const author =
                          names.get(note.author_user_id) ?? "Former teammate";
                        return (
                          <li key={note.id} className="flex gap-3">
                            <span
                              aria-hidden="true"
                              className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                            >
                              {author.slice(0, 1).toUpperCase()}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs">
                                <span className="font-medium">{author}</span>
                                <time
                                  dateTime={note.created_at}
                                  className="text-muted-foreground"
                                >
                                  {date(note.created_at)}
                                </time>
                              </div>
                              <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-[#F8F8F8] px-3 py-2 text-sm leading-6">
                                {note.body}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No internal notes yet.
                    </p>
                  )}
                  {(history.notesNext || before.notesBefore) && (
                    <div className="mt-4 flex gap-2">
                      {history.notesNext && (
                        <ButtonLink
                          variant="outline"
                          size="sm"
                          href={`/app/applications/${id}?tab=activity&notesBefore=${history.notesNext}${before.eventsBefore ? `&eventsBefore=${encodeURIComponent(before.eventsBefore)}` : ""}`}
                        >
                          Older notes
                        </ButtonLink>
                      )}
                      {before.notesBefore && (
                        <ButtonLink
                          variant="ghost"
                          size="sm"
                          href={`/app/applications/${id}?tab=activity`}
                        >
                          Latest history
                        </ButtonLink>
                      )}
                    </div>
                  )}
                </Panel>
                <Panel title="Activity">
                  <ol className="relative flex flex-col gap-4">
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 bottom-1.5 left-[3px] w-px bg-border"
                    />
                    {history.events.map((event) => {
                      const metadata = event.metadata as Record<
                        string,
                        unknown
                      >;
                      return (
                        <li key={event.id} className="relative pl-5 text-sm">
                          <span
                            aria-hidden="true"
                            className="absolute top-1.5 left-0 size-[7px] rounded-full bg-[#C9C9D3] ring-2 ring-white"
                          />
                          <p className="first-letter:uppercase">
                            {eventLabel(event)}
                          </p>
                          {typeof metadata.reason === "string" && (
                            <p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">
                              “{metadata.reason}”
                            </p>
                          )}
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {names.get(event.actor_user_id) ?? "System"} ·{" "}
                            <time dateTime={event.created_at}>
                              {date(event.created_at)}
                            </time>
                          </p>
                        </li>
                      );
                    })}
                    <li className="relative pl-5 text-sm">
                      <span
                        aria-hidden="true"
                        className="absolute top-1.5 left-0 size-[7px] rounded-full bg-primary ring-2 ring-white"
                      />
                      <p>Application received</p>
                      <time
                        className="mt-0.5 block text-xs text-muted-foreground"
                        dateTime={application.submitted_at}
                      >
                        {date(application.submitted_at)}
                      </time>
                    </li>
                  </ol>
                  {history.eventsNext && (
                    <ButtonLink
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      href={`/app/applications/${id}?tab=activity&eventsBefore=${history.eventsNext}${before.notesBefore ? `&notesBefore=${encodeURIComponent(before.notesBefore)}` : ""}`}
                    >
                      Older activity
                    </ButtonLink>
                  )}
                </Panel>
              </>
            )}
          </div>
        </div>

        <aside
          aria-label="Review actions"
          className="flex flex-col gap-5 xl:sticky xl:top-20"
        >
          <ApplicationReview
            applicationId={id}
            agencyId={context.agencyId}
            status={application.status}
            updatedAt={application.updated_at}
            ownerId={application.owner_user_id}
            userId={context.user.id}
            role={context.role}
            members={members}
          />
          {pipeline.available && (
            <OfferCard
              agencyId={context.agencyId}
              applicationId={id}
              status={application.status}
              updatedAt={application.updated_at}
              offers={pipeline.offers}
              placements={pipeline.placements}
              canRecordFee={["owner", "administrator"].includes(context.role)}
              defaultCurrency={job.data?.currency ?? null}
            />
          )}
          <Panel title="Contact">
            <dl className="flex flex-col gap-4 text-sm">
              <div className="min-w-0">
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd className="mt-1">
                  <a
                    href={`mailto:${application.candidates.email}`}
                    className="inline-flex max-w-full items-center gap-2 break-all hover:text-primary"
                  >
                    <LetterIcon
                      size={15}
                      aria-hidden="true"
                      className="shrink-0 text-muted-foreground"
                    />
                    {application.candidates.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd className="mt-1">
                  {application.candidates.phone ? (
                    <a
                      href={`tel:${application.candidates.phone}`}
                      className="inline-flex items-center gap-2 hover:text-primary"
                    >
                      <PhoneIcon
                        size={15}
                        aria-hidden="true"
                        className="text-muted-foreground"
                      />
                      {application.candidates.phone}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Not provided</span>
                  )}
                </dd>
              </div>
            </dl>
          </Panel>
          <SubmissionPanel
            agencyId={context.agencyId}
            applicationId={id}
            canShare={[
              "shortlisted",
              "client_review",
              "interview",
              "offer",
            ].includes(application.status)}
            submissions={submissions}
            document={application.candidate_documents[0]}
          />
          {otherApplications.length > 0 && (
            <Panel title="Other applications" bodyClassName="p-0">
              <p className="px-4 pt-3 text-xs text-muted-foreground">
                Same candidate record, not a duplicate person.
              </p>
              <ul className="mt-1 pb-2">
                {otherApplications.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/app/applications/${item.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm outline-none hover:bg-[#F8F9FC] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    >
                      <span className="truncate">{item.jobs.title}</span>
                      <StatusBadge status={item.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </div>
  );
}

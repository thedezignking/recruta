import Link from "next/link";
import { z } from "zod";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeftIcon,
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
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ApiError } from "@/lib/api";
import { requireAgencyPageContext } from "@/server/auth/context";
import {
  getApplication,
  getApplicationHistory,
  listApplications,
} from "@/server/services/applications";
import { listAgencyMembers } from "@/server/services/workspace";
import { getSubmissions } from "@/server/services/collaboration";
import { SubmissionPanel } from "@/components/collaboration/submission-panel";
import { ButtonLink } from "@/components/shared/button-link";

export default async function ApplicationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notesBefore?: string; eventsBefore?: string }>;
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
  return (
    <div className="flex flex-col gap-6 pb-20 lg:pb-0">
      <Link
        href="/app/applications"
        className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon size={16} aria-hidden="true" />
        Applications
      </Link>
      <PageHeader
        title={application.candidates.full_name}
        description={`${application.jobs.title} · ${application.jobs.clients.name}`}
        actions={<StatusBadge status={application.status} />}
      />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        {application.submitted_profile?.fullName &&
          application.submitted_profile.fullName.trim().toLowerCase() !==
            application.candidates.full_name.trim().toLowerCase() && (
            <Alert className="xl:col-span-2">
              <AlertTitle>Check candidate identity</AlertTitle>
              <AlertDescription>
                This application was submitted as{" "}
                {application.submitted_profile.fullName}, using an email already
                linked to {application.candidates.full_name}. The existing name
                was preserved. Confirm the identity before sharing or making a
                decision.
              </AlertDescription>
            </Alert>
          )}
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader>
              <CardTitle>Application</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
                <a
                  href={`mailto:${application.candidates.email}`}
                  className="inline-flex items-center gap-2 break-all hover:text-primary"
                >
                  <LetterIcon size={16} aria-hidden="true" />
                  {application.candidates.email}
                </a>
                {application.candidates.phone && (
                  <a
                    href={`tel:${application.candidates.phone}`}
                    className="inline-flex items-center gap-2 hover:text-primary"
                  >
                    <PhoneIcon size={16} aria-hidden="true" />
                    {application.candidates.phone}
                  </a>
                )}
              </div>
              <dl className="grid gap-4 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Received</dt>
                  <dd className="mt-1">
                    <time dateTime={application.submitted_at}>
                      {date(application.submitted_at)}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="mt-1 capitalize">
                    {application.source.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Job</dt>
                  <dd className="mt-1">
                    <Link
                      href={`/app/jobs/${application.job_id}`}
                      className="text-primary hover:underline"
                    >
                      {application.jobs.title}
                    </Link>
                  </dd>
                </div>
              </dl>
              {application.cover_note && (
                <div>
                  <h3 className="text-sm font-medium">Candidate message</h3>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                    {application.cover_note}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {application.candidate_documents.length ? (
                application.candidate_documents.map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium">
                        {document.file_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {(document.size_bytes / 1024).toFixed(0)} KB · Private
                        document
                      </p>
                    </div>
                    <OpenResumeButton
                      applicationId={id}
                      documentId={document.id}
                      agencyId={context.agencyId}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No documents attached.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Application answers</CardTitle>
            </CardHeader>
            <CardContent>
              {answers.length ? (
                <dl className="flex flex-col gap-6">
                  {answers.map((answer) => (
                    <div key={answer.id}>
                      <dt className="text-sm font-medium">
                        {answer.job_application_questions.label}
                      </dt>
                      <dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                        {typeof answer.answer === "boolean"
                          ? answer.answer
                            ? "Yes"
                            : "No"
                          : typeof answer.answer === "string" ||
                              typeof answer.answer === "number"
                            ? String(answer.answer)
                            : JSON.stringify(answer.answer)}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This application has no screening answers.
                </p>
              )}
            </CardContent>
          </Card>
          <ScreeningPanel
            agencyId={context.agencyId}
            applicationId={id}
            data={screening}
            documents={application.candidate_documents}
            enabled={
              processing.screeningEnabled && processingAvailability().screening
            }
            timezone={agency.data.timezone}
            intakeFailed={intake.data?.status === "failed"}
          />
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
          {otherApplications.length > 0 && (
            <Alert role="status">
              <AlertTitle>Also applied to other roles</AlertTitle>
              <AlertDescription>
                <p>
                  This is the same candidate record, not a duplicate person.
                </p>
                <ul className="mt-2 flex list-inside list-disc flex-col gap-1">
                  {otherApplications.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <Link href={`/app/applications/${item.id}`}>
                        {item.jobs.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Internal notes</CardTitle>
            </CardHeader>
            <CardContent>
              {history.notes.length ? (
                <ol className="flex flex-col gap-5">
                  {history.notes.map((note) => (
                    <li key={note.id}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {names.get(note.author_user_id) ?? "Former teammate"}
                        </span>
                        <time dateTime={note.created_at}>
                          {date(note.created_at)}
                        </time>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
                        {note.body}
                      </p>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No internal notes yet.
                </p>
              )}
              {history.notesNext && (
                <ButtonLink
                  variant="outline"
                  className="mt-4"
                  href={`/app/applications/${id}?notesBefore=${history.notesNext}${before.eventsBefore ? `&eventsBefore=${encodeURIComponent(before.eventsBefore)}` : ""}`}
                >
                  Older notes
                </ButtonLink>
              )}
              {before.notesBefore && (
                <ButtonLink
                  variant="ghost"
                  className="mt-4"
                  href={`/app/applications/${id}`}
                >
                  Latest history
                </ButtonLink>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-4">
                {history.events.map((event) => {
                  const metadata = event.metadata as Record<string, unknown>;
                  const label =
                    event.event_type === "application.status_changed"
                      ? `Stage: ${String(metadata.from).replaceAll("_", " ")} → ${String(metadata.to).replaceAll("_", " ")}`
                      : event.event_type === "application.owner_changed"
                        ? `Owner: ${metadata.toOwner ? (names.get(String(metadata.toOwner)) ?? "Former teammate") : "Unassigned"}`
                        : event.event_type === "application.note_added"
                          ? "Internal note added"
                          : event.event_type.startsWith(
                                "application.processing",
                              )
                            ? "Screening processing updated"
                            : event.event_type ===
                                "application.screening_corrected"
                              ? "Recruiter corrected screening evidence"
                              : event.event_type.startsWith("communication.")
                                ? event.event_type
                                    .replaceAll("communication.", "Email ")
                                    .replaceAll("_", " ")
                                : event.event_type.replaceAll("_", " ");
                  return (
                    <li key={event.id} className="text-sm">
                      <p>{label}</p>
                      {typeof metadata.reason === "string" && (
                        <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                          {metadata.reason}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {names.get(event.actor_user_id) ?? "System"} ·{" "}
                        <time dateTime={event.created_at}>
                          {date(event.created_at)}
                        </time>
                      </p>
                    </li>
                  );
                })}
                <li className="text-sm">
                  <p>Application received</p>
                  <time
                    className="mt-1 block text-xs text-muted-foreground"
                    dateTime={application.submitted_at}
                  >
                    {date(application.submitted_at)}
                  </time>
                </li>
              </ol>
              {history.eventsNext && (
                <ButtonLink
                  variant="outline"
                  className="mt-4"
                  href={`/app/applications/${id}?eventsBefore=${history.eventsNext}${before.notesBefore ? `&notesBefore=${encodeURIComponent(before.notesBefore)}` : ""}`}
                >
                  Older activity
                </ButtonLink>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
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
        </div>
      </div>
    </div>
  );
}

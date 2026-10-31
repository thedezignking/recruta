import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AltArrowRightIcon,
  BellIcon,
  ChartSquareIcon,
  DocumentTextIcon,
  LetterIcon,
} from "@solar-icons/react/linear";
import { RecrutaBot } from "@/components/bot/recruta-bot";
import { PageHeader } from "@/components/shared/page-header";
import { getAssistantEnv } from "@/lib/env";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getAttentionQueue } from "@/server/services/application-automations";
import {
  getProcessingSettings,
  processingAvailability,
} from "@/server/services/processing-settings";
import { cn } from "cn";

export const metadata = { title: "Recruta bot" };

async function countRows(
  query: PromiseLike<{ count: number | null; error: unknown }>,
) {
  const { count, error } = await query;
  return error ? null : (count ?? 0);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export default async function RecrutaBotPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const { supabase, agencyId, user } = context;
  const since = daysAgo(30);
  const matches = (band: string) =>
    countRows(
      supabase
        .from("application_matches")
        .select("application_id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("band", band),
    );
  const [profile, settings, attention, screened, strong, partial, weak] =
    await Promise.all([
      supabase
        .from("user_profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
      getProcessingSettings(supabase, agencyId),
      getAttentionQueue(supabase, agencyId).catch(() => []),
      countRows(
        supabase
          .from("screening_runs")
          .select("id", { count: "exact", head: true })
          .eq("agency_id", agencyId)
          .eq("status", "succeeded")
          .gte("finished_at", since),
      ),
      matches("strong"),
      matches("partial"),
      matches("weak"),
    ]);
  const availability = processingAvailability();
  const assistant = getAssistantEnv();
  const firstName =
    profile.data?.full_name?.trim().split(/\s+/)[0] ||
    user.email?.split("@")[0] ||
    "there";
  const chatStatus = !assistant.available
    ? "Chat isn't switched on for this deployment yet."
    : !settings.screeningEnabled
      ? "Turn on AI for this workspace in Settings to start chatting."
      : null;
  const canManage = context.role !== "recruiter";

  const workflows = [
    {
      icon: DocumentTextIcon,
      title: "Screen new applications",
      when: "An application arrives",
      then: "Read the CV against the job's requirements",
      on:
        settings.screeningEnabled &&
        settings.automaticScreening &&
        availability.screening,
      metric:
        screened === null ? null : `${screened} screened in the last 30 days`,
    },
    {
      icon: ChartSquareIcon,
      title: "Grade by requirement match",
      when: "Screening finishes",
      then: "Grade Strong, Partial or Weak with reasons",
      on: settings.screeningEnabled && availability.screening,
      metric:
        strong === null
          ? null
          : `${strong} strong · ${partial ?? 0} partial · ${weak ?? 0} weak`,
      href: strong ? "/app/applications?match=strong" : undefined,
      hrefLabel: "View strong matches",
    },
    {
      icon: LetterIcon,
      title: "Acknowledge applicants",
      when: "An application arrives",
      then: "Email the candidate a confirmation",
      on: settings.acknowledgeApplications && availability.email,
      metric: null,
    },
    {
      icon: BellIcon,
      title: "Review reminders",
      when: `An application waits ${settings.reviewReminderHours} hours`,
      then: "Add it to Needs attention",
      on: true,
      metric: `${attention.length} ${attention.length === 1 ? "item needs" : "items need"} attention`,
      href: attention.length ? "/app/attention" : undefined,
      hrefLabel: "Open Needs attention",
    },
  ];

  const work = (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-5">
        <h2 className="text-[13px] font-semibold tracking-[-0.01em]">
          Workflows
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          What Recruta does on its own. Nothing here moves a candidate or makes
          a hiring decision.
        </p>
      </div>
      <ul className="grid gap-4 md:grid-cols-2">
        {workflows.map((workflow) => {
          const Icon = workflow.icon;
          return (
            <li
              key={workflow.title}
              className="flex flex-col rounded-[10px] border border-border bg-card p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-lg bg-[#F4F4FE] text-[#5C5AED]">
                    <Icon aria-hidden="true" size={17} />
                  </span>
                  <span className="text-sm font-semibold">
                    {workflow.title}
                  </span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    workflow.on
                      ? "bg-success/10 text-success"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1.5 rounded-full",
                      workflow.on ? "bg-success" : "bg-muted-foreground/50",
                    )}
                  />
                  {workflow.on ? "On" : "Off"}
                </span>
              </div>
              <ol className="mt-4 flex flex-col gap-1.5 text-xs">
                <li className="flex items-start gap-2 rounded-md bg-[#F8F8F8] px-3 py-2">
                  <span className="w-9 shrink-0 font-mono text-[10px] text-muted-foreground uppercase">
                    When
                  </span>
                  {workflow.when}
                </li>
                <li className="flex items-start gap-2 rounded-md bg-[#F8F8F8] px-3 py-2">
                  <span className="w-9 shrink-0 font-mono text-[10px] text-[#5C5AED] uppercase">
                    Then
                  </span>
                  {workflow.then}
                </li>
              </ol>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4 text-xs">
                <span className="text-muted-foreground tabular-nums">
                  {workflow.metric ?? ""}
                </span>
                {workflow.href ? (
                  <Link
                    href={workflow.href}
                    className="inline-flex items-center gap-1 font-medium hover:text-primary"
                  >
                    {workflow.hrefLabel}
                    <AltArrowRightIcon aria-hidden="true" size={13} />
                  </Link>
                ) : canManage ? (
                  <Link
                    href="/app/settings#processing"
                    className="inline-flex items-center gap-1 font-medium hover:text-primary"
                  >
                    Manage
                    <AltArrowRightIcon aria-hidden="true" size={13} />
                  </Link>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col pb-20 lg:pb-0">
      <PageHeader title="Recruta bot" />
      <RecrutaBot
        agencyId={agencyId}
        firstName={firstName}
        chatStatus={chatStatus}
        work={work}
      />
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AltArrowRightIcon,
  BellIcon,
  ChartSquareIcon,
  DocumentTextIcon,
  LetterIcon,
} from "@solar-icons/react/linear";
import { SettingsIcon } from "@solar-icons/react/linear";
import { z } from "zod";
import { RecrutaBot } from "@/components/bot/recruta-bot";
import {
  getConversation,
  listConversations,
} from "@/server/assistant/conversations";
import { ButtonLink } from "@/components/shared/button-link";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
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

type StepState = "on" | "off" | "manual" | "waiting" | "unavailable";

const stepBadges: Record<StepState, { label: string; on: boolean }> = {
  on: { label: "On", on: true },
  off: { label: "Off", on: false },
  manual: { label: "Manual", on: false },
  waiting: { label: "Needs screening", on: false },
  unavailable: { label: "Not set up", on: false },
};

function StepBadge({ state }: { state: StepState }) {
  const badge = stepBadges[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        badge.on
          ? "bg-success/10 text-success"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 rounded-full",
          badge.on ? "bg-success" : "bg-muted-foreground/50",
        )}
      />
      {badge.label}
    </span>
  );
}

function serverNow() {
  return Date.now();
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

export default async function RecrutaBotPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const { supabase, agencyId, user } = context;
  const requested = (await searchParams).c;
  const [conversations, initialConversation] = await Promise.all([
    listConversations(supabase, agencyId, user.id),
    requested && z.uuid().safeParse(requested).success
      ? getConversation(supabase, agencyId, requested).catch(() => null)
      : null,
  ]);
  const since = daysAgo(30);
  const matches = (band: string) =>
    countRows(
      supabase
        .from("application_matches")
        .select("application_id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("band", band),
    );
  const [
    profile,
    settings,
    attention,
    screened,
    strong,
    partial,
    weak,
    acknowledged,
  ] = await Promise.all([
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
    countRows(
      supabase
        .from("communications")
        .select("id", { count: "exact", head: true })
        .eq("agency_id", agencyId)
        .eq("message_type", "application_received")
        .gte("created_at", since),
    ),
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

  const screeningState: StepState = !availability.screening
    ? "unavailable"
    : !settings.screeningEnabled
      ? "off"
      : settings.automaticScreening
        ? "on"
        : "manual";
  const steps: {
    icon: typeof LetterIcon;
    title: string;
    does: string;
    state: StepState;
    stat?: string | null;
    href?: string;
    hrefLabel?: string;
  }[] = [
    {
      icon: LetterIcon,
      title: "Confirm the application",
      does: "Emails the candidate that their application arrived, with the role and a reference.",
      state: !availability.email
        ? "unavailable"
        : settings.acknowledgeApplications
          ? "on"
          : "off",
      stat: acknowledged === null ? null : `${acknowledged} sent`,
    },
    {
      icon: DocumentTextIcon,
      title: "Screen the CV",
      does: "Reads the CV against the job's requirements and quotes the evidence.",
      state: screeningState,
      stat: screened === null ? null : `${screened} screened`,
    },
    {
      icon: ChartSquareIcon,
      title: "Grade the match",
      does: "Marks each screened application Strong, Partial or Weak, with the gaps to ask about.",
      state:
        screeningState === "on" || screeningState === "manual"
          ? "on"
          : "waiting",
      stat:
        strong === null
          ? null
          : `${strong} strong · ${partial ?? 0} partial · ${weak ?? 0} weak`,
      href: strong ? "/app/applications?match=strong" : undefined,
      hrefLabel: "Strong matches",
    },
    {
      icon: BellIcon,
      title: "Flag waiting applications",
      does: `Adds an application to Needs attention when nobody has reviewed it after ${settings.reviewReminderHours} hours.`,
      state: "on",
      stat: `${attention.length} waiting now`,
      href: attention.length ? "/app/attention" : undefined,
      hrefLabel: "Needs attention",
    },
  ];
  const summary = [
    { label: "Confirmations sent", value: acknowledged },
    { label: "CVs screened", value: screened },
    { label: "Strong matches", value: strong },
    { label: "Need attention now", value: attention.length },
  ];

  const work = (
    <div className="mx-auto w-full max-w-3xl">
      <SectionHeader
        title="Automations"
        actions={
          canManage ? (
            <ButtonLink href="/app/settings#processing" variant="outline">
              <SettingsIcon data-icon="inline-start" aria-hidden="true" />
              Edit in Settings
            </ButtonLink>
          ) : null
        }
      />
      <p className="mt-1 text-sm text-muted-foreground">
        What Recruta does when someone applies. It never moves a candidate or
        makes a hiring decision.
      </p>

      <dl className="mt-5 grid grid-cols-2 overflow-hidden rounded-[10px] border border-border sm:grid-cols-4">
        {summary.map((item, index) => (
          <div
            key={item.label}
            className={cn(
              "border-border px-4 py-3.5",
              index % 2 === 1 && "border-l",
              index > 1 && "border-t sm:border-t-0",
              index > 0 && "sm:border-l",
            )}
          >
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-xl font-semibold tracking-[-0.02em] tabular-nums">
              {item.value ?? "—"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted-foreground">Last 30 days.</p>

      <h3 className="mt-8 text-[13px] font-semibold tracking-[-0.01em]">
        When someone applies
      </h3>
      <ol className="mt-3">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const last = index === steps.length - 1;
          return (
            <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute top-10 bottom-1 left-[17px] w-px bg-border"
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "relative grid size-9 shrink-0 place-items-center rounded-full border",
                  step.state === "on"
                    ? "border-[#5C5AED]/25 bg-[#F4F4FE] text-[#5C5AED]"
                    : "border-border bg-white text-muted-foreground",
                )}
              >
                <Icon size={17} />
              </span>
              <div className="min-w-0 flex-1 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                  <p className="text-sm font-semibold">
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.title}
                  </p>
                  <StepBadge state={step.state} />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {step.does}
                </p>
                {(step.stat || step.href) && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    {step.stat && (
                      <span className="text-muted-foreground tabular-nums">
                        {step.stat}
                      </span>
                    )}
                    {step.href && (
                      <Link
                        href={step.href}
                        className="inline-flex items-center gap-0.5 font-medium text-foreground hover:text-[#5C5AED]"
                      >
                        {step.hrefLabel}
                        <AltArrowRightIcon aria-hidden="true" size={13} />
                      </Link>
                    )}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
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
        conversations={conversations}
        initialConversation={initialConversation}
        now={serverNow()}
      />
    </div>
  );
}

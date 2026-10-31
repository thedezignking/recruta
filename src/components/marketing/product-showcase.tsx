"use client";

import { useEffect, useState } from "react";
import {
  Buildings2Icon,
  CaseMinimalisticIcon,
  ChatRoundDotsIcon,
  DocumentTextIcon,
  Home2Icon,
  InboxIcon,
  MagnifierIcon,
  UserCheckRoundedIcon,
} from "@solar-icons/react/linear";
import { CheckCircleIcon } from "@solar-icons/react/bold";
import { cn } from "cn";
import { useReducedMotion } from "./motion";

const tabs = [
  { id: "jobs", label: "Jobs", icon: CaseMinimalisticIcon },
  { id: "inbox", label: "Applications", icon: InboxIcon },
  { id: "screening", label: "Screening", icon: DocumentTextIcon },
  { id: "shortlist", label: "Client shortlist", icon: UserCheckRoundedIcon },
  { id: "messages", label: "Candidate email", icon: ChatRoundDotsIcon },
] as const;
type TabId = (typeof tabs)[number]["id"];
const DURATION = 6000;

// Deterministic bar heights so server and client render the same field.
const bars = Array.from({ length: 110 }, (_, i) => {
  const wave = Math.sin(i * 0.22) * 0.22 + Math.sin(i * 0.85) * 0.12;
  return Math.max(0.45, Math.min(1, 0.74 + wave + (i % 7) * 0.025));
});
const tints = ["#C9C8FA", "#A9A7F6", "#8E8CF3", "#7472F0", "#5C5AED"];

export function ProductShowcase() {
  const [active, setActive] = useState<TabId>("jobs");
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (paused || reduced) return;
    const timer = window.setTimeout(() => {
      const index = tabs.findIndex((tab) => tab.id === active);
      setActive(tabs[(index + 1) % tabs.length].id);
    }, DURATION);
    return () => window.clearTimeout(timer);
  }, [active, paused, reduced]);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        role="tablist"
        aria-label="Product tour"
        className="grid grid-cols-2 gap-px border-b border-[#EBEBEB] bg-[#EBEBEB] sm:grid-cols-3 lg:grid-cols-5"
        onKeyDown={(event) => {
          const delta =
            event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
          if (!delta) return;
          event.preventDefault();
          const index = tabs.findIndex((tab) => tab.id === active);
          const next = tabs[(index + delta + tabs.length) % tabs.length];
          setActive(next.id);
          document.getElementById(`tour-${next.id}`)?.focus();
        }}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              id={`tour-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls="tour-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              className={cn(
                "relative flex h-12 items-center justify-center gap-2 bg-white text-[13px] outline-none transition-colors duration-200 focus-visible:bg-[#F7F7FE]",
                index === tabs.length - 1 && "max-sm:col-span-2",
                selected
                  ? "font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden="true"
                size={16}
                className={selected ? "text-[#5C5AED]" : undefined}
              />
              {tab.label}
              {selected && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-px h-0.5 overflow-hidden bg-[#5C5AED]/15"
                >
                  <span
                    key={`${active}-${paused}`}
                    className={cn(
                      "block h-full bg-[#5C5AED]",
                      !paused && !reduced && "mk-progress",
                    )}
                    style={
                      {
                        "--mk-duration": `${DURATION}ms`,
                      } as React.CSSProperties
                    }
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative h-[460px] overflow-hidden sm:h-[540px]">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 flex h-[96%] items-end gap-[2px] px-[2px] [mask-image:linear-gradient(to_bottom,transparent,#000_22%)]"
        >
          {bars.map((height, i) => (
            <div
              key={i}
              className="mk-bar flex flex-1 flex-col-reverse gap-[2px]"
              style={
                {
                  height: `${height * 100}%`,
                  "--mk-delay": `${(i % 55) * 11}ms`,
                } as React.CSSProperties
              }
            >
              {tints.map((tint, t) => (
                <span
                  key={tint}
                  className="flex-1 rounded-[2px]"
                  style={{ background: tints[tints.length - 1 - t] }}
                />
              ))}
            </div>
          ))}
        </div>

        <div
          id="tour-panel"
          role="tabpanel"
          aria-labelledby={`tour-${active}`}
          className="absolute inset-x-4 top-10 bottom-0 sm:inset-x-12 lg:inset-x-28"
        >
          <AppWindow active={active} />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(to_top,#fff,transparent)]"
        />
      </div>
    </div>
  );
}

const nav = [
  { id: "overview", icon: Home2Icon, label: "Overview" },
  { id: "jobs", icon: CaseMinimalisticIcon, label: "Jobs" },
  { id: "inbox", icon: InboxIcon, label: "Applications" },
  { id: "orgs", icon: Buildings2Icon, label: "Organizations" },
];

function AppWindow({ active }: { active: TabId }) {
  const navActive =
    active === "jobs" ? "jobs" : active === "shortlist" ? "jobs" : "inbox";
  const crumb: Record<TabId, string> = {
    jobs: "Jobs",
    inbox: "Applications",
    screening: "Applications › Chiamaka Eze",
    shortlist: "Jobs › Area Sales Manager",
    messages: "Applications › Tunde Bakare",
  };
  return (
    <div
      aria-hidden="true"
      className="flex h-full overflow-hidden rounded-t-[14px] border border-b-0 border-[#E4E4E7] bg-white shadow-[0_30px_80px_-30px_rgb(43_41_146_/_0.45)]"
    >
      <div className="hidden w-44 shrink-0 flex-col gap-0.5 bg-[#F8F8F8] p-2.5 md:flex">
        <div className="mb-3 flex items-center gap-2 px-1.5 pt-1">
          <span className="grid size-5 place-items-center rounded bg-[#5C5AED] text-[10px] font-semibold text-white">
            N
          </span>
          <span className="text-xs font-semibold">Northbridge Talent</span>
        </div>
        {nav.map((item) => {
          const Icon = item.icon;
          const on = item.id === navActive;
          return (
            <span
              key={item.id}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]",
                on
                  ? "bg-white font-medium shadow-[0_1px_3px_rgb(0_0_0_/_0.06)]"
                  : "text-muted-foreground",
              )}
            >
              <Icon size={14} />
              {item.label}
            </span>
          );
        })}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-[#EFEFEF] px-4">
          <span className="truncate text-[11px] font-semibold">
            {crumb[active]}
          </span>
          <span className="flex h-6 w-40 items-center gap-1.5 rounded-md border border-[#EFEFEF] px-2 text-[10px] text-muted-foreground">
            <MagnifierIcon size={11} />
            Search
          </span>
        </div>
        <div
          key={active}
          className="mk-swap min-h-0 flex-1 overflow-hidden p-4"
        >
          <Screen active={active} />
        </div>
      </div>
    </div>
  );
}

function Tag({ children, tone }: { children: string; tone: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-1.5 py-px text-[9.5px] font-semibold whitespace-nowrap",
        tone,
      )}
    >
      {children}
    </span>
  );
}

const tone = {
  open: "bg-success/10 text-success",
  received: "bg-[#EDECFD] text-[#3C3AB5]",
  review: "bg-[#FFF3DF] text-[#8C5109]",
  short: "bg-success/10 text-success",
  peach: "bg-[#FDE7DB] text-[#A04A1C]",
};

function Screen({ active }: { active: TabId }) {
  if (active === "jobs")
    return (
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-4 overflow-hidden rounded-lg border border-[#EFEFEF]">
          {[
            ["Active jobs", "14", "+3"],
            ["Applications", "386", "+52"],
            ["In review", "61", "+9"],
            ["Shortlisted", "23", "+6"],
          ].map(([label, value, delta], i) => (
            <div
              key={label}
              className={cn("p-3", i > 0 && "border-l border-[#EFEFEF]")}
            >
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight tabular-nums">
                {value}
              </p>
              <p className="text-[9.5px] text-success">
                {delta} vs last 30 days
              </p>
              <div className="mt-2 flex h-6 items-end gap-[2px]">
                {Array.from({ length: 16 }, (_, k) => (
                  <span
                    key={k}
                    className="flex-1 rounded-[1px]"
                    style={{
                      height: `${30 + ((k * 37 + i * 11) % 70)}%`,
                      background: i % 2 ? "#F6B99A" : "#8E8CF3",
                      opacity: 0.35 + (k / 16) * 0.65,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-lg border border-[#EFEFEF] text-[10.5px]">
          <div className="grid grid-cols-[1.6fr_1fr_0.7fr_1fr_0.6fr] gap-3 bg-[#FBFBFB] px-3 py-2 text-[9.5px] text-muted-foreground">
            <span>Job</span>
            <span>Organization</span>
            <span>Applicants</span>
            <span>Review progress</span>
            <span>Status</span>
          </div>
          {[
            ["Area Sales Manager", "Brightline Foods", 48, 0.72],
            ["Staff Nurse (ICU)", "Lakeside Hospital", 31, 0.45],
            ["Dispatch Rider", "Swiftly Logistics", 112, 0.3],
            ["Support Agent", "Kora Telecom", 64, 0.86],
          ].map(([job, org, count, progress]) => (
            <div
              key={String(job)}
              className="grid grid-cols-[1.6fr_1fr_0.7fr_1fr_0.6fr] items-center gap-3 border-t border-[#F3F3F3] px-3 py-2"
            >
              <span className="truncate font-medium">{job}</span>
              <span className="truncate text-muted-foreground">{org}</span>
              <span className="tabular-nums">{count}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-[#EFEFEF]">
                <span
                  className="block h-full rounded-full bg-[#5C5AED]"
                  style={{ width: `${Number(progress) * 100}%` }}
                />
              </span>
              <Tag tone={tone.open}>Open</Tag>
            </div>
          ))}
        </div>
      </div>
    );
  if (active === "inbox")
    return (
      <div className="overflow-hidden rounded-lg border border-[#EFEFEF] text-[10.5px]">
        <div className="flex gap-3 border-b border-[#EFEFEF] px-3 text-[10px]">
          {["All", "Received", "In review", "Shortlisted"].map((t, i) => (
            <span
              key={t}
              className={cn(
                "py-2",
                i === 0
                  ? "border-b-2 border-[#5C5AED] font-semibold text-[#5C5AED]"
                  : "text-muted-foreground",
              )}
            >
              {t}
            </span>
          ))}
        </div>
        {[
          ["Tunde Bakare", "Dispatch Rider", "Received", tone.received, "2h"],
          [
            "Chiamaka Eze",
            "Area Sales Manager",
            "In review",
            tone.review,
            "1d",
          ],
          ["Ibrahim Musa", "Support Agent", "Received", tone.received, "1d"],
          [
            "Ngozi Adeyemi",
            "Area Sales Manager",
            "Shortlisted",
            tone.short,
            "2d",
          ],
          ["Kemi Ojo", "Staff Nurse (ICU)", "In review", tone.review, "3d"],
          ["Daniel Etim", "Dispatch Rider", "Received", tone.received, "3d"],
        ].map(([name, job, stage, t, wait]) => (
          <div
            key={name}
            className="grid grid-cols-[1.3fr_1.2fr_0.8fr_0.3fr] items-center gap-3 border-t border-[#F3F3F3] px-3 py-2 first-of-type:border-t-0"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#EDECFD] text-[8.5px] font-semibold text-[#4846B8]">
                {name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")}
              </span>
              <span className="truncate font-medium">{name}</span>
            </span>
            <span className="truncate text-muted-foreground">{job}</span>
            <span>
              <Tag tone={t}>{stage}</Tag>
            </span>
            <span className="text-right font-mono text-muted-foreground">
              {wait}
            </span>
          </div>
        ))}
      </div>
    );
  if (active === "screening")
    return (
      <div className="grid gap-3 md:grid-cols-[1.1fr_1fr]">
        <div className="rounded-lg border border-[#EFEFEF] p-3">
          <p className="text-[10px] font-semibold">CV excerpt</p>
          <p className="mt-2 font-mono text-[10px] leading-[1.9] text-foreground/80">
            <span className="mk-mark [--mk-delay:200ms]">
              Four years with a beverage distributor
            </span>
            , covering modern trade accounts in Lagos.{" "}
            <span className="mk-mark [--mk-delay:600ms]">
              B.Sc. Marketing, University of Lagos
            </span>
            . Comfortable with route planning and weekly sales reporting.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {[
            [
              "3+ years field sales",
              "Four years with a beverage distributor",
              true,
            ],
            [
              "Degree in a business field",
              "B.Sc. Marketing, University of Lagos",
              true,
            ],
            ["Owns a vehicle", "Not mentioned", false],
          ].map(([label, evidence, met]) => (
            <div
              key={String(label)}
              className="flex items-start justify-between gap-2 rounded-lg border border-[#EFEFEF] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[10.5px] font-medium">{label}</p>
                <p className="truncate font-mono text-[9.5px] text-muted-foreground">
                  {met ? `“${evidence}”` : evidence}
                </p>
              </div>
              <Tag tone={met ? tone.short : tone.peach}>
                {met ? "Met" : "Missing"}
              </Tag>
            </div>
          ))}
          <div className="mt-1 flex items-center justify-between rounded-lg bg-[#F7F7FE] px-3 py-2 text-[10px]">
            <span className="text-muted-foreground">
              Prepared by Recruta ·{" "}
              <b className="text-foreground">you decide</b>
            </span>
            <span className="rounded bg-[#5C5AED] px-2 py-0.5 font-medium text-white">
              Shortlist
            </span>
          </div>
        </div>
      </div>
    );
  if (active === "shortlist")
    return (
      <div className="flex flex-col gap-2.5 text-[10.5px]">
        {[
          [
            "Ngozi Adeyemi",
            "Strong modern-trade record; managed key accounts in Lagos and Ibadan.",
            "Interview",
            tone.short,
          ],
          [
            "Chiamaka Eze",
            "Four years field sales; degree in marketing. Available in two weeks.",
            "Awaiting feedback",
            tone.review,
          ],
          [
            "Samuel Okon",
            "Led a team of six reps; relocating to Lagos next month.",
            "Not a fit",
            tone.peach,
          ],
        ].map(([name, summary, feedback, t]) => (
          <div
            key={name}
            className="flex items-start justify-between gap-3 rounded-lg border border-[#EFEFEF] p-3"
          >
            <div className="min-w-0">
              <p className="font-medium">{name}</p>
              <p className="mt-0.5 text-muted-foreground">{summary}</p>
            </div>
            <Tag tone={t}>{feedback}</Tag>
          </div>
        ))}
        <p className="flex items-center gap-1.5 px-1 text-[10px] text-muted-foreground">
          <CheckCircleIcon size={12} className="text-success" />
          Shared with Brightline Foods hiring managers only
        </p>
      </div>
    );
  return (
    <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr] text-[10.5px]">
      <div className="flex flex-col gap-1.5">
        {[
          ["Application received", "Delivered", tone.short],
          ["Request: driver's licence", "Delivered", tone.short],
          ["Interview invitation", "Queued", tone.received],
        ].map(([subject, state, t]) => (
          <div
            key={subject}
            className="flex items-center justify-between gap-2 rounded-lg border border-[#EFEFEF] px-3 py-2"
          >
            <span className="truncate font-medium">{subject}</span>
            <Tag tone={t}>{state}</Tag>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-[#EFEFEF] p-3">
        <p className="text-[10px] text-muted-foreground">
          To tunde.b@example.com
        </p>
        <p className="mt-2 font-medium">A quick document request</p>
        <p className="mt-1.5 leading-[1.7] text-muted-foreground">
          Hi Tunde, thanks for applying for Dispatch Rider. Could you reply with
          a photo of your driver&rsquo;s licence so we can move your application
          forward?
        </p>
        <div className="mt-3 flex justify-end">
          <span className="rounded bg-[#5C5AED] px-2.5 py-1 font-medium text-white">
            Send email
          </span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import Link from "next/link";
import {
  AltArrowDownIcon,
  AltArrowRightIcon,
  BellIcon,
  CaseMinimalisticIcon,
  DocumentTextIcon,
  InboxIcon,
  RoutingIcon,
} from "@solar-icons/react/linear";
import type { TraceStep } from "@/lib/assistant";
import { cn } from "cn";

const toolIcons: Record<string, typeof InboxIcon> = {
  search_jobs: CaseMinimalisticIcon,
  list_applications: InboxIcon,
  get_application: DocumentTextIcon,
  list_needs_attention: BellIcon,
  propose_stage_change: RoutingIcon,
};

function seconds(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)}s`;
}

/**
 * What the bot looked up to write an answer. Collapsed to one line; opening
 * it shows each step with its result, timing and a link where one helps.
 */
export function Trace({ steps, ms }: { steps: TraceStep[]; ms: number }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const failed = steps.filter((step) => !step.ok).length;
  if (!steps.length && !ms) return null;
  const summary = steps.length
    ? `Worked through ${steps.length} ${steps.length === 1 ? "step" : "steps"}`
    : "Answered without lookups";

  return (
    <div className="mb-2.5">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        disabled={!steps.length}
        className="group inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#5C5AED] disabled:pointer-events-none"
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-1.5 rounded-full",
            failed ? "bg-[#D9822B]" : "bg-[#5C5AED]",
          )}
        />
        {summary}
        {ms ? <span className="tabular-nums">· {seconds(ms)}</span> : null}
        {failed ? (
          <span className="text-[#B2650F]">· {failed} failed</span>
        ) : null}
        {steps.length > 0 && (
          <AltArrowDownIcon
            aria-hidden="true"
            size={13}
            className={cn(
              "transition-transform duration-200 motion-reduce:transition-none",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      <div
        id={panelId}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
        inert={!open}
      >
        <div className="overflow-hidden">
          <ol className="relative mt-2 ml-[3px] flex flex-col gap-2.5 border-l border-border pb-1 pl-4">
            {steps.map((step, index) => {
              const Icon = toolIcons[step.tool] ?? RoutingIcon;
              const row = (
                <>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute top-[3px] -left-[25px] grid size-[17px] place-items-center rounded-full border bg-white",
                      step.ok
                        ? "border-[#5C5AED]/30 text-[#5C5AED]"
                        : "border-[#D9822B]/40 text-[#B2650F]",
                    )}
                  >
                    <Icon size={10} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground">
                      {step.label}
                    </span>
                    {step.detail && (
                      <span className="block truncate text-xs text-muted-foreground first-letter:uppercase">
                        {step.detail}
                      </span>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                    {step.result && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-px",
                          step.ok
                            ? "bg-[#F1F1F3]"
                            : "bg-[#FDF1E5] text-[#B2650F]",
                        )}
                      >
                        {step.result}
                      </span>
                    )}
                    <span className="font-mono tabular-nums">
                      {seconds(step.ms)}
                    </span>
                    {step.href && (
                      <AltArrowRightIcon aria-hidden="true" size={12} />
                    )}
                  </span>
                </>
              );
              return (
                <li key={index} className="relative">
                  {step.href ? (
                    <Link
                      href={step.href}
                      className="-mx-1.5 flex items-start gap-3 rounded-md px-1.5 py-0.5 outline-none hover:bg-[#F6F6F8] focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-start gap-3 py-0.5">{row}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

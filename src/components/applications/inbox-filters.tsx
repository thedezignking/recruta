"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  CheckIcon,
  CloseCircleIcon,
  FilterIcon,
  MagnifierIcon,
} from "@solar-icons/react/linear";
import type { ApplicationFilters } from "@/lib/applicant-operations";
import { cn } from "cn";
import { JobFilter } from "./job-filter";

const stageTabs = [
  { value: undefined, label: "All" },
  { value: "received", label: "Received" },
  { value: "in_review", label: "In review" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "client_review", label: "Client review" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
] as const;

const ownerOptions = [
  { value: "", label: "Everyone" },
  { value: "mine", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
] as const;

const matchOptions = [
  { value: "", label: "Any match" },
  { value: "strong", label: "Strong match" },
  { value: "partial", label: "Partial match" },
  { value: "weak", label: "Weak match" },
  { value: "ungraded", label: "Not graded" },
] as const;

const dateInput =
  "h-8 w-full rounded-md border border-border bg-white px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function InboxFilters({
  filters,
  jobs,
  agencyId,
}: {
  filters: ApplicationFilters;
  jobs: { id: string; title: string }[];
  agencyId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  const activeFilters =
    Number(Boolean(filters.match)) +
    Number(Boolean(filters.owner)) +
    Number(Boolean(filters.submittedFrom || filters.submittedTo));

  function href(changes: Partial<Record<keyof ApplicationFilters, string>>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, ...changes })) {
      if (value && value !== "all" && key !== "cursor") next.set(key, value);
    }
    return `/app/applications${next.size ? `?${next}` : ""}`;
  }
  function navigate(
    changes: Partial<Record<keyof ApplicationFilters, string>>,
  ) {
    startTransition(() => router.push(href(changes)));
  }

  return (
    <div
      aria-busy={pending}
      className="flex flex-col gap-2 border-b border-border px-3 pt-2 lg:flex-row lg:items-center lg:justify-between"
    >
      <nav
        aria-label="Application stage"
        className="-mb-px flex gap-1 overflow-x-auto"
      >
        {stageTabs.map((tab) => {
          const active = (filters.status ?? undefined) === tab.value;
          return (
            <Link
              key={tab.label}
              href={href({ status: tab.value ?? "" })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex h-11 shrink-0 items-center border-b-2 px-3 text-xs outline-none focus-visible:text-foreground focus-visible:underline",
                active
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <form
          role="search"
          className="relative w-full sm:w-56"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ q: q.trim() });
          }}
        >
          <label htmlFor="application-search" className="sr-only">
            Search applications
          </label>
          <MagnifierIcon
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="application-search"
            type="search"
            value={q}
            maxLength={100}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search candidates or roles"
            className="h-8 w-full rounded-md border border-border bg-[#F8F8F8] pr-8 pl-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-search-cancel-button]:hidden"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setQ("");
                if (filters.q) navigate({ q: "" });
              }}
              className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            >
              <CloseCircleIcon size={15} aria-hidden="true" />
            </button>
          )}
        </form>

        <JobFilter
          agencyId={agencyId}
          value={filters.jobId}
          label={jobs.find((j) => j.id === filters.jobId)?.title}
          onChange={(value) => navigate({ jobId: value })}
        />

        <Popover.Root>
          <Popover.Trigger
            className={cn(
              "flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary",
              activeFilters
                ? "border-primary/40 bg-primary/5 text-primary"
                : "border-border bg-white text-foreground hover:bg-muted",
            )}
          >
            <FilterIcon size={15} aria-hidden="true" />
            Filter
            {activeFilters > 0 && (
              <span className="grid size-4 place-items-center rounded-full bg-primary text-[10px] text-white">
                {activeFilters}
              </span>
            )}
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Positioner sideOffset={8} align="end" className="z-50">
              <Popover.Popup className="w-64 rounded-[10px] border border-border bg-white p-2 text-xs shadow-[0_12px_32px_rgb(17_17_17_/_0.12)] outline-none">
                <div className="mb-1 flex items-center justify-between px-2 py-1.5">
                  <Popover.Title className="font-semibold text-foreground">
                    Filter applications
                  </Popover.Title>
                  {activeFilters > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        navigate({
                          match: "",
                          owner: "",
                          submittedFrom: "",
                          submittedTo: "",
                        })
                      }
                      className="rounded font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground">
                  Requirement match
                </p>
                {matchOptions.map((option) => {
                  const selected = (filters.match ?? "") === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => navigate({ match: option.value })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary",
                        selected && "bg-primary/5 font-semibold text-primary",
                      )}
                    >
                      {option.label}
                      {selected && <CheckIcon size={14} aria-hidden="true" />}
                    </button>
                  );
                })}
                <p className="mt-1 px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground">
                  Owner
                </p>
                {ownerOptions.map((option) => {
                  const selected = (filters.owner ?? "") === option.value;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => navigate({ owner: option.value })}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-2 py-2 text-left outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary",
                        selected && "bg-primary/5 font-semibold text-primary",
                      )}
                    >
                      {option.label}
                      {selected && <CheckIcon size={14} aria-hidden="true" />}
                    </button>
                  );
                })}
                <p className="mt-1 px-2 pt-2 pb-1 text-[10px] font-medium text-muted-foreground">
                  Received
                </p>
                <div className="grid grid-cols-2 gap-2 px-2 pb-2">
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    From
                    <input
                      type="date"
                      value={filters.submittedFrom ?? ""}
                      max={filters.submittedTo}
                      onChange={(e) =>
                        navigate({ submittedFrom: e.target.value })
                      }
                      className={dateInput}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    To
                    <input
                      type="date"
                      value={filters.submittedTo ?? ""}
                      min={filters.submittedFrom}
                      onChange={(e) =>
                        navigate({ submittedTo: e.target.value })
                      }
                      className={dateInput}
                    />
                  </label>
                </div>
              </Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
}

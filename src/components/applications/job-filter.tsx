"use client";
import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AltArrowDownIcon } from "@solar-icons/react/linear";
type Job = { id: string; title: string };
export function JobFilter({
  agencyId,
  value,
  label,
  onChange,
}: {
  agencyId: string;
  value?: string;
  label?: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const c = new AbortController();
    const timer = setTimeout(() => {
      void load(undefined, c.signal);
    }, 200);
    async function load(after?: string, signal?: AbortSignal) {
      setLoading(true);
      setError("");
      try {
        const p = new URLSearchParams({ q });
        if (after) p.set("cursor", after);
        const r = await fetch(`/api/v1/jobs/options?${p}`, {
          headers: { "x-agency-id": agencyId },
          signal,
        });
        const b = await r.json();
        if (!r.ok)
          throw new Error(b.error?.message ?? "Jobs could not be loaded.");
        setJobs(b.data.items);
        setCursor(b.data.nextCursor);
      } catch (e) {
        if (!signal?.aborted) setError((e as Error).message);
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    }
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [open, q, agencyId]);
  async function more() {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const r = await fetch(
        `/api/v1/jobs/options?${new URLSearchParams({ q, cursor })}`,
        { headers: { "x-agency-id": agencyId } },
      );
      const b = await r.json();
      if (!r.ok)
        throw new Error(b.error?.message ?? "Jobs could not be loaded.");
      setJobs((old) => [...old, ...b.data.items]);
      setCursor(b.data.nextCursor);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={value ? `Job: ${label ?? "selected job"}` : "Job: all jobs"}
        className={`flex h-8 max-w-56 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-primary ${value ? "border-primary/40 bg-primary/5 text-primary" : "border-border bg-white text-foreground hover:bg-muted"}`}
      >
        <span className="truncate">
          {value ? (label ?? "Selected job") : "All jobs"}
        </span>
        <AltArrowDownIcon
          size={14}
          aria-hidden="true"
          className="shrink-0 opacity-60"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={6}
          align="start"
          className="z-50 max-w-[calc(100vw-2rem)]"
        >
          <Popover.Popup className="w-80 rounded-[10px] border border-border bg-white p-2 shadow-[0_12px_32px_rgb(17_17_17_/_0.12)] outline-none">
            <Popover.Title className="sr-only">Filter by job</Popover.Title>
            <label htmlFor="job-filter-query" className="sr-only">
              Find a job
            </label>
            <Input
              id="job-filter-query"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a job…"
              maxLength={100}
            />
            <div className="mt-2 flex max-h-64 flex-col overflow-y-auto">
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs"
                onClick={() => {
                  onChange("all");
                  setOpen(false);
                }}
              >
                All jobs
              </Button>
              {jobs.map((j) => (
                <Button
                  key={j.id}
                  variant="ghost"
                  size="sm"
                  className="h-auto justify-start py-2 text-left text-xs whitespace-normal"
                  onClick={() => {
                    onChange(j.id);
                    setOpen(false);
                  }}
                >
                  {j.title}
                </Button>
              ))}
              {loading && (
                <p role="status" className="p-2 text-xs text-muted-foreground">
                  Loading jobs…
                </p>
              )}
              {!loading && !jobs.length && !error && (
                <p className="p-2 text-xs text-muted-foreground">
                  No jobs match.
                </p>
              )}
              {error && (
                <p role="alert" className="p-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              {cursor && (
                <Button
                  variant="outline"
                  className="mt-2"
                  disabled={loading}
                  onClick={() => void more()}
                >
                  More jobs
                </Button>
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Combobox } from "@base-ui/react/combobox";
import { MagnifierIcon } from "@solar-icons/react/linear";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import type { WorkspaceSearchItem } from "@/lib/workspace-search";

export function WorkspaceSearch({ agencyId }: { agencyId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    query: string;
    items: WorkspaceSearchItem[];
    error?: string;
  } | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (
          window.matchMedia &&
          !window.matchMedia("(min-width: 1024px)").matches
        )
          return;
        event.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
          {
            signal: controller.signal,
            cache: "no-store",
            headers: agencyId ? { "x-agency-id": agencyId } : {},
          },
        );
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Search is unavailable. Try again.",
          );
        if (!controller.signal.aborted)
          setResult({ query, items: body.data.items });
      } catch (error) {
        if (!controller.signal.aborted)
          setResult({
            query,
            items: [],
            error:
              error instanceof Error
                ? error.message
                : "Search is unavailable. Try again.",
          });
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, agencyId]);
  const current = result?.query === query ? result : null;
  const items = current?.items ?? [];
  return (
    <div className="min-w-0 flex-1 sm:max-w-[440px]">
      <Combobox.Root<WorkspaceSearchItem>
        modal={false}
        items={items}
        filter={null}
        value={null}
        open={open}
        onOpenChange={setOpen}
        inputValue={query}
        onInputValueChange={(value, details) => {
          if (details.reason !== "item-press") setQuery(value);
        }}
        itemToStringLabel={(item) => item.label}
        onValueChange={(item) => {
          if (!item) return;
          setOpen(false);
          setQuery("");
          setResult(null);
          router.push(item.href);
        }}
      >
        <label htmlFor="workspace-query" className="sr-only">
          Search workspace
        </label>
        <Combobox.InputGroup
          render={<InputGroup className="h-8 bg-muted/25" />}
        >
          <InputGroupAddon className="order-first pl-2.5 pr-0">
            <MagnifierIcon aria-hidden="true" size={16} />
          </InputGroupAddon>
          <Combobox.Input
            id="workspace-query"
            aria-label="Search workspace"
            ref={input}
            render={<InputGroupInput />}
            maxLength={100}
            placeholder="Search workspace…"
            className="text-xs"
            aria-describedby="search-instructions"
          />
          <InputGroupAddon className="hidden pr-2 sm:flex">
            <kbd className="rounded border bg-card px-1.5 py-0.5 font-mono text-[11px] leading-none">
              ⌘ K
            </kbd>
          </InputGroupAddon>
        </Combobox.InputGroup>
        <span id="search-instructions" className="sr-only">
          Search jobs, applicants, and organizations. Use arrow keys and Enter
          to open a result.
        </span>
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={8}
            align="start"
            className="z-50 w-(--anchor-width) min-w-[280px] max-w-[calc(100vw-2rem)]"
          >
            <Combobox.Popup className="max-h-[min(480px,65dvh)] overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-lg">
              {query.trim().length < 2 ? (
                <p className="px-3 py-5 text-sm text-muted-foreground">
                  Search jobs, applicants, or organizations.
                </p>
              ) : !current ? (
                <p
                  role="status"
                  className="px-3 py-5 text-sm text-muted-foreground"
                >
                  Searching…
                </p>
              ) : current.error ? (
                <p role="alert" className="px-3 py-5 text-sm text-destructive">
                  {current.error}
                </p>
              ) : !items.length ? (
                <p
                  role="status"
                  className="px-3 py-5 text-sm text-muted-foreground"
                >
                  No matches for “{query}”.
                </p>
              ) : null}
              <Combobox.List>
                {(item: WorkspaceSearchItem) => (
                  <Combobox.Item
                    key={item.id}
                    value={item}
                    className="flex cursor-default flex-col gap-1 rounded-md px-3 py-2.5 text-sm outline-none data-highlighted:bg-accent"
                  >
                    <span className="flex w-full items-start justify-between gap-3">
                      <span className="break-words font-medium">
                        {item.label}
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {item.group}
                      </span>
                    </span>
                    <span className="break-words text-xs text-muted-foreground">
                      {item.detail}
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    </div>
  );
}

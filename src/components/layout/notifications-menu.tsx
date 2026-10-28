"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import {
  BellIcon,
  CheckReadIcon,
  CloseIcon,
  InboxIcon,
  CaseRoundIcon,
  DocumentAddIcon,
} from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkspaceNotification } from "@/lib/notifications";
import { cn } from "cn";

export function NotificationsMenu({
  agencyId,
  userId,
  open: controlledOpen,
  onOpenChange,
}: {
  agencyId?: string;
  userId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;
  const [refresh, setRefresh] = useState(0);
  const key = `recruta.notifications.read:${agencyId}:${userId}`;
  const [state, setState] = useState<{
    scope: string;
    items: WorkspaceNotification[];
    read: string[];
    loading: boolean;
    error?: string;
  }>({ scope: key, items: [], read: [], loading: Boolean(agencyId && userId) });
  useEffect(() => {
    if (!agencyId || !userId) return;
    const controller = new AbortController();
    async function fetchUpdates() {
      try {
        const response = await fetch("/api/v1/notifications", {
          headers: { "x-agency-id": agencyId! },
          cache: "no-store",
          signal: controller.signal,
        });
        const body = await response.json();
        if (!response.ok)
          throw new Error(
            body.error?.message ?? "Notifications could not be loaded.",
          );
        let read: string[] = [];
        try {
          const saved: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
          if (Array.isArray(saved))
            read = saved
              .filter((value): value is string => typeof value === "string")
              .slice(-200);
        } catch {
          /* Storage is optional; no private content is persisted. */
        }
        if (!controller.signal.aborted)
          setState({
            scope: key,
            items: body.data.items,
            read,
            loading: false,
          });
      } catch (error) {
        if (!controller.signal.aborted)
          setState((value) => ({
            ...value,
            scope: key,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Notifications could not be loaded.",
          }));
      }
    }
    void fetchUpdates();
    const onFocus = () => void fetchUpdates();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void fetchUpdates();
    }, 60000);
    return () => {
      controller.abort();
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [agencyId, userId, key, open, refresh]);
  const items = state.scope === key ? state.items : [];
  const unread = items.filter((item) => !state.read.includes(item.id)).length;
  function markRead(ids: string[]) {
    const read = [...new Set([...state.read, ...ids])].slice(-200);
    try {
      localStorage.setItem(key, JSON.stringify(read));
    } catch {
      /* Keep session read state when storage is unavailable. */
    }
    setState((value) => ({ ...value, read }));
  }
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Popover.Trigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={
                    unread ? `Notifications, ${unread} unread` : "Notifications"
                  }
                  className="relative size-8 shrink-0 bg-card shadow-none"
                />
              }
            />
          }
        >
          <BellIcon aria-hidden="true" size={20} />
          {unread > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary ring-2 ring-card"
            />
          )}
        </TooltipTrigger>
        <TooltipContent>Notifications</TooltipContent>
      </Tooltip>
      <Popover.Portal>
        <Popover.Positioner
          sideOffset={10}
          align="end"
          className="z-50 max-w-[calc(100vw-1.5rem)]"
        >
          <Popover.Popup className="w-[320px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border bg-popover shadow-lg outline-none">
            <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
              <Popover.Title className="text-sm font-semibold">
                Notifications
              </Popover.Title>
              <div className="flex items-center gap-1">
                {unread > 0 && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mark all as read"
                    title="Mark all as read"
                    onClick={() => markRead(items.map((item) => item.id))}
                  >
                    <CheckReadIcon aria-hidden="true" />
                  </Button>
                )}
                <Popover.Close
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Close notifications"
                    />
                  }
                >
                  <CloseIcon aria-hidden="true" />
                </Popover.Close>
              </div>
            </div>
            <Popover.Description className="sr-only">
              Recent applications, hiring requests, and jobs assigned to you.
              Read status is saved on this device.
            </Popover.Description>
            <div className="max-h-[min(400px,65dvh)] overflow-y-auto">
              {state.error ? (
                <div className="p-4">
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 px-0"
                    onClick={() => setRefresh((value) => value + 1)}
                  >
                    Try again
                  </Button>
                </div>
              ) : state.loading ? (
                <p role="status" className="p-4 text-sm text-muted-foreground">
                  Loading notifications…
                </p>
              ) : !items.length ? (
                <div className="px-4 py-7 text-center">
                  <BellIcon
                    aria-hidden="true"
                    size={25}
                    className="mx-auto text-muted-foreground"
                  />
                  <p className="mt-3 text-sm font-medium">
                    You’re all caught up
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    New recruitment updates will appear here.
                  </p>
                </div>
              ) : (
                items.map((item) => {
                  const read = state.read.includes(item.id);
                  const Icon =
                    item.kind === "application"
                      ? InboxIcon
                      : item.kind === "assignment"
                        ? CaseRoundIcon
                        : DocumentAddIcon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={() => {
                        markRead([item.id]);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0 hover:bg-muted/50",
                        !read && "bg-accent/35",
                      )}
                    >
                      <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-md bg-muted">
                        <Icon aria-hidden="true" size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-3 text-xs font-medium">
                          {item.title}
                          {!read && (
                            <span className="text-[10px] text-primary">
                              New
                            </span>
                          )}
                        </span>
                        <span className="mt-1 block break-words text-xs leading-5 text-muted-foreground">
                          {item.detail}
                        </span>
                        <time
                          dateTime={item.occurredAt}
                          className="mt-1 block text-[10px] text-muted-foreground"
                        >
                          {new Intl.DateTimeFormat("en", {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          }).format(new Date(item.occurredAt))}
                        </time>
                      </span>
                    </Link>
                  );
                })
              )}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

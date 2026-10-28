"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { DangerCircleIcon } from "@solar-icons/react/bold/danger-circle";
import { ClockCircleIcon } from "@solar-icons/react/bold/clock-circle";
import { CloseIcon, AltArrowRightIcon } from "@solar-icons/react/linear";
import type { AttentionItem } from "./attention-queue";

function description(item: AttentionItem) {
  if (!item.id.startsWith("screening:")) return item.detail;
  const [candidate, job] = item.detail.split(" · ");
  return candidate && job
    ? `${candidate}'s application for ${job} needs review.`
    : "Review the application and retry screening.";
}

function itemHref(item: AttentionItem) {
  if (!item.applicationId) return "/app/attention";
  if (item.id.startsWith("screening:"))
    return `/app/applications/${item.applicationId}#screening`;
  if (item.id.startsWith("email:"))
    return `/app/applications/${item.applicationId}#messages`;
  return `/app/applications/${item.applicationId}`;
}

export function AttentionBanner({
  items,
  agencyId,
  userId,
}: {
  items: AttentionItem[];
  agencyId: string;
  userId: string;
}) {
  const storageKey = `recruta:overview-attention:${agencyId}:${userId}`;
  const [localDismissed, setLocalDismissed] = useState<string[]>([]);
  const savedRaw = useSyncExternalStore(
    (notify) => {
      window.addEventListener("storage", notify);
      window.addEventListener("recruta:attention-dismissed", notify);
      return () => {
        window.removeEventListener("storage", notify);
        window.removeEventListener("recruta:attention-dismissed", notify);
      };
    },
    () => {
      try {
        return sessionStorage.getItem(storageKey) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  let saved: unknown = [];
  try {
    saved = JSON.parse(savedRaw);
  } catch {
    // Ignore invalid browser storage.
  }
  const dismissed = [
    ...localDismissed,
    ...(Array.isArray(saved)
      ? saved.filter((id): id is string => typeof id === "string")
      : []),
  ];

  const visible = items.filter((item) => !dismissed.includes(item.id));
  const item = visible[0];
  if (!item) return null;
  const action = item.id.startsWith("screening:")
    ? "Review screening"
    : item.id.startsWith("email:")
      ? "Review message"
      : "Review application";
  const overdue = item.id.startsWith("review:");
  const Icon = overdue ? ClockCircleIcon : DangerCircleIcon;

  return (
    <div
      className={`flex min-h-14 items-center gap-3 rounded-[10px] border px-3 py-2.5 ${overdue ? "border-[#EEDFC3] bg-[#FFFCF6]" : "border-[#F1D7D3] bg-[#FFF9F8]"}`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${overdue ? "bg-[#F8EBD3] text-[#976019]" : "bg-destructive/10 text-destructive"}`}
      >
        <Icon size={17} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`text-xs font-semibold ${overdue ? "text-[#80510F]" : "text-[#A32222]"}`}
        >
          {item.label}
        </p>
        <p className="mt-0.5 text-xs text-foreground">{description(item)}</p>
      </div>
      {visible.length > 1 && (
        <Link
          href="/app/attention"
          className="hidden shrink-0 text-xs text-muted-foreground hover:text-foreground sm:inline"
        >
          +{visible.length - 1} more
        </Link>
      )}
      <Link
        href={itemHref(item)}
        className={`inline-flex shrink-0 items-center gap-1 rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${overdue ? "border-[#E5D1A9] text-[#80510F] hover:bg-[#FFF6E8]" : "border-[#E9C4BF] text-[#9D2424] hover:bg-[#FFF1EF]"}`}
      >
        {action}
        <AltArrowRightIcon size={13} aria-hidden="true" />
      </Link>
      <button
        type="button"
        aria-label={`Dismiss ${item.label.toLowerCase()} alert`}
        title="Dismiss alert"
        className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-[#F5E8E6] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={() => {
          const next = [...dismissed, item.id];
          setLocalDismissed(next);
          try {
            sessionStorage.setItem(
              storageKey,
              JSON.stringify(next.slice(-100)),
            );
            window.dispatchEvent(new Event("recruta:attention-dismissed"));
          } catch {
            // Keep the local dismissal even without browser storage.
          }
        }}
      >
        <CloseIcon size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

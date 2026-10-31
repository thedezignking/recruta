import Link from "next/link";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";
import { ClockCircleIcon } from "@solar-icons/react/linear/clock-circle";
import { DangerCircleIcon } from "@solar-icons/react/linear/danger-circle";
import { LetterIcon } from "@solar-icons/react/linear/letter";
import { DangerCircleIcon as DangerCircleBoldIcon } from "@solar-icons/react/bold/danger-circle";
import { DangerTriangleIcon as DangerTriangleBoldIcon } from "@solar-icons/react/bold/danger-triangle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
export type AttentionItem = {
  id: string;
  applicationId: string | null;
  label: string;
  detail: string;
  at: string;
};

function attentionHref(item: AttentionItem) {
  if (!item.applicationId) return "/app/attention";
  const anchor = item.id.startsWith("email:")
    ? "#messages"
    : item.id.startsWith("screening:")
      ? "#screening"
      : "";
  return `/app/applications/${item.applicationId}${anchor}`;
}

function attentionVisual(item: AttentionItem) {
  if (item.id.startsWith("review:")) {
    return {
      Icon: ClockCircleIcon,
      iconClass: "bg-attention/10 text-attention",
      labelClass: "text-foreground",
    };
  }
  return {
    Icon: item.id.startsWith("email:")
      ? LetterIcon
      : item.id.startsWith("intake:")
        ? DangerTriangleBoldIcon
        : item.id.startsWith("screening:")
          ? DangerCircleBoldIcon
          : DangerCircleIcon,
    iconClass: "bg-destructive/8 text-destructive",
    labelClass: "text-destructive",
  };
}

function AttentionRow({
  item,
  compact,
}: {
  item: AttentionItem;
  compact: boolean;
}) {
  const { Icon, iconClass, labelClass } = attentionVisual(item);
  const action = item.id.startsWith("screening:")
    ? "Review screening"
    : item.id.startsWith("email:")
      ? "Review message"
      : item.id.startsWith("intake:")
        ? "Review intake"
        : "Review application";
  return (
    <Link
      href={attentionHref(item)}
      className={`group flex min-w-0 items-center gap-3 rounded-md px-3 py-2.5 hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${compact ? "min-h-14" : "min-h-16"}`}
    >
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-[10px] ${iconClass}`}
      >
        <Icon aria-hidden="true" size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${labelClass}`}>
          {item.label}
        </span>
        {item.detail && (
          <span className="mt-0.5 block break-words text-xs text-muted-foreground">
            {item.detail}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-foreground">
        <span className="hidden sm:inline">{action}</span>
        <AltArrowRightIcon aria-hidden="true" size={15} />
      </span>
    </Link>
  );
}

export function AttentionQueue({
  items,
  limit = 8,
  compact = false,
}: {
  items: AttentionItem[];
  limit?: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="overflow-hidden rounded-[10px] border border-border bg-card p-1">
        <div className="flex items-center gap-2 px-3 pt-2 pb-1">
          <span className="text-xs font-semibold">Needs attention</span>
          <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-destructive">
            {items.length}
          </span>
        </div>
        <div className="py-1">
          {items.slice(0, limit).map((item) => (
            <AttentionRow key={item.id} item={item} compact />
          ))}
        </div>
        <div className="min-w-0">
          {items.length > limit && (
            <Link
              href="/app/attention"
              className="inline-flex rounded-md px-3 py-1 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              View all {items.length} items
            </Link>
          )}
        </div>
      </div>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1 px-2">
        {items.length ? (
          items
            .slice(0, limit)
            .map((item) => (
              <AttentionRow key={item.id} item={item} compact={false} />
            ))
        ) : (
          <p className="px-3 pb-3 text-sm text-muted-foreground">
            Nothing needs attention.
          </p>
        )}
        {items.length > limit && (
          <Link
            href="/app/attention"
            className="px-3 py-2 text-sm hover:underline"
          >
            View attention queue
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

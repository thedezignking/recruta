import {
  matchLabels,
  matchReason,
  matchTones,
  type MatchSummary,
} from "@/lib/match-grade";
import { cn } from "cn";

/** Advisory requirement-match band; never a pass/fail decision. */
export function MatchBadge({
  match,
  showReason = false,
  className,
}: {
  match: MatchSummary | null | undefined;
  showReason?: boolean;
  className?: string;
}) {
  if (!match)
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>
        Not graded
      </span>
    );
  const reason = matchReason(match);
  return (
    <span className={cn("inline-flex flex-col items-start gap-0.5", className)}>
      <span
        title={reason}
        className={cn(
          "inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold whitespace-nowrap",
          matchTones[match.band],
        )}
      >
        {matchLabels[match.band]}
      </span>
      {showReason && (
        <span className="text-[11px] whitespace-nowrap text-muted-foreground">
          {reason}
        </span>
      )}
    </span>
  );
}

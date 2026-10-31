import { z } from "zod";

/**
 * Presentation for the match grade computed in the database
 * (private.refresh_application_match, ADR 0007). The band rules live there;
 * this module only describes and displays the stored result.
 */
export const matchBands = ["strong", "partial", "weak"] as const;
export type MatchBand = (typeof matchBands)[number];

export const matchSummarySchema = z.object({
  band: z.enum(matchBands),
  required_met: z.number().int().nonnegative(),
  required_total: z.number().int().nonnegative(),
  preferred_met: z.number().int().nonnegative(),
  preferred_total: z.number().int().nonnegative(),
});
export type MatchSummary = z.output<typeof matchSummarySchema>;

export const matchGapSchema = z.object({
  requirementId: z.string(),
  label: z.string(),
  type: z.enum(["required", "preferred"]),
  verdict: z.enum(["not_found", "contradicted", "unclear"]),
  followUp: z.string().nullable().optional(),
});
export type MatchGap = z.output<typeof matchGapSchema>;

export const matchFilterValues = ["strong", "partial", "weak", "ungraded"] as const;

export const matchLabels: Record<MatchBand, string> = {
  strong: "Strong match",
  partial: "Partial match",
  weak: "Weak match",
};

export const matchTones: Record<MatchBand, string> = {
  strong: "bg-success/10 text-success",
  partial: "bg-[#FFF3DF] text-[#8C5109]",
  weak: "bg-muted text-muted-foreground",
};

/** "4 of 5 required met · 1 of 2 preferred", or preferred only when no required. */
export function matchReason(match: MatchSummary) {
  const parts: string[] = [];
  if (match.required_total > 0)
    parts.push(`${match.required_met} of ${match.required_total} required met`);
  if (match.preferred_total > 0)
    parts.push(
      `${match.preferred_met} of ${match.preferred_total} preferred${match.required_total === 0 ? " met" : ""}`,
    );
  return parts.join(" · ");
}

export const gapVerdictLabels: Record<MatchGap["verdict"], string> = {
  not_found: "Not found in CV",
  contradicted: "Contradicted",
  unclear: "Unclear",
};

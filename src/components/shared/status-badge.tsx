import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

const labels: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  clarification_requested: "Needs clarification",
  approved: "Approved",
  declined: "Declined",
  cancelled: "Cancelled",
  open: "Open",
  on_hold: "On hold",
  filled: "Filled",
  closed_unfilled: "Closed",
  received: "Received",
  in_review: "In review",
  shortlisted: "Shortlisted",
  client_review: "Client review",
  interview: "Interview",
  offer: "Offer",
  placed: "Placed",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  pending: "Queued",
  extracting: "Processing",
  ready: "Ready",
  needs_information: "Needs information",
  failed: "Processing failed",
};

const tones: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-[#3c3ab5]",
  under_review: "bg-attention/12 text-[#8c5109]",
  clarification_requested: "bg-[#fff3df] text-[#8c5109]",
  approved: "bg-success/10 text-success",
  declined: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  open: "bg-success/10 text-success",
  on_hold: "bg-attention/12 text-[#8c5109]",
  filled: "bg-primary/10 text-[#3c3ab5]",
  closed_unfilled: "bg-muted text-muted-foreground",
  received: "bg-primary/10 text-[#3c3ab5]",
  in_review: "bg-attention/12 text-[#8c5109]",
  shortlisted: "bg-success/10 text-success",
  client_review: "bg-primary/10 text-[#3c3ab5]",
  interview: "bg-primary/10 text-[#3c3ab5]",
  offer: "bg-attention/12 text-[#8c5109]",
  placed: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  withdrawn: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  extracting: "bg-primary/10 text-[#3c3ab5]",
  ready: "bg-success/10 text-success",
  needs_information: "bg-attention/12 text-[#8c5109]",
  failed: "bg-destructive/10 text-destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "border-0",
        tones[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {labels[status] ?? status.replaceAll("_", " ")}
    </Badge>
  );
}

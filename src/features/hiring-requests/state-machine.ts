import type { HiringRequestStatus } from "@/types/domain";

export type HiringRequestAction =
  | "submit"
  | "start_review"
  | "request_clarification"
  | "resubmit"
  | "approve"
  | "decline"
  | "cancel";

const transitions: Record<
  HiringRequestStatus,
  Partial<Record<HiringRequestAction, HiringRequestStatus>>
> = {
  draft: { submit: "submitted", cancel: "cancelled" },
  submitted: { start_review: "under_review", cancel: "cancelled" },
  under_review: {
    request_clarification: "clarification_requested",
    approve: "approved",
    decline: "declined",
    cancel: "cancelled",
  },
  clarification_requested: { resubmit: "submitted", cancel: "cancelled" },
  approved: {},
  declined: {},
  cancelled: {},
};

export class InvalidHiringRequestTransitionError extends Error {
  constructor(from: HiringRequestStatus, action: HiringRequestAction) {
    super(
      `Cannot ${action.replaceAll("_", " ")} a request with status ${from}.`,
    );
    this.name = "InvalidHiringRequestTransitionError";
  }
}

export function transitionHiringRequest(
  from: HiringRequestStatus,
  action: HiringRequestAction,
) {
  const target = transitions[from][action];
  if (!target) throw new InvalidHiringRequestTransitionError(from, action);
  return target;
}

export function allowedHiringRequestActions(from: HiringRequestStatus) {
  return Object.keys(transitions[from]) as HiringRequestAction[];
}

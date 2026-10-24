export type AgencyRole =
  | "owner"
  | "administrator"
  | "recruitment_manager"
  | "recruiter";

export type ClientRole = "client_administrator" | "hiring_manager" | "reviewer";

export type HiringRequestStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "clarification_requested"
  | "approved"
  | "declined"
  | "cancelled";

export type JobStatus =
  | "draft"
  | "open"
  | "on_hold"
  | "filled"
  | "cancelled"
  | "closed_unfilled";

export type ApplicationStatus =
  | "received"
  | "in_review"
  | "shortlisted"
  | "client_review"
  | "interview"
  | "offer"
  | "placed"
  | "rejected"
  | "withdrawn";

export type ApplicationProcessingStatus =
  | "pending"
  | "extracting"
  | "ready"
  | "needs_information"
  | "failed";

export type WorkflowStage = {
  id: string;
  name: string;
  owner: "agency" | "client" | "candidate";
  complete: boolean;
  active: boolean;
};

export type ClientSummary = {
  id: string;
  name: string;
  industry: string;
  location: string;
  status: "active" | "inactive";
  openJobs: number;
  pendingRequests: number;
  contact: string;
};

export type HiringRequestSummary = {
  id: string;
  reference: string;
  title: string;
  client: string;
  department: string;
  location: string;
  workArrangement: "On-site" | "Hybrid" | "Remote";
  positions: number;
  status: HiringRequestStatus;
  submittedAt: string | null;
  owner: string;
  nextAction: string;
};

export type JobSummary = {
  id: string;
  reference: string;
  title: string;
  client: string;
  recruiter: string;
  status: JobStatus;
  positions: number;
  filled: number;
  deadline: string;
  workflow: string;
};

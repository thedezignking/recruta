import type { AgencyRole, ClientRole } from "@/types/domain";

export type Permission =
  | "manage_agency"
  | "manage_members"
  | "manage_clients"
  | "review_requests"
  | "approve_requests"
  | "create_jobs"
  | "assign_recruiters"
  | "manage_assigned_jobs"
  | "manage_client_team"
  | "create_client_requests"
  | "view_client_jobs";

const agencyPermissions: Record<AgencyRole, ReadonlySet<Permission>> = {
  owner: new Set([
    "manage_agency",
    "manage_members",
    "manage_clients",
    "review_requests",
    "approve_requests",
    "create_jobs",
    "assign_recruiters",
    "manage_assigned_jobs",
  ]),
  administrator: new Set([
    "manage_agency",
    "manage_members",
    "manage_clients",
    "review_requests",
    "approve_requests",
    "create_jobs",
    "assign_recruiters",
    "manage_assigned_jobs",
  ]),
  recruitment_manager: new Set([
    "manage_clients",
    "review_requests",
    "approve_requests",
    "create_jobs",
    "assign_recruiters",
    "manage_assigned_jobs",
  ]),
  recruiter: new Set([
    "manage_clients",
    "review_requests",
    "create_jobs",
    "manage_assigned_jobs",
  ]),
};

const clientPermissions: Record<ClientRole, ReadonlySet<Permission>> = {
  client_administrator: new Set([
    "manage_client_team",
    "create_client_requests",
    "view_client_jobs",
  ]),
  hiring_manager: new Set(["create_client_requests", "view_client_jobs"]),
  reviewer: new Set(["view_client_jobs"]),
};

export function agencyCan(role: AgencyRole, permission: Permission) {
  return agencyPermissions[role].has(permission);
}

export function clientCan(role: ClientRole, permission: Permission) {
  return clientPermissions[role].has(permission);
}

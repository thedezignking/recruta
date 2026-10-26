export type WorkspaceNotification = {
  id: string;
  kind: "application" | "request" | "assignment" | "feedback";
  title: string;
  detail: string;
  href: string;
  occurredAt: string;
};

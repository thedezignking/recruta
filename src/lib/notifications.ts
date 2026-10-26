export type WorkspaceNotification = {
  id: string;
  kind: "application" | "request" | "assignment";
  title: string;
  detail: string;
  href: string;
  occurredAt: string;
};

import { PortalShell } from "@/components/layout/portal-shell";
export default function ClientPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PortalShell>{children}</PortalShell>;
}

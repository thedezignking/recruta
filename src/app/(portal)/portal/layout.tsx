import { PortalShell } from "@/components/layout/portal-shell";
import { requirePortalPageContext } from "@/server/auth/portal-context";
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const c = await requirePortalPageContext();
  return (
    <PortalShell
      clientId={c.clientId}
      clientName={c.clientName}
      agencyName={c.agencyName}
      email={c.user.email ?? ""}
      organizations={c.memberships.map((m) => ({
        id: m.client_id,
        name: m.client_name,
      }))}
    >
      {children}
    </PortalShell>
  );
}

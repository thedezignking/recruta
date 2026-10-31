import { redirect } from "next/navigation";
import { requirePortalPageContext } from "@/server/auth/portal-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PortalRequestForm } from "@/components/portal/request-form";
export default async function NewPortalRequest() {
  const c = await requirePortalPageContext();
  if (c.role === "reviewer") redirect("/portal/requests");
  return (
    <div className="space-y-6">
      <PageHeader standalone title="New hiring request" />
      <Card>
        <CardContent>
          <PortalRequestForm clientId={c.clientId} />
        </CardContent>
      </Card>
    </div>
  );
}

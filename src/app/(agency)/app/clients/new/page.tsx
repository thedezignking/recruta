import { NewOrganizationForm } from "@/components/organizations/new-organization-form";
import { DetailHeader } from "@/components/shared/page-header";
import { ToolbarBreadcrumb } from "@/components/layout/toolbar-title-context";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getCompanyLookupEnv } from "@/lib/env";

export default async function NewOrganizationPage() {
  const { agencyId } = await requireAgencyPageContext();
  const lookup = getCompanyLookupEnv();
  return (
    <div className="mx-auto max-w-3xl pb-20 lg:pb-0">
      <ToolbarBreadcrumb
        parent="Organizations"
        parentHref="/app/clients"
        title="New organization"
      />
      <DetailHeader title="New organization" className="mb-6" />
      <NewOrganizationForm
        agencyId={agencyId}
        lookupClientId={lookup.clientId}
      />
    </div>
  );
}

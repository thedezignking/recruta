import { NewOrganizationForm } from "@/components/organizations/new-organization-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireAgencyPageContext } from "@/server/auth/context";
import { getCompanyLookupEnv } from "@/lib/env";

export default async function NewOrganizationPage() {
  const { agencyId } = await requireAgencyPageContext();
  const lookup = getCompanyLookupEnv();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New organization" />
      <NewOrganizationForm
        agencyId={agencyId}
        lookupClientId={
          lookup.apiKey && lookup.persistenceAllowed
            ? lookup.clientId
            : undefined
        }
      />
    </div>
  );
}

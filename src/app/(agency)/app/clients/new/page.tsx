import { NewOrganizationForm } from "@/components/organizations/new-organization-form";
import { PageHeader } from "@/components/shared/page-header";

export default function NewOrganizationPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        eyebrow="New organization"
        title="Add a client organization"
        description="Create the company record and its primary contact."
      />
      <NewOrganizationForm />
    </div>
  );
}

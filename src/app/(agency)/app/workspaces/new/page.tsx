import { OnboardingForm } from "@/components/auth/onboarding-form";
import { DetailHeader } from "@/components/shared/page-header";
import { ToolbarBreadcrumb } from "@/components/layout/toolbar-title-context";
import { ButtonLink } from "@/components/shared/button-link";
import { requireAgencyPageContext } from "@/server/auth/context";

export default async function NewWorkspacePage() {
  const { supabase, user } = await requireAgencyPageContext();
  const { data } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  return (
    <div className="mx-auto max-w-lg pb-20">
      <ToolbarBreadcrumb
        parent="Overview"
        parentHref="/app"
        title="Create workspace"
      />
      <DetailHeader
        title="Create workspace"
        actions={
          <ButtonLink href="/app" variant="outline">
            Cancel
          </ButtonLink>
        }
      />
      <div className="mt-6">
        <OnboardingForm fullName={data?.full_name} email={user.email} />
      </div>
    </div>
  );
}

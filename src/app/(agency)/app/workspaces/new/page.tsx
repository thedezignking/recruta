import { OnboardingForm } from "@/components/auth/onboarding-form";
import { PageHeader } from "@/components/shared/page-header";
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
      <PageHeader
        title="Create workspace"
        actions={
          <ButtonLink href="/app" variant="outline">
            Cancel
          </ButtonLink>
        }
      />
      <div className="mt-7">
        <OnboardingForm fullName={data?.full_name} email={user.email} />
      </div>
    </div>
  );
}

import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <AuthCard
      title="Set up your agency"
      description="This creates your secure tenant and makes you the workspace owner."
    >
      <OnboardingForm />
    </AuthCard>
  );
}

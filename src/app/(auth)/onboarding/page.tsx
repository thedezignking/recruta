import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export default function OnboardingPage() {
  return (
    <AuthCard title="Set up your agency">
      <OnboardingForm />
    </AuthCard>
  );
}

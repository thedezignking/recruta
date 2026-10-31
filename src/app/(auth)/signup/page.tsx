import { AuthCard } from "@/components/auth/auth-card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Verify your email, then set up your agency."
      switchLink={{
        prompt: "Already have an account?",
        label: "Sign in",
        href: "/login",
      }}
    >
      <SignupForm />
    </AuthCard>
  );
}

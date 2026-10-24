import { AuthCard } from "@/components/auth/auth-card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthCard
      title="Choose a new password"
      description="Use at least 10 characters for your Recruta account."
    >
      <UpdatePasswordForm />
    </AuthCard>
  );
}

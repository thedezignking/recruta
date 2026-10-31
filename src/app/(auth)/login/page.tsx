import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your agency workspace."
      switchLink={{
        prompt: "New to Recruta?",
        label: "Create account",
        href: "/signup",
      }}
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}

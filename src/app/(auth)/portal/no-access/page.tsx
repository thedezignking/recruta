import { AuthCard } from "@/components/auth/auth-card";
import { ButtonLink } from "@/components/shared/button-link";
export default function NoPortalAccess() {
  return (
    <AuthCard title="Organization access unavailable">
      <p className="text-sm text-muted-foreground">
        Ask your recruitment agency for an invitation, or contact them if your
        access has changed.
      </p>
      <ButtonLink className="mt-5" variant="outline" href="/auth/continue">
        Return to your account
      </ButtonLink>
    </AuthCard>
  );
}

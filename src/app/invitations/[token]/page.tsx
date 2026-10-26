import { notFound } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { InvitationAcceptForm } from "@/components/auth/invitation-accept-form";

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ kind?: string; setup?: string }>;
}) {
  const { token } = await params;
  const { kind, setup } = await searchParams;
  if (kind !== "agency" && kind !== "client") notFound();
  return (
    <AuthCard
      title="You’re invited"
      description="Accept the invitation to join your Recruta workspace."
    >
      <InvitationAcceptForm token={token} kind={kind} setup={setup === "1"} />
    </AuthCard>
  );
}

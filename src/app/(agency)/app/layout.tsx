import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { requireAgencyPageContext } from "@/server/auth/context";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [agencyResult, profileResult] = await Promise.all([
    context.supabase
      .from("agencies")
      .select("name")
      .eq("id", context.agencyId)
      .single(),
    context.supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", context.user.id)
      .single(),
  ]);
  return (
    <AppShell
      workspaceName={agencyResult.data?.name ?? "Agency workspace"}
      userName={
        profileResult.data?.full_name ?? context.user.email ?? "Team member"
      }
      userRole={context.role}
    >
      {children}
    </AppShell>
  );
}

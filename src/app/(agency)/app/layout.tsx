import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listUserWorkspaces } from "@/server/services/workspace";

export default async function AgencyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const [agencyResult, profileResult, workspaces] = await Promise.all([
    context.supabase
      .from("agencies")
      .select("name,slug")
      .eq("id", context.agencyId)
      .single(),
    context.supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", context.user.id)
      .single(),
    listUserWorkspaces(context.supabase, context.user.id),
  ]);
  return (
    <AppShell
      workspaceName={agencyResult.data?.name ?? "Agency workspace"}
      userName={
        profileResult.data?.full_name ?? context.user.email ?? "Team member"
      }
      userRole={context.role}
      userEmail={context.user.email}
      agencyId={context.agencyId}
      userId={context.user.id}
      agencySlug={agencyResult.data?.slug}
      workspaces={workspaces}
    >
      {children}
    </AppShell>
  );
}

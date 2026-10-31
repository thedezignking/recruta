import { AppShell } from "@/components/layout/app-shell";
import { redirect } from "next/navigation";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listUserWorkspaces } from "@/server/services/workspace";
import { agencyLogoUrl } from "@/server/services/agency-logo";
import { avatarUrl } from "@/server/services/user-avatar";

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
      .select("name,slug,logo_path")
      .eq("id", context.agencyId)
      .single(),
    context.supabase
      .from("user_profiles")
      .select("full_name,avatar_path")
      .eq("id", context.user.id)
      .single(),
    listUserWorkspaces(context.supabase, context.user.id),
  ]);
  return (
    <AppShell
      workspaceName={agencyResult.data?.name ?? "Agency workspace"}
      workspaceLogoUrl={agencyLogoUrl(
        context.supabase,
        agencyResult.data?.logo_path ?? null,
      )}
      userName={
        profileResult.data?.full_name ?? context.user.email ?? "Team member"
      }
      userAvatarUrl={avatarUrl(
        context.supabase,
        profileResult.data?.avatar_path ?? null,
      )}
      userId={context.user.id}
      userRole={context.role}
      userEmail={context.user.email}
      agencyId={context.agencyId}
      agencySlug={agencyResult.data?.slug}
      workspaces={workspaces.map((workspace) => ({
        ...workspace,
        logoUrl: agencyLogoUrl(context.supabase, workspace.logoPath),
      }))}
    >
      {children}
    </AppShell>
  );
}

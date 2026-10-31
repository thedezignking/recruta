import { AccountForm } from "@/components/auth/account-form";
import { ProfilePhoto } from "@/components/auth/profile-photo";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { Panel } from "@/components/shared/page-header";
import { SettingsLayout } from "@/components/shared/settings-layout";
import { requireAgencyPageContext } from "@/server/auth/context";
import { avatarUrl } from "@/server/services/user-avatar";

export default async function AccountPage() {
  const { supabase, user } = await requireAgencyPageContext();
  const { data } = await supabase
    .from("user_profiles")
    .select("full_name,avatar_path")
    .eq("id", user.id)
    .single();
  const name = data?.full_name ?? "";
  return (
    <SettingsLayout
      title="My account"
      sections={[
        { id: "profile", label: "Profile" },
        { id: "security", label: "Password" },
      ]}
    >
      <Panel title="Profile" anchorId="profile">
        <ProfilePhoto
          name={name || user.email || ""}
          initialPath={data?.avatar_path ?? null}
          initialUrl={avatarUrl(supabase, data?.avatar_path ?? null)}
        />
        <div className="mt-8 max-w-xl">
          <AccountForm name={name} email={user.email ?? ""} />
        </div>
      </Panel>
      <Panel title="Password" anchorId="security">
        <div className="max-w-xl">
          <UpdatePasswordForm inAccount />
        </div>
      </Panel>
    </SettingsLayout>
  );
}

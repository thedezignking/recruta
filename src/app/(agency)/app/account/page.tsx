import { AccountForm } from "@/components/auth/account-form";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAgencyPageContext } from "@/server/auth/context";

export default async function AccountPage() {
  const { supabase, user } = await requireAgencyPageContext();
  const { data } = await supabase
    .from("user_profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();
  return (
    <div className="mx-auto max-w-2xl pb-20 lg:pb-0">
      <PageHeader title="My account" />
      <div className="mt-6 flex flex-col gap-6">
        <Card id="profile">
          <CardHeader>
            <CardTitle>Personal details</CardTitle>
          </CardHeader>
          <CardContent>
            <AccountForm
              name={data?.full_name ?? ""}
              email={user.email ?? ""}
            />
          </CardContent>
        </Card>
        <Card id="security" className="scroll-mt-24">
          <CardHeader>
            <CardTitle>Password</CardTitle>
          </CardHeader>
          <CardContent>
            <UpdatePasswordForm inAccount />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { redirect } from "next/navigation";
import { InviteMemberForm } from "@/components/team/invite-member-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader, SectionHeader } from "@/components/shared/page-header";
import { avatarUrl } from "@/server/services/user-avatar";
import { agencyCan } from "@/server/authorization/permissions";
import { requireAgencyPageContext } from "@/server/auth/context";
import { listInvitations } from "@/server/services/invitations";
import { listAgencyMembers } from "@/server/services/workspace";

function label(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default async function TeamPage() {
  const context = await requireAgencyPageContext().catch(() => null);
  if (!context) redirect("/login");
  const canManage = agencyCan(context.role, "manage_members");
  const [members, invitations] = await Promise.all([
    listAgencyMembers(context.supabase, context.agencyId),
    canManage
      ? listInvitations(context.supabase, { agencyId: context.agencyId })
      : Promise.resolve({ items: [] }),
  ]);
  const pendingInvitations = invitations.items.filter(
    (invitation) => !invitation.accepted_at && !invitation.revoked_at,
  );

  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader title="Team" />
      {canManage ? (
        <div className="mb-6">
          <InviteMemberForm agencyId={context.agencyId} />
        </div>
      ) : null}
      <SectionHeader
        title="Members"
        count={members.items.length}
        className="mb-3"
      />
      <Card className="gap-0 py-0 shadow-none">
        <CardContent className="p-0">
          <Table className="min-w-[640px] [&_td]:px-3 [&_td]:py-3 [&_th]:px-3">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.items.map((member) => {
                const name = member.profile?.full_name ?? "Team member";
                return (
                  <TableRow key={member.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          {member.profile?.avatar_path && (
                            <AvatarImage
                              src={
                                avatarUrl(
                                  context.supabase,
                                  member.profile.avatar_path,
                                ) ?? undefined
                              }
                              alt=""
                            />
                          )}
                          <AvatarFallback className="bg-[#EDECFD] text-xs font-semibold text-[#4846B8]">
                            {initials(name)}
                          </AvatarFallback>
                        </Avatar>
                        <p className="font-medium">
                          {name}
                          {member.user_id === context.user.id && (
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                              (you)
                            </span>
                          )}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {label(member.role)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          member.status === "active"
                            ? "bg-success/10 text-success"
                            : undefined
                        }
                      >
                        {label(member.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {member.joined_at
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(new Date(member.joined_at))
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {canManage && pendingInvitations.length ? (
        <>
          <SectionHeader
            title="Pending invitations"
            count={pendingInvitations.length}
            className="mt-6 mb-3"
          />
          <Card className="gap-0 py-0 shadow-none">
            <CardContent className="p-0 py-1">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{invitation.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {label(invitation.role)} · Expires{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(invitation.expires_at))}
                    </p>
                  </div>
                  <Badge variant="secondary">Invited</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BuildingsIcon } from "@solar-icons/react/linear/buildings";
import { CaseMinimalisticIcon } from "@solar-icons/react/linear/case-minimalistic";
import { ClipboardTextIcon } from "@solar-icons/react/linear/clipboard-text";
import { HamburgerMenuIcon } from "@solar-icons/react/linear/hamburger-menu";
import { Home2Icon } from "@solar-icons/react/linear/home-2";
import { InboxIcon } from "@solar-icons/react/linear/inbox";
import { SidebarMinimalisticIcon } from "@solar-icons/react/linear/sidebar-minimalistic";
import { SettingsMinimalisticIcon } from "@solar-icons/react/linear/settings-minimalistic";
import { UsersGroupTwoRoundedIcon } from "@solar-icons/react/linear/users-group-two-rounded";
import { BuildingsIcon as BuildingsSolidIcon } from "@solar-icons/react/bold/buildings";
import { CaseMinimalisticIcon as CaseSolidIcon } from "@solar-icons/react/bold/case-minimalistic";
import { ClipboardTextIcon as RequestSolidIcon } from "@solar-icons/react/bold/clipboard-text";
import { Home2Icon as HomeSolidIcon } from "@solar-icons/react/bold/home-2";
import { InboxIcon as InboxSolidIcon } from "@solar-icons/react/bold/inbox";
import { SettingsMinimalisticIcon as SettingsSolidIcon } from "@solar-icons/react/bold/settings-minimalistic";
import { UsersGroupTwoRoundedIcon as UsersSolidIcon } from "@solar-icons/react/bold/users-group-two-rounded";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";
import { AccountMenu } from "./account-menu";
import { WorkspaceSearch } from "./workspace-search";
import { NotificationsMenu } from "./notifications-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RecrutaLogo } from "@/components/shared/recruta-mark";
import type { AgencyRole } from "@/types/domain";
import { cn } from "cn";

const items = [
  {
    label: "Overview",
    href: "/app",
    icon: Home2Icon,
    activeIcon: HomeSolidIcon,
  },
  {
    label: "Jobs",
    href: "/app/jobs",
    icon: CaseMinimalisticIcon,
    activeIcon: CaseSolidIcon,
  },
  {
    label: "Applications",
    href: "/app/applications",
    icon: InboxIcon,
    activeIcon: InboxSolidIcon,
  },
  {
    label: "Organizations",
    href: "/app/clients",
    icon: BuildingsIcon,
    activeIcon: BuildingsSolidIcon,
  },
  {
    label: "Hiring requests",
    href: "/app/requests",
    icon: ClipboardTextIcon,
    activeIcon: RequestSolidIcon,
  },
  {
    label: "Team",
    href: "/app/team",
    icon: UsersGroupTwoRoundedIcon,
    activeIcon: UsersSolidIcon,
    roles: ["owner", "administrator"] as AgencyRole[],
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: SettingsMinimalisticIcon,
    activeIcon: SettingsSolidIcon,
    roles: ["owner", "administrator"] as AgencyRole[],
  },
];

export function AppShell({
  children,
  workspaceName,
  userName,
  userRole,
  userEmail,
  agencyId,
  userId,
  agencySlug,
  workspaces,
}: {
  children: React.ReactNode;
  workspaceName: string;
  userName: string;
  userRole: AgencyRole;
  userEmail?: string;
  agencyId?: string;
  userId?: string;
  agencySlug?: string;
  workspaces?: WorkspaceOption[];
}) {
  const pathname = usePathname();
  const workspaceOptions = workspaces ?? [
    { id: agencyId ?? "", name: workspaceName, role: userRole },
  ];
  const [collapsed, setCollapsed] = useState(false);
  const visibleItems = items.filter(
    (item) => !("roles" in item) || item.roles?.includes(userRole),
  );
  const activeItem = visibleItems.find((item) =>
    item.href === "/app"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );
  const isActive = (href: string) =>
    href === "/app" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="min-h-dvh bg-card">
      <div
        className={cn(
          "min-h-dvh lg:grid",
          collapsed
            ? "lg:grid-cols-[76px_minmax(0,1fr)]"
            : "lg:grid-cols-[240px_minmax(0,1fr)]",
        )}
      >
        <aside className="sticky top-0 hidden h-dvh flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex">
          <div
            className={cn(
              "flex h-16 shrink-0 items-center px-5",
              collapsed && "justify-center px-0",
            )}
          >
            {!collapsed && (
              <Link href="/app" aria-label="Recruta overview">
                <RecrutaLogo size="sm" />
              </Link>
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(!collapsed && "ml-auto")}
                    aria-label={
                      collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                    aria-expanded={!collapsed}
                    onClick={() => setCollapsed(!collapsed)}
                  />
                }
              >
                <SidebarMinimalisticIcon aria-hidden="true" size={18} />
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? "Expand sidebar" : "Collapse sidebar"}
              </TooltipContent>
            </Tooltip>
          </div>

          <div className={cn("px-3", collapsed && "px-2")}>
            <div className={cn("mb-5", collapsed && "flex justify-center")}>
              <WorkspaceSwitcher
                currentId={agencyId}
                name={workspaceName}
                workspaces={workspaceOptions}
                compact={collapsed}
              />
            </div>
            <nav aria-label="Agency workspace" className="flex flex-col gap-1">
              {visibleItems
                .filter((item) => !item.roles)
                .map((item) => {
                  const active = isActive(item.href);
                  const Icon = active ? item.activeIcon : item.icon;
                  return (
                    <Tooltip
                      key={`${item.href}-${collapsed}`}
                      disabled={!collapsed}
                    >
                      <TooltipTrigger
                        render={
                          <Link
                            href={item.href}
                            aria-label={item.label}
                            aria-current={active ? "page" : undefined}
                            className={cn(
                              "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] hover:bg-sidebar-accent hover:text-foreground",
                              active &&
                                "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                              collapsed && "justify-center px-0",
                            )}
                          />
                        }
                      >
                        <Icon
                          aria-hidden="true"
                          size={20}
                          strokeWidth={1.6}
                          className={cn(active && "text-primary")}
                        />
                        {!collapsed && item.label}
                      </TooltipTrigger>
                      {collapsed && (
                        <TooltipContent side="right">
                          {item.label}
                        </TooltipContent>
                      )}
                    </Tooltip>
                  );
                })}
            </nav>
          </div>

          <div className="mt-auto p-3">
            {visibleItems.some((item) => item.roles) && (
              <nav
                aria-label="Workspace administration"
                className="mb-4 flex flex-col gap-1"
              >
                {visibleItems
                  .filter((item) => item.roles)
                  .map((item) => {
                    const active = isActive(item.href);
                    const Icon = active ? item.activeIcon : item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={collapsed ? item.label : undefined}
                        aria-label={item.label}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] hover:bg-sidebar-accent hover:text-foreground",
                          active &&
                            "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                          collapsed && "justify-center px-0",
                        )}
                      >
                        <Icon
                          aria-hidden="true"
                          size={20}
                          strokeWidth={1.6}
                          className={cn(active && "text-primary")}
                        />
                        {!collapsed && item.label}
                      </Link>
                    );
                  })}
              </nav>
            )}
            <AccountMenu
              name={userName}
              email={userEmail}
              role={userRole}
              agencySlug={agencySlug}
              workspaceName={workspaceName}
              compact={collapsed}
            />
          </div>
        </aside>

        <div className="min-w-0 bg-card">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-7 lg:px-8">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Open navigation"
                      />
                    }
                  >
                    <HamburgerMenuIcon aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-60">
                    <DropdownMenuGroup>
                      <DropdownMenuLabel>{workspaceName}</DropdownMenuLabel>
                      {visibleItems.map((item) => {
                        const Icon = isActive(item.href)
                          ? item.activeIcon
                          : item.icon;
                        return (
                          <DropdownMenuItem
                            key={item.href}
                            render={<Link href={item.href} />}
                          >
                            <Icon
                              aria-hidden="true"
                              className={cn(
                                isActive(item.href) && "text-primary",
                              )}
                            />
                            {item.label}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <WorkspaceSwitcher
                currentId={agencyId}
                name={workspaceName}
                workspaces={workspaceOptions}
                compact
              />
              <span className="hidden text-[13px] font-medium sm:inline lg:hidden">
                {activeItem?.label ?? "Workspace"}
              </span>
            </div>
            <WorkspaceSearch agencyId={agencyId} />
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <NotificationsMenu agencyId={agencyId} userId={userId} />
              <div className="shrink-0 lg:hidden">
                <AccountMenu
                  name={userName}
                  email={userEmail}
                  role={userRole}
                  compact
                  mobile
                  agencySlug={agencySlug}
                  workspaceName={workspaceName}
                />
              </div>
            </div>
          </header>
          <main
            id="main-content"
            className="mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-7 lg:px-9 lg:py-9"
          >
            {children}
          </main>
          <nav
            aria-label="Mobile workspace"
            className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-card px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 lg:hidden"
          >
            {visibleItems.slice(0, 4).map((item) => {
              const active = isActive(item.href);
              const Icon = active ? item.activeIcon : item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg text-[10px] text-muted-foreground",
                    active &&
                      "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    size={20}
                    className={cn(active && "text-primary")}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}

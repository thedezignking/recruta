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
import { UsersGroupTwoRoundedIcon } from "@solar-icons/react/linear/users-group-two-rounded";
import { SettingsMinimalisticIcon } from "@solar-icons/react/linear/settings-minimalistic";
import { SidebarMinimalisticIcon } from "@solar-icons/react/linear/sidebar-minimalistic";
import { BuildingsIcon as BuildingsSolidIcon } from "@solar-icons/react/bold/buildings";
import { CaseMinimalisticIcon as CaseSolidIcon } from "@solar-icons/react/bold/case-minimalistic";
import { ClipboardTextIcon as RequestSolidIcon } from "@solar-icons/react/bold/clipboard-text";
import { Home2Icon as HomeSolidIcon } from "@solar-icons/react/bold/home-2";
import { InboxIcon as InboxSolidIcon } from "@solar-icons/react/bold/inbox";
import { UsersGroupTwoRoundedIcon as UsersSolidIcon } from "@solar-icons/react/bold/users-group-two-rounded";
import { SettingsMinimalisticIcon as SettingsSolidIcon } from "@solar-icons/react/bold/settings-minimalistic";
import { AddIcon } from "@solar-icons/react/linear/add";
import { WorkspaceSwitcher, type WorkspaceOption } from "./workspace-switcher";
import { AccountMenu } from "./account-menu";
import { NotificationsMenu } from "./notifications-menu";
import { WorkspaceSearch } from "./workspace-search";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/shared/button-link";
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
import type { AgencyRole } from "@/types/domain";
import { cn } from "cn";
import { ToolbarTitleProvider } from "./toolbar-title-context";
import { AltArrowRightIcon } from "@solar-icons/react/linear/alt-arrow-right";

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
];

const utilityItems = [
  {
    label: "Team",
    href: "/app/team",
    icon: UsersGroupTwoRoundedIcon,
    activeIcon: UsersSolidIcon,
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: SettingsMinimalisticIcon,
    activeIcon: SettingsSolidIcon,
  },
];

type ShellMenu =
  | "desktop-workspace"
  | "mobile-workspace"
  | "desktop-account"
  | "mobile-account"
  | "mobile-navigation"
  | "notifications";

export function AppShell({
  children,
  workspaceName,
  workspaceLogoUrl,
  userName,
  userId,
  userRole,
  userEmail,
  agencyId,
  agencySlug,
  workspaces,
}: {
  children: React.ReactNode;
  workspaceName: string;
  workspaceLogoUrl?: string | null;
  userName: string;
  userId?: string;
  userRole: AgencyRole;
  userEmail?: string;
  agencyId?: string;
  agencySlug?: string;
  workspaces?: WorkspaceOption[];
}) {
  const pathname = usePathname();
  const workspaceOptions = workspaces ?? [
    {
      id: agencyId ?? "",
      name: workspaceName,
      role: userRole,
      slug: agencySlug,
    },
  ];
  const [collapsed, setCollapsed] = useState(false);
  const [detailTitle, setDetailTitle] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<ShellMenu | null>(null);
  const handleMenuOpenChange = (menu: ShellMenu) => (open: boolean) =>
    setOpenMenu((current) => (open ? menu : current === menu ? null : current));
  const visibleItems = items;
  const visibleUtilityItems =
    userRole === "recruitment_manager"
      ? utilityItems.filter((item) => item.href === "/app/settings")
      : utilityItems;
  const mobileItems =
    userRole === "owner" ||
    userRole === "administrator" ||
    userRole === "recruitment_manager"
      ? [...items, ...visibleUtilityItems]
      : items;
  const activeItem = visibleItems.find((item) =>
    item.href === "/app"
      ? pathname === item.href
      : pathname.startsWith(item.href),
  );
  const currentLabel =
    activeItem?.label ??
    (pathname.startsWith("/app/team")
      ? "Team"
      : pathname.startsWith("/app/settings")
        ? "Settings"
        : "Workspace");
  const isActive = (href: string) =>
    href === "/app" ? pathname === href : pathname.startsWith(href);

  return (
    <ToolbarTitleProvider setTitle={setDetailTitle}>
      <div className="min-h-dvh bg-card">
        <div
          className={cn(
            "min-h-dvh lg:grid",
            collapsed
              ? "lg:grid-cols-[60px_minmax(0,1fr)]"
              : "lg:grid-cols-[208px_minmax(0,1fr)]",
          )}
        >
          <aside className="sticky top-0 hidden h-dvh flex-col bg-sidebar text-sidebar-foreground lg:flex">
            <div
              className={cn(
                "flex h-14 shrink-0 items-center gap-1 px-2.5",
                collapsed && "justify-center px-0",
              )}
            >
              <div className={cn("min-w-0 flex-1", collapsed && "flex-none")}>
                <WorkspaceSwitcher
                  currentId={agencyId}
                  name={workspaceName}
                  workspaces={workspaceOptions}
                  compact={collapsed}
                  sidebar
                  logoUrl={workspaceLogoUrl}
                  agencySlug={agencySlug}
                  open={openMenu === "desktop-workspace"}
                  onOpenChange={handleMenuOpenChange("desktop-workspace")}
                />
              </div>
              {!collapsed && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Collapse sidebar"
                        aria-expanded="true"
                        onClick={() => {
                          setOpenMenu(null);
                          setCollapsed(true);
                        }}
                      />
                    }
                  >
                    <SidebarMinimalisticIcon aria-hidden="true" size={16} />
                  </TooltipTrigger>
                  <TooltipContent side="right">Collapse sidebar</TooltipContent>
                </Tooltip>
              )}
            </div>

            {collapsed && (
              <div className="flex justify-center pb-2">
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Expand sidebar"
                        aria-expanded="false"
                        onClick={() => {
                          setOpenMenu(null);
                          setCollapsed(false);
                        }}
                      />
                    }
                  >
                    <SidebarMinimalisticIcon aria-hidden="true" size={16} />
                  </TooltipTrigger>
                  <TooltipContent side="right">Expand sidebar</TooltipContent>
                </Tooltip>
              </div>
            )}

            <div className={cn("px-2.5 pt-5", collapsed && "px-2")}>
              <nav
                aria-label="Agency workspace"
                className="flex flex-col gap-1"
              >
                {visibleItems.map((item) => {
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
                              "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs hover:bg-sidebar-accent hover:text-foreground",
                              active &&
                                "bg-card font-medium text-sidebar-accent-foreground shadow-[0_1px_3px_rgb(0_0_0_/_0.06)] hover:bg-card",
                              collapsed && "justify-center px-0",
                            )}
                          />
                        }
                      >
                        <Icon
                          aria-hidden="true"
                          size={18}
                          strokeWidth={1.6}
                          className={cn(active && "text-foreground")}
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
              {(userRole === "owner" ||
                userRole === "administrator" ||
                userRole === "recruitment_manager") && (
                <nav
                  aria-label="Workspace management"
                  className="mt-5 flex flex-col gap-1 border-t border-[#E8E8E8] pt-4"
                >
                  {visibleUtilityItems.map((item) => {
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
                                "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-xs hover:bg-sidebar-accent hover:text-foreground",
                                active &&
                                  "bg-card font-medium text-sidebar-accent-foreground shadow-[0_1px_3px_rgb(0_0_0_/_0.06)] hover:bg-card",
                                collapsed && "justify-center px-0",
                              )}
                            />
                          }
                        >
                          <Icon
                            aria-hidden="true"
                            size={18}
                            strokeWidth={1.6}
                            className={cn(active && "text-foreground")}
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
              )}
            </div>

            <div className="mt-auto p-2.5">
              <div>
                <AccountMenu
                  name={userName}
                  email={userEmail}
                  role={userRole}
                  compact={collapsed}
                  agencySlug={agencySlug}
                  open={openMenu === "desktop-account"}
                  onOpenChange={handleMenuOpenChange("desktop-account")}
                />
              </div>
            </div>
          </aside>

          <div className="min-w-0 bg-card">
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border bg-card px-4 sm:px-7 lg:px-6">
              <div className="flex min-w-0 items-center gap-3 lg:hidden">
                <div>
                  <DropdownMenu
                    open={openMenu === "mobile-navigation"}
                    onOpenChange={handleMenuOpenChange("mobile-navigation")}
                  >
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
                        {mobileItems.map((item) => {
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
                  open={openMenu === "mobile-workspace"}
                  onOpenChange={handleMenuOpenChange("mobile-workspace")}
                />
                <span className="hidden text-[13px] font-medium sm:inline">
                  {currentLabel}
                </span>
              </div>
              {pathname.startsWith("/app/jobs/") && detailTitle ? (
                <nav
                  aria-label="Breadcrumb"
                  className="hidden min-w-0 items-center gap-2 text-sm lg:flex"
                >
                  <Link
                    href="/app/jobs"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    Jobs
                  </Link>
                  <AltArrowRightIcon
                    aria-hidden="true"
                    size={14}
                    className="shrink-0 text-muted-foreground"
                  />
                  <span className="truncate font-semibold" aria-current="page">
                    {detailTitle}
                  </span>
                </nav>
              ) : pathname === "/app" ? (
                <h1 className="hidden text-base font-semibold lg:block">
                  Overview
                </h1>
              ) : (
                <span className="hidden text-sm font-semibold lg:block">
                  {currentLabel}
                </span>
              )}
              <div className="ml-auto flex min-w-0 items-center gap-2">
                <NotificationsMenu
                  agencyId={agencyId}
                  userId={userId}
                  open={openMenu === "notifications"}
                  onOpenChange={handleMenuOpenChange("notifications")}
                />
                <div className="hidden w-[260px] lg:block">
                  <WorkspaceSearch agencyId={agencyId} />
                </div>
                {pathname === "/app/jobs" && (
                  <ButtonLink
                    href="/app/jobs?new=1"
                    size="sm"
                    className="hidden h-8 px-3 lg:inline-flex"
                  >
                    <AddIcon aria-hidden="true" data-icon="inline-start" />
                    New job
                  </ButtonLink>
                )}
                <div className="lg:hidden">
                  <AccountMenu
                    name={userName}
                    email={userEmail}
                    role={userRole}
                    compact
                    header
                    agencySlug={agencySlug}
                    open={openMenu === "mobile-account"}
                    onOpenChange={handleMenuOpenChange("mobile-account")}
                  />
                </div>
              </div>
            </header>
            <main
              id="main-content"
              className="mx-auto w-full max-w-[1480px] px-4 py-7 sm:px-7 lg:px-6 lg:py-6"
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
    </ToolbarTitleProvider>
  );
}

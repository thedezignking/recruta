"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  Buildings2Icon,
  CaseRoundIcon,
  ClipboardListIcon,
  HomeAngleIcon,
  InboxIcon,
  Logout2Icon,
  SettingsIcon,
  UsersGroupRoundedIcon,
} from "@solar-icons/react/linear";
import {
  Buildings2Icon as BuildingsSolidIcon,
  CaseRoundIcon as CaseSolidIcon,
  ClipboardListIcon as ClipboardSolidIcon,
  HomeAngleIcon as HomeSolidIcon,
  InboxIcon as InboxSolidIcon,
  SettingsIcon as SettingsSolidIcon,
  UsersGroupRoundedIcon as UsersSolidIcon,
} from "@solar-icons/react/bold";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    icon: HomeAngleIcon,
    activeIcon: HomeSolidIcon,
  },
  {
    label: "Jobs",
    href: "/app/jobs",
    icon: CaseRoundIcon,
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
    icon: Buildings2Icon,
    activeIcon: BuildingsSolidIcon,
  },
  {
    label: "Hiring requests",
    href: "/app/requests",
    icon: ClipboardListIcon,
    activeIcon: ClipboardSolidIcon,
  },
  {
    label: "Team",
    href: "/app/team",
    icon: UsersGroupRoundedIcon,
    activeIcon: UsersSolidIcon,
    roles: ["owner", "administrator"] as AgencyRole[],
  },
  {
    label: "Settings",
    href: "/app/settings",
    icon: SettingsIcon,
    activeIcon: SettingsSolidIcon,
    roles: ["owner", "administrator"] as AgencyRole[],
  },
];

function roleLabel(role: string) {
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function AppShell({
  children,
  workspaceName,
  userName,
  userRole,
}: {
  children: React.ReactNode;
  workspaceName: string;
  userName: string;
  userRole: AgencyRole;
}) {
  const pathname = usePathname();
  const visibleItems = items.filter(
    (item) => !("roles" in item) || (item.roles?.includes(userRole) ?? true),
  );

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
      <aside className="hidden min-h-screen flex-col bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex h-16 items-center border-b border-sidebar-border px-5">
          <RecrutaLogo />
        </div>
        <div className="px-3 pt-5">
          <p className="px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/60">
            Workspace
          </p>
          <nav
            aria-label="Agency workspace"
            className="mt-2 flex flex-col gap-1"
          >
            {visibleItems.map((item) => {
              const active =
                item.href === "/app"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              const Icon = active ? item.activeIcon : item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/68 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
                    active &&
                      "bg-sidebar-accent font-medium text-sidebar-foreground shadow-[inset_3px_0_0_#5C5AED]",
                  )}
                >
                  <Icon aria-hidden="true" size={19} strokeWidth={1.65} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {initials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-sidebar-foreground/50">
                {roleLabel(userRole)}
              </p>
            </div>
            <form action="/auth/logout" method="post">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Log out"
                      className="text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    />
                  }
                >
                  <Logout2Icon aria-hidden="true" size={17} />
                </TooltipTrigger>
                <TooltipContent>Log out</TooltipContent>
              </Tooltip>
            </form>
          </div>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card/92 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="lg:hidden">
            <RecrutaLogo />
          </div>
          <div className="hidden items-center gap-2 text-sm lg:flex">
            <span className="text-muted-foreground">{workspaceName}</span>
            <span aria-hidden="true" className="text-border">
              /
            </span>
            <span className="font-medium">Agency workspace</span>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                  />
                }
              >
                <BellIcon aria-hidden="true" size={19} strokeWidth={1.7} />
              </TooltipTrigger>
              <TooltipContent>Notifications</TooltipContent>
            </Tooltip>
            <Avatar size="sm" className="lg:hidden">
              <AvatarFallback>{initials(userName)}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1480px] p-4 sm:p-6 lg:p-8"
        >
          {children}
        </main>
        <nav
          aria-label="Mobile workspace"
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t bg-card px-2 py-1.5 lg:hidden"
        >
          {visibleItems.slice(0, 4).map((item) => {
            const active =
              item.href === "/app"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = active ? item.activeIcon : item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md py-1 text-[10px] text-muted-foreground",
                  active && "text-primary",
                )}
              >
                <Icon aria-hidden="true" size={20} />
                <span>{item.label.replace("Hiring ", "")}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

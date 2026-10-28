"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { Logout2Icon } from "@solar-icons/react/linear/logout-2";
import { LockPasswordIcon } from "@solar-icons/react/linear/lock-password";
import { ArrowRightUpIcon } from "@solar-icons/react/linear/arrow-right-up";
import { UserRoundedIcon } from "@solar-icons/react/linear/user-rounded";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgencyRole } from "@/types/domain";
import { cn } from "cn";

export function AccountMenu({
  name,
  email,
  role,
  compact = false,
  mobile = false,
  header = false,
  agencySlug,
  open,
  onOpenChange,
}: {
  name: string;
  email?: string;
  role: AgencyRole;
  compact?: boolean;
  mobile?: boolean;
  header?: boolean;
  agencySlug?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const signingOut = useRef(false);
  const roleName = role.replaceAll("_", " ");
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  async function logout() {
    if (signingOut.current) return;
    signingOut.current = true;
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/auth/logout", {
        method: "POST",
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("logout_failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setError("Could not log out. Try again.");
      signingOut.current = false;
      setPending(false);
    }
  }
  return (
    <>
      <DropdownMenu open={open} onOpenChange={onOpenChange}>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              aria-label={
                mobile ? "Open mobile account menu" : "Open account menu"
              }
              title={`${name} · ${roleName}`}
              disabled={pending}
              className={cn(
                "h-10 w-full justify-start gap-2.5 px-1.5 data-popup-open:bg-sidebar-accent",
                !header &&
                  !mobile &&
                  "h-12 gap-2 rounded-[10px] border border-border bg-card px-2 text-sidebar-foreground shadow-none hover:bg-card",
                compact && "justify-center px-0",
                header && "size-9 min-h-9 p-0",
              )}
            />
          }
        >
          <Avatar className={cn("size-6", !header && !compact && "size-8")}>
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-xs font-semibold leading-4">
                {name}
              </span>
              <span className="mt-0.5 block truncate text-[10px] capitalize leading-3 text-muted-foreground">
                {roleName}
              </span>
            </span>
          )}
          {!compact && (
            <AltArrowDownIcon
              aria-hidden="true"
              size={14}
              className="text-muted-foreground"
            />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={header || mobile ? "bottom" : "top"}
          align={header || mobile ? "end" : "start"}
          sideOffset={6}
          className="w-52 max-w-[calc(100vw-24px)] rounded-lg p-1 [&_[data-slot=dropdown-menu-item]]:min-h-7 [&_[data-slot=dropdown-menu-item]]:gap-2 [&_[data-slot=dropdown-menu-item]]:px-2 [&_[data-slot=dropdown-menu-item]]:text-xs"
        >
          <DropdownMenuGroup className="rounded-md border border-border bg-muted/30 p-0.5">
            <DropdownMenuLabel className="flex items-center gap-1.5 px-1.5 py-1.5">
              <Avatar className="size-5">
                <AvatarFallback className="bg-primary/10 text-[10px] text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1">
                  <span className="min-w-0 truncate text-xs font-semibold text-foreground">
                    {name}
                  </span>
                  <span
                    title="Role in current workspace"
                    className="shrink-0 rounded-sm bg-card px-1 py-0.5 text-[9px] font-medium capitalize leading-none text-muted-foreground ring-1 ring-border"
                  >
                    {roleName}
                  </span>
                </span>
                {email && (
                  <span
                    className="mt-0.5 block truncate text-[10px] font-normal text-muted-foreground"
                    title={email}
                  >
                    {email}
                  </span>
                )}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="mx-1" />
            <DropdownMenuItem render={<Link href="/app/account" />}>
              <UserRoundedIcon aria-hidden="true" />
              My account
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/app/account#security" />}>
              <LockPasswordIcon aria-hidden="true" />
              Password &amp; security
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {agencySlug && (
            <DropdownMenuGroup>
              <DropdownMenuItem
                render={
                  <Link
                    href={`/careers/${encodeURIComponent(agencySlug)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                <ArrowRightUpIcon aria-hidden="true" />
                View careers page
              </DropdownMenuItem>
            </DropdownMenuGroup>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              disabled={pending}
              closeOnClick={false}
              onClick={() => void logout()}
            >
              <Logout2Icon aria-hidden="true" />
              {pending ? "Logging out…" : "Log out"}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {error && (
            <p role="alert" className="px-2 py-2 text-xs text-destructive">
              {error}
            </p>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

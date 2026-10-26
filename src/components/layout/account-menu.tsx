"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { Logout2Icon } from "@solar-icons/react/linear/logout-2";
import { LockPasswordIcon } from "@solar-icons/react/linear/lock-password";
import { KeyboardIcon } from "@solar-icons/react/linear/keyboard";
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
import { KeyboardShortcuts } from "./keyboard-shortcuts";

export function AccountMenu({
  name,
  email,
  role,
  compact = false,
  mobile = false,
  agencySlug,
  workspaceName,
}: {
  name: string;
  email?: string;
  role: AgencyRole;
  compact?: boolean;
  mobile?: boolean;
  agencySlug?: string;
  workspaceName?: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const signingOut = useRef(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const roleName = role.replaceAll("_", " ");
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
      <DropdownMenu>
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
                "h-auto min-h-14 w-full justify-start gap-3 p-2.5 data-popup-open:bg-sidebar-accent",
                compact && "justify-center",
              )}
            />
          }
        >
          <Avatar>
            <AvatarFallback className="bg-foreground text-primary-foreground">
              {name
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!compact && (
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[13px] font-medium leading-5">
                {name}
              </span>
              <span className="mt-0.5 block truncate text-xs capitalize text-muted-foreground">
                {pending ? "Logging out…" : roleName}
              </span>
            </span>
          )}
          {!compact && <AltArrowDownIcon aria-hidden="true" size={16} />}
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side={mobile ? "bottom" : "top"}
          align={mobile ? "end" : "start"}
          sideOffset={8}
          className="w-72 max-w-[calc(100vw-24px)] rounded-xl p-2 [&_[data-slot=dropdown-menu-item]]:min-h-10 [&_[data-slot=dropdown-menu-item]]:gap-3 [&_[data-slot=dropdown-menu-item]]:px-3"
        >
          <DropdownMenuGroup>
            <DropdownMenuLabel className="px-3 py-3">
              <span className="block break-words text-sm font-medium text-foreground">
                {name}
              </span>
              {email && (
                <span className="mt-1 block break-all text-xs font-normal text-muted-foreground">
                  {email}
                </span>
              )}
              <span className="mt-2 block truncate text-xs font-normal text-muted-foreground">
                {workspaceName ? `${workspaceName} · ` : ""}
                <span className="capitalize">{roleName}</span>
              </span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem render={<Link href="/app/account" />}>
              <UserRoundedIcon aria-hidden="true" />
              My account
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/app/account#security" />}>
              <LockPasswordIcon aria-hidden="true" />
              Password &amp; security
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuGroup className="mt-2">
            <DropdownMenuItem onClick={() => setShortcutsOpen(true)}>
              <KeyboardIcon aria-hidden="true" />
              Keyboard shortcuts
            </DropdownMenuItem>
            {agencySlug && (
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
            )}
          </DropdownMenuGroup>
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
      <KeyboardShortcuts open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </>
  );
}

"use client";

import { workspaceLogoSrc } from "@/lib/workspace-logo";

import { useRef, useState } from "react";
import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear/add";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { CheckIcon } from "@solar-icons/react/linear/check";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "cn";

export type WorkspaceOption = {
  id: string;
  name: string;
  role: string;
  slug?: string;
  logoUrl?: string | null;
};
function initial(name: string) {
  return name.trim()[0]?.toUpperCase() || "W";
}

export { workspaceLogoSrc };

export function WorkspaceSwitcher({
  currentId,
  name,
  workspaces,
  compact = false,
  sidebar = false,
  logoUrl,
  agencySlug,
  open,
  onOpenChange,
}: {
  currentId?: string;
  name: string;
  workspaces: WorkspaceOption[];
  compact?: boolean;
  sidebar?: boolean;
  logoUrl?: string | null;
  agencySlug?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const switching = useRef(false);
  const imageSrc = workspaceLogoSrc(logoUrl, agencySlug);
  async function select(id: string) {
    if (id === currentId || switching.current) return;
    switching.current = true;
    setPending(true);
    setError(undefined);
    try {
      const response = await fetch("/api/v1/workspaces/select", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agencyId: id }),
      });
      if (!response.ok) throw new Error("switch_failed");
      // A full navigation discards previous-tenant component state and cached views.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- A tenant switch must discard the previous workspace's client state.
      window.location.assign("/app");
    } catch {
      switching.current = false;
      setPending(false);
      setError("Could not switch workspace. Try again.");
    }
  }
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        render={
          <Button
            variant={sidebar ? "ghost" : "outline"}
            disabled={pending}
            aria-label="Switch workspace"
            title={name}
            className={cn(
              "h-9 w-full justify-start gap-2 px-2.5 text-[13px] font-normal shadow-none",
              sidebar &&
                "h-10 gap-2 border-0 px-1.5 font-semibold text-foreground",
              compact && "size-9 justify-center px-0",
            )}
          />
        }
      >
        {sidebar ? (
          <Avatar className="size-6 rounded-md after:rounded-md">
            {imageSrc && (
              <AvatarImage
                src={imageSrc}
                alt=""
                className="rounded-md object-contain"
              />
            )}
            <AvatarFallback className="rounded-md bg-primary text-[11px] font-semibold text-primary-foreground">
              {initial(name)}
            </AvatarFallback>
          </Avatar>
        ) : (
          <span
            aria-hidden="true"
            className="grid size-5 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-semibold text-foreground"
          >
            {initial(name)}
          </span>
        )}
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              {pending ? "Switching…" : name}
            </span>
            {sidebar ? (
              <svg
                aria-hidden="true"
                viewBox="0 0 12 16"
                className="h-4 w-3 text-muted-foreground"
              >
                <path
                  d="m3.5 5.5 2.5-2.5 2.5 2.5M3.5 10.5 6 13l2.5-2.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <AltArrowDownIcon
                aria-hidden="true"
                size={14}
                className="text-muted-foreground"
              />
            )}
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={6}
        align="start"
        className="w-56 max-w-[calc(100vw-24px)] rounded-lg p-1"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1.5">
            Your workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => {
            const rowLogoSrc = workspaceLogoSrc(
              workspace.logoUrl ??
                (workspace.id === currentId ? logoUrl : null),
              workspace.slug,
            );
            return (
              <DropdownMenuItem
                key={workspace.id}
                disabled={pending}
                closeOnClick={false}
                onClick={() => void select(workspace.id)}
                className={cn(
                  "min-h-10 gap-2 px-2",
                  workspace.id === currentId && "bg-muted/70",
                )}
                aria-label={`${workspace.name}${workspace.id === currentId ? ", current workspace" : ""}`}
              >
                <Avatar
                  className="size-6 rounded-md after:rounded-md"
                  aria-hidden="true"
                >
                  {rowLogoSrc && (
                    <AvatarImage
                      src={rowLogoSrc}
                      alt=""
                      className="rounded-md object-contain"
                    />
                  )}
                  <AvatarFallback className="rounded-md bg-primary/10 text-[11px] font-medium text-primary">
                    {initial(workspace.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">
                    {workspace.name}
                  </span>
                  <span className="block text-[11px] capitalize text-muted-foreground">
                    {workspace.role.replaceAll("_", " ")}
                  </span>
                </span>
                {workspace.id === currentId && (
                  <CheckIcon aria-hidden="true" className="size-4 shrink-0" />
                )}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href="/app/workspaces/new" />}
            className="min-h-8 gap-2 px-2 text-xs"
          >
            <AddIcon aria-hidden="true" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuGroup>
        {error && (
          <p role="alert" className="px-2.5 py-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

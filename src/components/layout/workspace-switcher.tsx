"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AddIcon } from "@solar-icons/react/linear/add";
import { AltArrowDownIcon } from "@solar-icons/react/linear/alt-arrow-down";
import { CheckReadIcon } from "@solar-icons/react/linear/check-read";
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
import { cn } from "cn";

export type WorkspaceOption = { id: string; name: string; role: string };
function initial(name: string) {
  return name.trim()[0]?.toUpperCase() || "W";
}

export function WorkspaceSwitcher({
  currentId,
  name,
  workspaces,
  compact = false,
}: {
  currentId?: string;
  name: string;
  workspaces: WorkspaceOption[];
  compact?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const switching = useRef(false);
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
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            disabled={pending}
            aria-label="Switch workspace"
            title={name}
            className={cn(
              "h-9 w-full justify-start gap-2 px-2.5 text-[13px] font-normal shadow-none",
              compact && "size-9 justify-center px-0",
            )}
          />
        }
      >
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-semibold text-foreground"
        >
          {initial(name)}
        </span>
        {!compact && (
          <>
            <span className="min-w-0 flex-1 truncate text-left">
              {pending ? "Switching…" : name}
            </span>
            <AltArrowDownIcon
              aria-hidden="true"
              size={14}
              className="text-muted-foreground"
            />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={6}
        align="start"
        className="w-64 max-w-[calc(100vw-24px)] rounded-xl p-1.5"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2.5 py-2">
            Your workspaces
          </DropdownMenuLabel>
          {workspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              disabled={pending}
              closeOnClick={false}
              onClick={() => void select(workspace.id)}
              className="min-h-12 gap-2.5 px-2.5"
              aria-label={`${workspace.name}${workspace.id === currentId ? ", current workspace" : ""}`}
            >
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary text-xs font-medium"
              >
                {initial(workspace.name)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                  {workspace.name}
                </span>
                <span className="block text-xs capitalize text-muted-foreground">
                  {workspace.role.replaceAll("_", " ")}
                </span>
              </span>
              {workspace.id === currentId && (
                <CheckReadIcon aria-hidden="true" className="size-4 shrink-0" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            render={<Link href="/app/workspaces/new" />}
            className="min-h-10 gap-2.5 px-2.5"
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

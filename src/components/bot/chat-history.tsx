"use client";

import { useState } from "react";
import {
  AddIcon,
  MenuDotsIcon,
  Pen2Icon,
  TrashBinMinimalisticIcon,
} from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ConversationSummary } from "@/lib/assistant";
import { cn } from "cn";

function group(updatedAt: string, now: number) {
  const days = (now - new Date(updatedAt).getTime()) / 86400000;
  if (days < 1 && new Date(updatedAt).getDate() === new Date(now).getDate())
    return "Today";
  if (days < 2) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
  return "Older";
}

/** Saved chats, newest first, grouped by when they were last used. */
export function ChatHistory({
  conversations,
  activeId,
  now,
  onSelect,
  onNew,
  onRename,
  onDelete,
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  now: number;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const groups = new Map<string, ConversationSummary[]>();
  for (const conversation of conversations) {
    const key = group(conversation.updated_at, now);
    groups.set(key, [...(groups.get(key) ?? []), conversation]);
  }

  return (
    <nav aria-label="Chat history" className="flex min-h-0 flex-1 flex-col">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start"
        onClick={onNew}
      >
        <AddIcon data-icon="inline-start" aria-hidden="true" />
        New chat
      </Button>
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="px-2 text-xs text-muted-foreground">
            Your chats will appear here.
          </p>
        ) : (
          [...groups].map(([label, items]) => (
            <section key={label} className="mb-4">
              <h3 className="px-2 pb-1 text-[11px] font-medium text-muted-foreground">
                {label}
              </h3>
              <ul className="flex flex-col gap-0.5">
                {items.map((conversation) => {
                  const active = conversation.id === activeId;
                  if (editing === conversation.id)
                    return (
                      <li key={conversation.id}>
                        <form
                          onSubmit={async (event) => {
                            event.preventDefault();
                            if (
                              title.trim() &&
                              (await onRename(conversation.id, title.trim()))
                            )
                              setEditing(null);
                          }}
                        >
                          <label
                            className="sr-only"
                            htmlFor={`rename-${conversation.id}`}
                          >
                            Chat name
                          </label>
                          <input
                            id={`rename-${conversation.id}`}
                            autoFocus
                            value={title}
                            maxLength={120}
                            onChange={(e) => setTitle(e.target.value)}
                            onBlur={() => setEditing(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditing(null);
                            }}
                            className="h-8 w-full rounded-md border border-[#5C5AED]/50 bg-white px-2 text-[13px] outline-none ring-2 ring-[#5C5AED]/20"
                          />
                        </form>
                      </li>
                    );
                  if (confirming === conversation.id)
                    return (
                      <li
                        key={conversation.id}
                        className="rounded-md bg-destructive/5 px-2 py-2 text-xs"
                      >
                        <p className="font-medium">Delete this chat?</p>
                        <p className="mt-0.5 text-muted-foreground">
                          Its messages can&apos;t be recovered.
                        </p>
                        <div className="mt-2 flex gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={async () => {
                              if (await onDelete(conversation.id))
                                setConfirming(null);
                            }}
                          >
                            Delete
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setConfirming(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </li>
                    );
                  return (
                    <li key={conversation.id} className="group relative">
                      <button
                        type="button"
                        aria-current={active ? "page" : undefined}
                        onClick={() => onSelect(conversation.id)}
                        className={cn(
                          "flex h-8 w-full items-center rounded-md px-2 pr-8 text-left text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[#5C5AED]",
                          active
                            ? "bg-white font-medium text-foreground shadow-[0_1px_3px_rgb(0_0_0_/_0.06)]"
                            : "text-foreground/80 hover:bg-[#EFEFF1]",
                        )}
                      >
                        <span className="truncate">{conversation.title}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          aria-label={`Options for ${conversation.title}`}
                          className={cn(
                            "absolute top-1 right-1 grid size-6 place-items-center rounded text-muted-foreground outline-none hover:bg-black/5 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-[#5C5AED] data-[popup-open]:opacity-100",
                            active
                              ? "opacity-100"
                              : "opacity-0 group-hover:opacity-100",
                          )}
                        >
                          <MenuDotsIcon aria-hidden="true" size={15} />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-36">
                          <DropdownMenuItem
                            onClick={() => {
                              setTitle(conversation.title);
                              setEditing(conversation.id);
                            }}
                          >
                            <Pen2Icon aria-hidden="true" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setConfirming(conversation.id)}
                          >
                            <TrashBinMinimalisticIcon aria-hidden="true" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </nav>
  );
}

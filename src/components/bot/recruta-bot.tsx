"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpIcon, RefreshIcon } from "@solar-icons/react/linear";
import { StarsMinimalisticIcon } from "@solar-icons/react/bold";
import { Button } from "@/components/ui/button";
import {
  assistantReplySchema,
  assistantSuggestions,
  type AssistantMessage,
  type StageChangeProposal,
} from "@/lib/assistant";
import { cn } from "cn";

type Turn =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      content: string;
      actions: StageChangeProposal[];
      links: { label: string; href: string }[];
    };

const stageLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

export function RecrutaBot({
  agencyId,
  firstName,
  chatStatus,
  work,
}: {
  agencyId: string;
  firstName: string;
  /** Why chat is unavailable, or null when it can be used. */
  chatStatus: string | null;
  work: React.ReactNode;
}) {
  const [tab, setTab] = useState<"chat" | "work">("chat");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const disabled = !!chatStatus;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, pending]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending || disabled) return;
    const next: Turn[] = [...turns, { role: "user", content }];
    setTurns(next);
    setDraft("");
    setPending(true);
    setError(null);
    try {
      const messages: AssistantMessage[] = next
        .slice(-20)
        .map((turn) => ({ role: turn.role, content: turn.content }));
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify({ messages }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Recruta couldn't answer that.");
      const reply = assistantReplySchema.parse(body.data);
      setTurns((current) => [
        ...current,
        {
          role: "assistant",
          content: reply.reply,
          actions: reply.actions,
          links: reply.links,
        },
      ]);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Recruta couldn't answer that.",
      );
    } finally {
      setPending(false);
    }
  }

  const composer = (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void send(draft);
      }}
      className={cn(
        "flex items-end gap-2 rounded-[18px] border border-border bg-card p-2 pl-4 shadow-[0_8px_30px_-12px_rgb(17_17_17_/_0.12)] focus-within:border-[#5C5AED]/40",
        disabled && "opacity-60",
      )}
    >
      <label htmlFor="ask-recruta" className="sr-only">
        Ask Recruta
      </label>
      <textarea
        id="ask-recruta"
        rows={1}
        value={draft}
        disabled={disabled || pending}
        maxLength={4000}
        placeholder="Ask Recruta about your jobs and applicants"
        onChange={(event) => {
          setDraft(event.target.value);
          event.target.style.height = "auto";
          event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void send(draft);
          }
        }}
        className="max-h-[180px] min-h-9 flex-1 resize-none bg-transparent py-2 text-[15px] leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={disabled || pending || !draft.trim()}
        className="mk-press grid size-9 shrink-0 place-items-center rounded-full bg-[#5C5AED] text-white outline-none hover:bg-[#4E4CE0] focus-visible:ring-3 focus-visible:ring-[#5C5AED]/40 disabled:bg-[#C9C8FA]"
      >
        <ArrowUpIcon aria-hidden="true" size={18} />
      </button>
    </form>
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex items-center justify-center">
        <div
          role="tablist"
          aria-label="Recruta bot"
          className="inline-flex rounded-full bg-[#F1F1F3] p-1"
        >
          {(["chat", "work"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={tab === value}
              aria-controls={`bot-${value}`}
              onClick={() => setTab(value)}
              className={cn(
                "h-9 min-w-24 rounded-full px-5 text-sm font-medium outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-[#5C5AED]",
                tab === value
                  ? "bg-white text-foreground shadow-[0_1px_3px_rgb(17_17_17_/_0.1)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {value === "chat" ? "Chat" : "Work"}
            </button>
          ))}
        </div>
        {tab === "chat" && turns.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="New chat"
            title="New chat"
            className="absolute right-0"
            onClick={() => {
              setTurns([]);
              setError(null);
            }}
          >
            <RefreshIcon aria-hidden="true" />
          </Button>
        )}
      </div>

      {tab === "work" ? (
        <div id="bot-work" role="tabpanel" className="mt-8">
          {work}
        </div>
      ) : (
        <div id="bot-chat" role="tabpanel" className="flex flex-1 flex-col">
          {turns.length === 0 ? (
            <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
              <h2 className="text-center text-[28px] font-semibold tracking-[-0.03em]">
                How can I help, {firstName}?
              </h2>
              <div className="mt-7">{composer}</div>
              {chatStatus ? (
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {chatStatus}
                </p>
              ) : (
                <ul className="mt-5 flex flex-col">
                  {assistantSuggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => void send(suggestion)}
                        className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-[15px] text-muted-foreground outline-none hover:bg-[#F6F6F8] hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
                      >
                        <StarsMinimalisticIcon
                          aria-hidden="true"
                          size={16}
                          className="shrink-0 text-[#5C5AED]"
                        />
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <ol
                aria-live="polite"
                className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 py-8"
              >
                {turns.map((turn, index) =>
                  turn.role === "user" ? (
                    <li key={index} className="flex justify-end">
                      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#F1F1F3] px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">
                        {turn.content}
                      </p>
                    </li>
                  ) : (
                    <li key={index} className="flex gap-3">
                      <span
                        aria-hidden="true"
                        className="grid size-7 shrink-0 place-items-center rounded-full bg-[#5C5AED] text-white"
                      >
                        <StarsMinimalisticIcon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <RichText text={turn.content} />
                        {turn.actions.map((action) => (
                          <StageChangeCard
                            key={`${action.applicationId}-${action.to}`}
                            action={action}
                            agencyId={agencyId}
                          />
                        ))}
                        {turn.links.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {turn.links.map((link) => (
                              <Link
                                key={link.href}
                                href={link.href}
                                className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:border-[#5C5AED]/40 hover:text-[#5C5AED]"
                              >
                                {link.label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </li>
                  ),
                )}
                {pending && (
                  <li className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span
                      aria-hidden="true"
                      className="grid size-7 place-items-center rounded-full bg-[#5C5AED]/15 text-[#5C5AED]"
                    >
                      <StarsMinimalisticIcon
                        size={14}
                        className="animate-pulse"
                      />
                    </span>
                    Looking through your workspace…
                  </li>
                )}
                {error && (
                  <li role="alert" className="text-sm text-destructive">
                    {error}
                  </li>
                )}
                <div ref={endRef} />
              </ol>
              <div className="sticky bottom-20 mx-auto w-full max-w-2xl pb-4 lg:bottom-0">
                {composer}
                <p className="mt-2 text-center text-[11px] text-muted-foreground">
                  Recruta can be wrong. It never changes anything without your
                  confirmation.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Minimal formatting for replies: paragraphs, "- " bullets and **bold**. */
function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (line: string) =>
    line
      .split(/(\*\*[^*]+\*\*)/g)
      .map((part, index) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={index}>{part.slice(2, -2)}</strong>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      );
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-7">
      {blocks.map((block, index) => {
        const lines = block.split("\n").filter(Boolean);
        if (lines.length && lines.every((line) => /^\s*[-*•] /.test(line)))
          return (
            <ul key={index} className="flex list-disc flex-col gap-1 pl-5">
              {lines.map((line, i) => (
                <li key={i}>{inline(line.replace(/^\s*[-*•] /, ""))}</li>
              ))}
            </ul>
          );
        return (
          <p key={index} className="whitespace-pre-wrap">
            {inline(block)}
          </p>
        );
      })}
    </div>
  );
}

function StageChangeCard({
  action,
  agencyId,
}: {
  action: StageChangeProposal;
  agencyId: string;
}) {
  const [reason, setReason] = useState(action.reason);
  const [state, setState] = useState<"idle" | "saving" | "done" | "dismissed">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  if (state === "dismissed") return null;

  async function confirm() {
    if (action.reasonRequired && reason.trim().length < 5) {
      setError("Add a reason of at least 5 characters.");
      return;
    }
    setState("saving");
    setError(null);
    try {
      const response = await fetch(
        `/api/v1/applications/${action.applicationId}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            "x-agency-id": agencyId,
          },
          body: JSON.stringify({
            action: "transition",
            status: action.to,
            reason: reason.trim(),
            expectedUpdatedAt: action.expectedUpdatedAt,
          }),
        },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "The stage couldn't be changed.",
        );
      setState("done");
    } catch (cause) {
      setState("idle");
      setError(
        cause instanceof Error
          ? cause.message
          : "The stage couldn't be changed.",
      );
    }
  }

  return (
    <div className="mt-3 rounded-[12px] border border-border bg-card p-3.5">
      <p className="text-sm">
        Move <span className="font-semibold">{action.candidateName}</span>{" "}
        <span className="text-muted-foreground">({action.jobTitle})</span> from{" "}
        {stageLabel(action.from)} to{" "}
        <span className="font-semibold">{stageLabel(action.to)}</span>
      </p>
      {state === "done" ? (
        <p role="status" className="mt-2 text-sm text-success">
          Moved to {stageLabel(action.to)}. No email was sent.
        </p>
      ) : (
        <>
          {(action.reasonRequired || reason) && (
            <label className="mt-2.5 block text-xs text-muted-foreground">
              Reason{action.reasonRequired ? " (required)" : ""}
              <textarea
                value={reason}
                rows={2}
                maxLength={2000}
                onChange={(event) => setReason(event.target.value)}
                className="mt-1 w-full resize-none rounded-md border border-input bg-white px-2.5 py-1.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
              />
            </label>
          )}
          {error && (
            <p role="alert" className="mt-2 text-xs text-destructive">
              {error}
            </p>
          )}
          <div className="mt-3 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setState("dismissed")}
            >
              Dismiss
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={state === "saving"}
              onClick={() => void confirm()}
            >
              {state === "saving" ? "Moving…" : "Confirm move"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import {
  AddIcon,
  ArrowUpIcon,
  CloseIcon,
  HistoryIcon,
  SidebarMinimalisticIcon,
} from "@solar-icons/react/linear";
import { StarsMinimalisticIcon } from "@solar-icons/react/bold";
import { Button } from "@/components/ui/button";
import {
  assistantSuggestions,
  assistantTurnSchema,
  type ConversationSummary,
  type StageChangeProposal,
  type StoredMessage,
} from "@/lib/assistant";
import { cn } from "cn";
import { ChatHistory } from "./chat-history";
import { Trace } from "./trace";

const stageLabel = (value: string) =>
  value.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());

/**
 * Whether the chat list is open, remembered per device. Collapsed by default
 * so the conversation keeps the room next to the main sidebar.
 */
const PANEL_KEY = "recruta:bot-history-open";
const panelListeners = new Set<() => void>();
const panelStore = {
  subscribe(listener: () => void) {
    panelListeners.add(listener);
    return () => {
      panelListeners.delete(listener);
    };
  },
  read() {
    try {
      return window.localStorage.getItem(PANEL_KEY) === "1";
    } catch {
      return false;
    }
  },
  write(open: boolean) {
    try {
      window.localStorage.setItem(PANEL_KEY, open ? "1" : "0");
    } catch {}
    panelListeners.forEach((listener) => listener());
  },
};

type Conversation = { id: string; title: string; messages: StoredMessage[] };

export function RecrutaBot({
  agencyId,
  firstName,
  chatStatus,
  work,
  conversations: initialConversations,
  initialConversation,
  now,
}: {
  agencyId: string;
  firstName: string;
  /** Why chat is unavailable, or null when it can be used. */
  chatStatus: string | null;
  work: React.ReactNode;
  conversations: ConversationSummary[];
  initialConversation: Conversation | null;
  /** Server time, for grouping history without reading the clock in render. */
  now: number;
}) {
  const [tab, setTab] = useState<"chat" | "work">("chat");
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(
    initialConversation?.id ?? null,
  );
  const [turns, setTurns] = useState<StoredMessage[]>(
    initialConversation?.messages ?? [],
  );
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const panelOpen = useSyncExternalStore(
    panelStore.subscribe,
    panelStore.read,
    () => false,
  );
  const endRef = useRef<HTMLDivElement>(null);
  const disabled = !!chatStatus;
  const headers = {
    "content-type": "application/json",
    "x-agency-id": agencyId,
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, pending]);

  function showUrl(id: string | null) {
    window.history.replaceState(null, "", id ? `/app/bot?c=${id}` : "/app/bot");
  }

  function startNew() {
    setActiveId(null);
    setTurns([]);
    setError(null);
    setHistoryOpen(false);
    showUrl(null);
  }

  async function openConversation(id: string) {
    if (id === activeId || loading) {
      setHistoryOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    setHistoryOpen(false);
    try {
      const response = await fetch(`/api/v1/assistant/conversations/${id}`, {
        headers,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "This chat couldn't be opened.");
      setActiveId(id);
      setTurns(body.data.messages as StoredMessage[]);
      showUrl(id);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "This chat couldn't be opened.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function renameConversation(id: string, title: string) {
    const response = await fetch(`/api/v1/assistant/conversations/${id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ title }),
    }).catch(() => null);
    if (!response?.ok) {
      setError("The chat wasn't renamed. Try again.");
      return false;
    }
    setConversations((list) =>
      list.map((item) => (item.id === id ? { ...item, title } : item)),
    );
    return true;
  }

  async function deleteConversation(id: string) {
    const response = await fetch(`/api/v1/assistant/conversations/${id}`, {
      method: "DELETE",
      headers,
    }).catch(() => null);
    if (!response?.ok) {
      setError("The chat wasn't deleted. Try again.");
      return false;
    }
    setConversations((list) => list.filter((item) => item.id !== id));
    if (id === activeId) startNew();
    return true;
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || pending || disabled) return;
    const messageId = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      {
        id: messageId,
        role: "user",
        content,
        actions: [],
        links: [],
        trace: [],
        ms: 0,
      },
    ]);
    setDraft("");
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/v1/assistant", {
        method: "POST",
        headers,
        body: JSON.stringify({
          conversationId: activeId ?? undefined,
          messageId,
          message: content,
        }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message ?? "Recruta couldn't answer that.");
      const turn = assistantTurnSchema.parse(body.data);
      setTurns((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: turn.reply,
          actions: turn.actions,
          links: turn.links,
          trace: turn.trace,
          ms: turn.ms,
        },
      ]);
      if (!activeId) showUrl(turn.conversationId);
      setActiveId(turn.conversationId);
      setConversations((list) => [
        {
          id: turn.conversationId,
          title: turn.title,
          updated_at: new Date().toISOString(),
        },
        ...list.filter((item) => item.id !== turn.conversationId),
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

  const history = (
    <ChatHistory
      conversations={conversations}
      activeId={activeId}
      now={now}
      onSelect={(id) => void openConversation(id)}
      onNew={startNew}
      onRename={renameConversation}
      onDelete={deleteConversation}
    />
  );

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative flex items-center justify-center">
        {tab === "chat" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Chat history"
            title="Chat history"
            aria-expanded={historyOpen}
            className="absolute left-0 lg:hidden"
            onClick={() => setHistoryOpen(true)}
          >
            <HistoryIcon aria-hidden="true" />
          </Button>
        )}
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
      </div>

      {tab === "work" ? (
        <div id="bot-work" role="tabpanel" className="mt-8">
          {work}
        </div>
      ) : (
        <div
          id="bot-chat"
          role="tabpanel"
          className={cn(
            "mt-4 flex flex-1 gap-6 lg:grid",
            panelOpen
              ? "lg:grid-cols-[232px_minmax(0,1fr)]"
              : "lg:grid-cols-[44px_minmax(0,1fr)]",
          )}
        >
          {panelOpen ? (
            <aside
              aria-label="Chats"
              className="sticky top-20 hidden h-[calc(100dvh-10rem)] flex-col rounded-[10px] bg-[#F8F8F8] p-3 lg:flex"
            >
              <div className="mb-2 flex items-center justify-between pl-1">
                <h2 className="text-[13px] font-semibold">Chats</h2>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Hide chats"
                  title="Hide chats"
                  aria-expanded
                  onClick={() => panelStore.write(false)}
                >
                  <SidebarMinimalisticIcon aria-hidden="true" />
                </Button>
              </div>
              {history}
            </aside>
          ) : (
            <aside
              aria-label="Chats"
              className="sticky top-20 hidden h-fit flex-col items-center gap-1 rounded-[10px] bg-[#F8F8F8] p-1.5 lg:flex"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Show chats"
                title="Show chats"
                aria-expanded={false}
                onClick={() => panelStore.write(true)}
              >
                <SidebarMinimalisticIcon aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="New chat"
                title="New chat"
                onClick={startNew}
              >
                <AddIcon aria-hidden="true" />
              </Button>
            </aside>
          )}

          {historyOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <button
                type="button"
                aria-label="Close chat history"
                className="absolute inset-0 bg-[#111111]/25 backdrop-blur-[2px]"
                onClick={() => setHistoryOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Chat history"
                className="relative flex w-[min(320px,86vw)] flex-col bg-[#F8F8F8] p-4 shadow-2xl"
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-semibold">Chats</h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Close"
                    onClick={() => setHistoryOpen(false)}
                  >
                    <CloseIcon aria-hidden="true" />
                  </Button>
                </div>
                {history}
              </div>
            </div>
          )}

          <div className="flex min-w-0 flex-1 flex-col">
            {loading ? (
              <p
                role="status"
                className="mx-auto my-auto text-sm text-muted-foreground"
              >
                Opening chat…
              </p>
            ) : turns.length === 0 ? (
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
                <h2 className="text-center text-[28px] font-semibold tracking-[-0.03em]">
                  How can I help, {firstName}?
                </h2>
                <div className="mt-7">{composer}</div>
                {error && (
                  <p
                    role="alert"
                    className="mt-3 text-center text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
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
                  className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 py-6"
                >
                  {turns.map((turn) =>
                    turn.role === "user" ? (
                      <li key={turn.id} className="flex justify-end">
                        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[#F1F1F3] px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">
                          {turn.content}
                        </p>
                      </li>
                    ) : (
                      <li key={turn.id} className="flex gap-3">
                        <span
                          aria-hidden="true"
                          className="grid size-7 shrink-0 place-items-center rounded-full bg-[#5C5AED] text-white"
                        >
                          <StarsMinimalisticIcon size={14} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <Trace steps={turn.trace} ms={turn.ms} />
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
                <div className="sticky bottom-20 mx-auto w-full max-w-2xl bg-white pb-4 lg:bottom-0">
                  {composer}
                  <p className="mt-2 text-center text-[11px] text-muted-foreground">
                    Recruta can be wrong. It never changes anything without your
                    confirmation.
                  </p>
                </div>
              </>
            )}
          </div>
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

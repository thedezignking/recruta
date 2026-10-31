"use client";
import { useMemo, useRef, useState } from "react";
import { AddIcon } from "@solar-icons/react/linear/add";
import { MagnifierIcon } from "@solar-icons/react/linear/magnifier";
import { PenIcon } from "@solar-icons/react/linear/pen";
import { QuestionCircleIcon } from "@solar-icons/react/linear/question-circle";
import { ShieldCheckIcon } from "@solar-icons/react/linear/shield-check";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { libraryMutationSchema, type LibraryQuestion } from "@/lib/job-content";
import { cn } from "cn";

const blank = {
  label: "",
  helpText: "",
  questionType: "long_text" as LibraryQuestion["questionType"],
  options: [] as string[],
  isRequired: false,
  category: "General",
  archived: false,
  version: 0,
  id: "",
};

const typeLabels: Record<LibraryQuestion["questionType"], string> = {
  short_text: "Short text",
  long_text: "Long text",
  yes_no: "Yes or no",
  single_select: "Choose one",
};

const starters: Partial<LibraryQuestion>[] = [
  {
    label: "When could you start?",
    helpText: "An approximate date or notice period is fine.",
    category: "Availability",
    questionType: "short_text",
  },
  {
    label: "Where would you be working from?",
    helpText: "City or region only; do not provide your home address.",
    category: "Work location",
    questionType: "short_text",
  },
  {
    label: "Are you legally permitted to work in this location?",
    helpText: "",
    category: "Eligibility",
    questionType: "yes_no",
  },
];

const selectClass =
  "h-9 w-full rounded-md border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30";

export function QuestionLibrary({
  agencyId,
  initial,
}: {
  agencyId: string;
  initial: LibraryQuestion[];
}) {
  const [items, setItems] = useState(initial),
    [editing, setEditing] = useState<LibraryQuestion | null>(null),
    [options, setOptions] = useState(""),
    [q, setQ] = useState(""),
    [category, setCategory] = useState<string | null>(null),
    [showArchived, setShowArchived] = useState(false),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [status, setStatus] = useState("");
  const receipt = useRef<{ body: string; key: string } | null>(null);
  const categories = useMemo(
    () =>
      [...new Set(items.filter((i) => !i.archived).map((i) => i.category))]
        .filter(Boolean)
        .sort(),
    [items],
  );
  const archivedCount = items.filter((i) => i.archived).length;
  const visible = items.filter(
    (i) =>
      (showArchived || !i.archived) &&
      (!category || i.category === category) &&
      `${i.label} ${i.category}`.toLowerCase().includes(q.toLowerCase()),
  );
  function edit(item: LibraryQuestion) {
    setEditing({ ...item });
    setOptions(item.options.join("\n"));
    setError("");
    setStatus("");
  }
  async function save(item: LibraryQuestion) {
    const input = {
      id: item.id,
      expectedVersion: item.version,
      category: item.category,
      archived: item.archived,
      question: {
        label: item.label,
        helpText: item.helpText,
        questionType: item.questionType,
        isRequired: item.isRequired,
        options:
          item.questionType === "single_select"
            ? options
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
      },
    };
    const parsed = libraryMutationSchema.safeParse(input);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => i.message).join(" "));
      return;
    }
    const body = JSON.stringify(parsed.data);
    if (receipt.current?.body !== body)
      receipt.current = { body, key: crypto.randomUUID() };
    setPending(true);
    setError("");
    try {
      const r = await fetch("/api/v1/screening-question-library", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
          "x-idempotency-key": receipt.current.key,
        },
        body,
      });
      const result = await r.json();
      if (!r.ok)
        throw new Error(
          result.error?.message ?? "Question could not be saved.",
        );
      const row = result.data;
      const saved = {
        ...item,
        version: row.version,
        options: parsed.data.question.options,
      };
      setItems((current) => [
        saved,
        ...current.filter((i) => i.id !== saved.id),
      ]);
      setEditing(null);
      receipt.current = null;
      setStatus(
        item.archived
          ? "Question archived. Saved job questions are unchanged."
          : "Question saved. Saved job questions are unchanged.",
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not reach the server. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  const editor = editing && (
    <form
      className="border-b border-border bg-[#FBFBFB] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save(editing);
      }}
    >
      <fieldset disabled={pending}>
        <legend className="mb-3 text-[13px] font-semibold">
          {editing.version ? "Edit question" : "New question"}
        </legend>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="library-question-label">Question</FieldLabel>
            <Input
              id="library-question-label"
              value={editing.label}
              maxLength={240}
              autoFocus
              required
              onChange={(e) =>
                setEditing({ ...editing, label: e.target.value })
              }
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="library-question-category">
                Category
              </FieldLabel>
              <Input
                id="library-question-category"
                value={editing.category}
                maxLength={80}
                list="library-categories"
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              />
              <datalist id="library-categories">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field>
              <FieldLabel htmlFor="library-question-type">
                Answer type
              </FieldLabel>
              <select
                id="library-question-type"
                className={selectClass}
                value={editing.questionType}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    questionType: e.target
                      .value as LibraryQuestion["questionType"],
                  })
                }
              >
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {editing.questionType === "single_select" && (
            <Field>
              <FieldLabel htmlFor="library-question-options">
                Options
              </FieldLabel>
              <Textarea
                id="library-question-options"
                rows={3}
                value={options}
                onChange={(e) => setOptions(e.target.value)}
              />
              <FieldDescription>One per line, at least two.</FieldDescription>
            </Field>
          )}
          <Field>
            <FieldLabel htmlFor="library-question-help">Help text</FieldLabel>
            <Textarea
              id="library-question-help"
              rows={2}
              value={editing.helpText}
              maxLength={500}
              onChange={(e) =>
                setEditing({ ...editing, helpText: e.target.value })
              }
            />
          </Field>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={editing.isRequired}
                onChange={(e) =>
                  setEditing({ ...editing, isRequired: e.target.checked })
                }
              />
              Required answer
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={editing.archived}
                onChange={(e) =>
                  setEditing({ ...editing, archived: e.target.checked })
                }
              />
              Archived · unavailable for new jobs
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {pending ? "Saving…" : "Save question"}
            </Button>
          </div>
        </FieldGroup>
      </fieldset>
    </form>
  );

  return (
    <section
      id="question-bank"
      aria-labelledby="question-bank-heading"
      className="scroll-mt-20 overflow-hidden rounded-[10px] border border-border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2
              id="question-bank-heading"
              className="text-[13px] font-semibold"
            >
              Question bank
            </h2>
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {items.length - archivedCount}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Reusable screening questions. Editing never changes existing jobs or
            applications.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => edit({ ...blank, id: crypto.randomUUID() })}
        >
          <AddIcon data-icon="inline-start" aria-hidden="true" />
          Add question
        </Button>
      </div>

      <div className="flex items-start gap-2.5 border-b border-border bg-[#FBFBFB] px-4 py-2.5 text-xs text-muted-foreground">
        <ShieldCheckIcon
          aria-hidden="true"
          size={15}
          className="mt-px shrink-0"
        />
        <p>
          Avoid protected characteristics, salary history and unnecessary
          sensitive information. A few useful questions beat a long mandatory
          form.
        </p>
      </div>

      {editing && !editing.version && editor}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
          <div className="relative w-full sm:w-56">
            <label className="sr-only" htmlFor="manage-library-search">
              Search question bank
            </label>
            <MagnifierIcon
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted-foreground"
            />
            <input
              id="manage-library-search"
              value={q}
              placeholder="Search questions"
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-full rounded-md border border-border bg-[#F8F8F8] pr-2 pl-8 text-xs outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div
            role="group"
            aria-label="Filter by category"
            className="flex flex-wrap gap-1"
          >
            {[null, ...categories].map((c) => (
              <button
                key={c ?? "all"}
                type="button"
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
                className={cn(
                  "h-7 rounded-md px-2.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  category === c
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {c ?? "All"}
              </button>
            ))}
          </div>
          {archivedCount > 0 && (
            <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Show archived ({archivedCount})
            </label>
          )}
        </div>
      )}

      {items.length === 0 && !editing ? (
        <div className="px-4 py-8">
          <div className="mx-auto max-w-md text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-[10px] bg-[#F8F8F8] text-muted-foreground ring-1 ring-border">
              <QuestionCircleIcon aria-hidden="true" size={20} />
            </span>
            <p className="mt-3 text-sm font-medium">No saved questions</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start from a suggestion or add a question your team can reuse.
            </p>
          </div>
          <ul className="mx-auto mt-5 grid max-w-2xl gap-2 sm:grid-cols-3">
            {starters.map((starter) => (
              <li key={starter.label}>
                <button
                  type="button"
                  onClick={() =>
                    edit({ ...blank, ...starter, id: crypto.randomUUID() })
                  }
                  className="h-full w-full rounded-[10px] border border-border p-3 text-left outline-none hover:border-primary/30 hover:bg-[#F8F9FC] focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="block text-[11px] text-muted-foreground">
                    {starter.category}
                  </span>
                  <span className="mt-1 block text-xs font-medium">
                    {starter.label}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.length > 0 && visible.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              No matching questions.
            </li>
          )}
          {visible.map((i) =>
            editing?.id === i.id && editing.version ? (
              <li key={i.id}>{editor}</li>
            ) : (
              <li
                key={i.id}
                className={cn(
                  "flex items-start justify-between gap-3 px-4 py-3",
                  i.archived && "bg-[#FBFBFB]",
                )}
              >
                <div className="min-w-0">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      i.archived && "text-muted-foreground",
                    )}
                  >
                    {i.label}
                  </p>
                  {i.helpText && (
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {i.helpText}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-md bg-[#EDECFD] px-1.5 py-0.5 font-medium text-[#4846B8]">
                      {i.category}
                    </span>
                    <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                      {typeLabels[i.questionType]}
                    </span>
                    {i.isRequired && (
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                        Required
                      </span>
                    )}
                    {i.archived && (
                      <span className="rounded-md border border-border px-1.5 py-0.5 text-muted-foreground">
                        Archived
                      </span>
                    )}
                    <span className="font-mono text-muted-foreground">
                      v{i.version}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() => edit(i)}
                  aria-label={`Edit ${i.label}`}
                >
                  <PenIcon data-icon="inline-start" aria-hidden="true" />
                  Edit
                </Button>
              </li>
            ),
          )}
        </ul>
      )}
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-destructive/5 px-4 py-2.5 text-sm text-destructive"
        >
          {error}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload library
          </Button>
        </div>
      )}
      <p
        role="status"
        className={cn(
          "px-4 text-xs text-success",
          status && "border-t border-border py-2.5",
        )}
      >
        {status}
      </p>
    </section>
  );
}

"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { libraryMutationSchema, type LibraryQuestion } from "@/lib/job-content";
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
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [status, setStatus] = useState("");
  const receipt = useRef<{ body: string; key: string } | null>(null);
  function edit(item: LibraryQuestion) {
    setEditing({ ...item });
    setOptions(item.options.join("\n"));
    setError("");
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
  return (
    <section
      className="mt-5 rounded-[10px] border bg-white p-4"
      aria-label="Agency screening question library"
    >
      <h2 className="font-semibold">Screening question library</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Reusable job-relevant questions. Recruiters copy these into jobs;
        editing or archiving never changes existing applications.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        Avoid protected characteristics, salary history and unnecessary
        sensitive information. Prefer a few useful questions over a long
        mandatory form.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="manage-library-search">
          Search library
        </label>
        <Input
          id="manage-library-search"
          className="max-w-xs"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => edit({ ...blank, id: crypto.randomUUID() })}
        >
          Add question
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {items.length > 0 &&
          !items.some((i) =>
            `${i.label} ${i.category}`.toLowerCase().includes(q.toLowerCase()),
          ) && (
            <li className="text-sm text-muted-foreground">
              No matching questions.
            </li>
          )}
        {!items.length && (
          <li className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                edit({
                  ...blank,
                  id: crypto.randomUUID(),
                  label: "When could you start?",
                  helpText: "An approximate date or notice period is fine.",
                  category: "Availability",
                  questionType: "short_text",
                })
              }
            >
              Start with availability
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                edit({
                  ...blank,
                  id: crypto.randomUUID(),
                  label: "Where would you be working from?",
                  helpText:
                    "City or region only; do not provide your home address.",
                  category: "Work location",
                  questionType: "short_text",
                })
              }
            >
              Start with work location
            </Button>
          </li>
        )}
        {items
          .filter((i) =>
            `${i.label} ${i.category}`.toLowerCase().includes(q.toLowerCase()),
          )
          .map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-3 border-b py-2"
            >
              <span className="text-sm">
                {i.label}
                <span className="block text-xs text-muted-foreground">
                  {i.category} · v{i.version}
                  {i.archived ? " · Archived" : ""}
                </span>
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => edit(i)}
              >
                Edit
              </Button>
            </li>
          ))}
      </ul>
      {!items.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          No saved questions. Add a question your team can reuse.
        </p>
      )}
      {editing && (
        <form
          className="mt-4 grid gap-3 rounded-md border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save(editing);
          }}
        >
          <fieldset disabled={pending} className="grid gap-3">
            <legend className="mb-3 text-sm font-medium">
              {editing.version ? "Edit question" : "New question"}
            </legend>
            <label className="text-sm">
              Question
              <Input
                value={editing.label}
                maxLength={240}
                onChange={(e) =>
                  setEditing({ ...editing, label: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              Category
              <Input
                value={editing.category}
                maxLength={80}
                onChange={(e) =>
                  setEditing({ ...editing, category: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              Help text
              <Textarea
                value={editing.helpText}
                maxLength={500}
                onChange={(e) =>
                  setEditing({ ...editing, helpText: e.target.value })
                }
              />
            </label>
            <label className="text-sm">
              Answer type
              <select
                className="ml-3 rounded-md border bg-white p-2"
                value={editing.questionType}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    questionType: e.target
                      .value as LibraryQuestion["questionType"],
                  })
                }
              >
                <option value="short_text">Short text</option>
                <option value="long_text">Long text</option>
                <option value="yes_no">Yes or no</option>
                <option value="single_select">Choose one</option>
              </select>
            </label>
            {editing.questionType === "single_select" && (
              <label className="text-sm">
                Options · one per line, at least two
                <Textarea
                  value={options}
                  onChange={(e) => setOptions(e.target.value)}
                />
              </label>
            )}
            <label className="text-sm">
              <input
                type="checkbox"
                checked={editing.isRequired}
                onChange={(e) =>
                  setEditing({ ...editing, isRequired: e.target.checked })
                }
              />{" "}
              Required answer
            </label>
            <label className="text-sm">
              <input
                type="checkbox"
                checked={editing.archived}
                onChange={(e) =>
                  setEditing({ ...editing, archived: e.target.checked })
                }
              />{" "}
              Archived · unavailable for new jobs
            </label>
            <div className="flex gap-3">
              <Button type="submit">
                {pending ? "Saving…" : "Save question"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditing(null)}
              >
                Cancel
              </Button>
            </div>
          </fieldset>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}{" "}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload library
          </Button>
        </p>
      )}
      <p role="status" className="mt-3 text-sm">
        {status}
      </p>
    </section>
  );
}

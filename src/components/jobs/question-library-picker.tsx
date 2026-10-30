"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { LibraryQuestion } from "@/lib/job-content";
export function QuestionLibraryPicker({
  agencyId,
  disabled,
  onUse,
}: {
  agencyId: string;
  disabled: boolean;
  onUse: (
    q: Pick<
      LibraryQuestion,
      "label" | "helpText" | "questionType" | "options" | "isRequired"
    >,
  ) => void;
}) {
  const [items, setItems] = useState<LibraryQuestion[]>([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [retry, setRetry] = useState(0);
  const [added, setAdded] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    fetch("/api/v1/screening-question-library", {
      headers: { "x-agency-id": agencyId },
      signal: abort.signal,
    })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok)
          throw new Error(
            "Library unavailable. You can still add questions manually.",
          );
        setItems(result.data ?? []);
        setError("");
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(e.message);
      });
    return () => abort.abort();
  }, [agencyId, retry]);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="mb-4 rounded-md border p-3"
    >
      <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
        Add from agency question library
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs text-muted-foreground">
          Questions are copied into this job. Later library edits do not change
          saved job questions.
        </p>
        <label className="block text-xs" htmlFor="library-search">
          Search questions or categories
        </label>
        <Input
          id="library-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {error ? (
          <p role="status" className="text-sm">
            {error}{" "}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetry((n) => n + 1)}
            >
              Retry
            </Button>
          </p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No saved agency questions. Managers can add them in Settings.
          </p>
        ) : (
          <ul className="max-h-60 space-y-2 overflow-y-auto">
            {items
              .filter((i) =>
                `${i.label} ${i.category}`
                  .toLowerCase()
                  .includes(q.toLowerCase()),
              )
              .map((i) => (
                <li
                  key={i.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-2"
                >
                  <span className="text-sm">
                    {i.label}
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {i.category}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => {
                      onUse({
                        label: i.label,
                        helpText: i.helpText,
                        questionType: i.questionType,
                        options: [...i.options],
                        isRequired: i.isRequired,
                      });
                      setAdded(i.label);
                    }}
                  >
                    Use question
                  </Button>
                </li>
              ))}
          </ul>
        )}
        <p role="status" className="text-xs">
          {items.length > 0 &&
          !items.some((i) =>
            `${i.label} ${i.category}`.toLowerCase().includes(q.toLowerCase()),
          )
            ? "No matching questions. "
            : ""}
          {added ? `Added: ${added}` : ""}
        </p>
      </div>
    </details>
  );
}

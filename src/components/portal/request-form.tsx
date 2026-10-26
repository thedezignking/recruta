"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
type Draft = {
  id: string;
  updated_at: string;
  title: string;
  description: string;
  positions_required: number;
  location: string | null;
  work_arrangement: string | null;
  department?: string | null;
  employment_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  currency?: string | null;
  target_hire_date?: string | null;
  additional_instructions?: string | null;
  hiring_request_requirements: {
    label: string;
    requirement_type: string;
    description?: string | null;
  }[];
};
export function PortalRequestForm({
  clientId,
  draft,
}: {
  clientId: string;
  draft?: Draft;
}) {
  const router = useRouter();
  const key = useRef<string | null>(null);
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy.current) return;
        busy.current = true;
        setPending(true);
        setError("");
        const d = new FormData(e.currentTarget);
        key.current ??= crypto.randomUUID();
        try {
          const r = await fetch(
            draft
              ? `/api/v1/portal/requests/${draft.id}`
              : "/api/v1/portal/requests",
            {
              method: draft ? "PATCH" : "POST",
              headers: {
                "content-type": "application/json",
                "x-client-id": clientId,
              },
              body: JSON.stringify({
                requestId: draft?.id ?? key.current,
                expectedUpdatedAt: draft?.updated_at,
                clientId,
                title: d.get("title"),
                description: d.get("description"),
                positionsRequired: d.get("positionsRequired"),
                location: d.get("location"),
                workArrangement: d.get("workArrangement"),
                department: draft?.department ?? undefined,
                employmentType: draft?.employment_type ?? undefined,
                salaryMin: draft?.salary_min ?? undefined,
                salaryMax: draft?.salary_max ?? undefined,
                currency: draft?.currency ?? undefined,
                targetHireDate: draft?.target_hire_date ?? undefined,
                additionalInstructions:
                  draft?.additional_instructions ?? undefined,
                requirements: String(d.get("requirements") ?? "")
                  .split("\n")
                  .map((x) => x.trim())
                  .filter(Boolean)
                  .map((label) => {
                    const previous = draft?.hiring_request_requirements.find(
                      (r) => r.label === label,
                    );
                    return {
                      type: previous?.requirement_type ?? "required",
                      label,
                      description: previous?.description ?? undefined,
                    };
                  }),
              }),
            },
          );
          const b = await r.json();
          if (!r.ok)
            throw new Error(
              b.error?.message ?? "The draft could not be saved.",
            );
          router.push(`/portal/requests/${b.data.id}`);
          router.refresh();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setPending(false);
          busy.current = false;
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="request-title">Job title</FieldLabel>
          <Input
            id="request-title"
            name="title"
            required
            minLength={2}
            maxLength={160}
            defaultValue={draft?.title}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="request-description">
            Role description
          </FieldLabel>
          <Textarea
            id="request-description"
            name="description"
            required
            minLength={20}
            maxLength={10000}
            defaultValue={draft?.description}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="request-positions">Openings</FieldLabel>
            <Input
              id="request-positions"
              name="positionsRequired"
              type="number"
              min={1}
              max={1000}
              required
              defaultValue={draft?.positions_required ?? 1}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="request-location">Location</FieldLabel>
            <Input
              id="request-location"
              name="location"
              maxLength={160}
              defaultValue={draft?.location ?? ""}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="request-arrangement">
            Work arrangement
          </FieldLabel>
          <select
            id="request-arrangement"
            name="workArrangement"
            className="h-9 rounded-lg border bg-card px-3 text-sm"
            defaultValue={draft?.work_arrangement ?? "on_site"}
          >
            <option value="on_site">On site</option>
            <option value="hybrid">Hybrid</option>
            <option value="remote">Remote</option>
          </select>
        </Field>
        <Field>
          <FieldLabel htmlFor="request-requirements">Requirements</FieldLabel>
          <Textarea
            id="request-requirements"
            name="requirements"
            placeholder="One requirement per line"
            defaultValue={draft?.hiring_request_requirements
              .map((r) => r.label)
              .join("\n")}
          />
        </Field>
        {error && <FieldError role="alert">{error}</FieldError>}
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
      </FieldGroup>
    </form>
  );
}

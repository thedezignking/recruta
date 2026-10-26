"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MagnifierIcon } from "@solar-icons/react/linear";
import {
  applicationStatuses,
  type ApplicationFilters,
} from "@/lib/applicant-operations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { JobFilter } from "./job-filter";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FilterSelect({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Field className="w-full sm:w-auto">
      <FieldLabel className="sr-only">{label}</FieldLabel>
      <Select
        value={value}
        items={items}
        onValueChange={(next) => onChange(next ?? "all")}
      >
        <SelectTrigger aria-label={label} className="w-full sm:min-w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  );
}
export function InboxFilters({
  filters,
  jobs,
  agencyId,
}: {
  filters: ApplicationFilters;
  jobs: { id: string; title: string }[];
  agencyId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(filters.q ?? "");
  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...filters, q, ...changes })) {
      if (value && value !== "all" && key !== "cursor") next.set(key, value);
    }
    startTransition(() =>
      router.push(`/app/applications${next.size ? `?${next}` : ""}`),
    );
  }
  return (
    <form
      aria-label="Filter applications"
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        navigate({ q });
      }}
    >
      <FieldGroup className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Field className="min-w-0 flex-1 sm:min-w-56">
          <FieldLabel htmlFor="application-search" className="sr-only">
            Search applications
          </FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MagnifierIcon aria-hidden="true" />
            </InputGroupAddon>
            <InputGroupInput
              id="application-search"
              value={q}
              maxLength={100}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search candidates, roles, organizations…"
            />
          </InputGroup>
        </Field>
        <JobFilter
          agencyId={agencyId}
          value={filters.jobId}
          label={jobs.find((j) => j.id === filters.jobId)?.title}
          onChange={(value) => navigate({ jobId: value })}
        />
        <FilterSelect
          label="Application stage"
          value={filters.status ?? "all"}
          onChange={(value) => navigate({ status: value })}
          items={[
            { value: "all", label: "All stages" },
            ...applicationStatuses.map((status) => ({
              value: status,
              label: status
                .replaceAll("_", " ")
                .replace(/^./, (char) => char.toUpperCase()),
            })),
          ]}
        />
        <FilterSelect
          label="Ownership"
          value={filters.owner ?? "all"}
          onChange={(value) => navigate({ owner: value })}
          items={[
            { value: "all", label: "Everyone" },
            { value: "mine", label: "Assigned to me" },
            { value: "unassigned", label: "Unassigned" },
          ]}
        />
        <Field className="w-full sm:w-auto">
          <FieldLabel htmlFor="intake-from" className="sr-only">
            Received from
          </FieldLabel>
          <Input
            id="intake-from"
            type="date"
            aria-label="Received from"
            value={filters.submittedFrom ?? ""}
            onChange={(e) => navigate({ submittedFrom: e.target.value })}
          />
        </Field>
        <Field className="w-full sm:w-auto">
          <FieldLabel htmlFor="intake-to" className="sr-only">
            Received through
          </FieldLabel>
          <Input
            id="intake-to"
            type="date"
            aria-label="Received through"
            value={filters.submittedTo ?? ""}
            onChange={(e) => navigate({ submittedTo: e.target.value })}
          />
        </Field>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Searching…" : "Search"}
        </Button>
        {Object.values(filters).some(Boolean) && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setQ("");
              startTransition(() => router.push("/app/applications"));
            }}
          >
            Clear
          </Button>
        )}
      </FieldGroup>
    </form>
  );
}

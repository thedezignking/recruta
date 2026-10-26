"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { AddIcon, Buildings2Icon } from "@solar-icons/react/linear";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  companyDomain,
  organizationDetailsSchema,
  type OrganizationDetails,
  type OrganizationOption,
} from "@/lib/organization";

type Suggestion = {
  key: string;
  kind: "saved" | "external" | "manual";
  name: string;
  domain?: string;
  icon?: string;
  organization?: OrganizationOption;
};
const suggestionsSchema = z.array(
  z.object({
    name: z.string(),
    domain: z.string(),
    icon: z.string().url().optional(),
  }),
);

export function CompanyPicker({
  agencyId,
  lookupClientId,
  onSelect,
  onManual,
  initialOrganizations = [],
  error,
}: {
  agencyId: string;
  lookupClientId?: string;
  onSelect: (details: OrganizationDetails, existingId?: string) => void;
  onManual: (name: string) => void;
  initialOrganizations?: OrganizationOption[];
  error?: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{
    query: string;
    items: Suggestion[];
    message?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selecting = useRef(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const saved: Suggestion[] = [];
      const external: Suggestion[] = [];
      const messages: string[] = [];
      await Promise.all([
        (async () => {
          try {
            const response = await fetch(
              `/api/v1/clients/search?q=${encodeURIComponent(query.trim())}`,
              {
                headers: { "x-agency-id": agencyId },
                signal: controller.signal,
                cache: "no-store",
              },
            );
            const body = await response.json();
            if (!response.ok) throw new Error("saved_search_failed");
            for (const item of body.data.items) {
              const details = organizationDetailsSchema.parse({
                ...Object.fromEntries(
                  Object.entries(item).filter(([, value]) => value !== null),
                ),
                companyProfile: item.company_profile ?? {},
              });
              saved.push({
                key: item.id,
                kind: "saved",
                name: details.name,
                domain: companyDomain(details.website),
                organization: { ...details, id: item.id },
              });
            }
            if (!controller.signal.aborted && lookupClientId)
              setResult({
                query,
                items: [...saved],
                message: "Searching company suggestions…",
              });
          } catch {
            messages.push(
              "Saved organizations could not be searched. Try again before creating a duplicate.",
            );
          }
        })(),
        (async () => {
          if (!lookupClientId) return;
          try {
            const response = await fetch(
              `https://api.brandfetch.io/v2/search/${encodeURIComponent(query.trim())}?c=${encodeURIComponent(lookupClientId)}`,
              {
                signal: controller.signal,
                cache: "no-store",
                credentials: "omit",
                referrerPolicy: "no-referrer",
              },
            );
            if (!response.ok) throw new Error("provider_unavailable");
            for (const item of suggestionsSchema
              .parse(await response.json())
              .slice(0, 5))
              external.push({
                key: `external:${item.domain}`,
                kind: "external",
                ...item,
              });
          } catch {
            messages.push(
              "Company suggestions are unavailable. You can enter details manually.",
            );
          }
        })(),
      ]);
      if (!controller.signal.aborted)
        setResult({
          query,
          items: [
            ...saved,
            ...external.filter(
              (item) => !saved.some((local) => local.domain === item.domain),
            ),
          ],
          message:
            messages.join(" ") ||
            (!saved.length && !external.length
              ? "No matches. Enter this organization manually."
              : undefined),
        });
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, agencyId, lookupClientId]);
  const current = result?.query === query ? result : null;
  const choices: Suggestion[] =
    query.trim().length < 2
      ? initialOrganizations.map((item) => ({
          key: item.id,
          kind: "saved",
          name: item.name,
          organization: item,
        }))
      : (current?.items ?? []);
  const items: Suggestion[] = [
    ...choices,
    {
      key: "manual",
      kind: "manual",
      name: query.trim()
        ? `Enter “${query.trim()}” manually`
        : "Enter organization manually",
    },
  ];
  async function select(item: Suggestion | null) {
    if (!item || selecting.current) return;
    setMessage(null);
    if (item.kind === "manual") {
      onManual(query.trim());
      return;
    }
    if (item.organization) {
      onSelect(item.organization, item.organization.id);
      return;
    }
    selecting.current = true;
    setLoading(true);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      const response = await fetch("/api/v1/companies/lookup", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-agency-id": agencyId,
        },
        body: JSON.stringify({ domain: item.domain }),
        signal: controller.signal,
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(
          body.error?.message ?? "Company details could not be loaded.",
        );
      if (!controller.signal.aborted)
        onSelect(
          organizationDetailsSchema.parse(body.data),
          body.data.existingId,
        );
    } catch (error) {
      if (!controller.signal.aborted)
        setMessage(
          error instanceof Error
            ? error.message
            : "Company lookup failed. Enter details manually.",
        );
    } finally {
      selecting.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>Find an organization</FieldLabel>
      <Combobox.Root<Suggestion>
        items={items}
        filter={null}
        value={null}
        inputValue={query}
        onInputValueChange={(value, details) => {
          if (details.reason !== "item-press") setQuery(value);
        }}
        onValueChange={(item) => void select(item)}
        itemToStringLabel={(item) => item.name}
        disabled={loading}
      >
        <Combobox.Input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-status${error ? ` ${id}-error` : ""}`}
          maxLength={100}
          placeholder="Search by company name or domain…"
          className="h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Combobox.Portal>
          <Combobox.Positioner
            sideOffset={6}
            className="z-50 w-(--anchor-width) max-w-[calc(100vw-2rem)]"
          >
            <Combobox.Popup className="max-h-80 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
              <Combobox.List>
                {(item: Suggestion) => (
                  <Combobox.Item
                    key={item.key}
                    value={item}
                    className="flex cursor-default items-center gap-3 rounded-md px-3 py-3 text-sm outline-none data-highlighted:bg-accent"
                  >
                    {item.kind === "manual" ? (
                      <AddIcon aria-hidden="true" size={20} />
                    ) : (
                      <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border bg-muted">
                        {item.icon ? (
                          <CompanyLogo src={item.icon} />
                        ) : (
                          <Buildings2Icon aria-hidden="true" size={18} />
                        )}
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="block break-words font-medium">
                        {item.name}
                      </span>
                      {item.kind !== "manual" && (
                        <span className="mt-0.5 block break-words text-xs text-muted-foreground">
                          {[
                            item.kind === "saved"
                              ? "In your workspace"
                              : "Company suggestion",
                            item.domain,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      <FieldError id={`${id}-error`}>{error}</FieldError>
      <div
        id={`${id}-status`}
        role="status"
        className="text-xs text-muted-foreground"
      >
        {loading
          ? "Loading company details…"
          : (message ??
            current?.message ??
            (query.trim().length >= 2 && !current
              ? "Searching organizations…"
              : !lookupClientId
                ? "Search saved organizations or enter one manually."
                : "Saved organizations appear first. Review company details before saving."))}
      </div>
      <Button
        type="button"
        variant="link"
        className="self-start px-0"
        onClick={() => {
          request.current?.abort();
          selecting.current = false;
          setLoading(false);
          onManual(query.trim());
        }}
      >
        Enter details manually
      </Button>
      {lookupClientId && (
        <FieldDescription>
          Company-name searches are sent to Brandfetch. Contacts and internal
          notes are not shared.
        </FieldDescription>
      )}
    </Field>
  );
}

export function CompanyLogo({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <Buildings2Icon aria-hidden="true" size={18} />;
  // Provider logos must be hotlinked; no optimizer/proxy or search-image persistence.
  return (
    // eslint-disable-next-line @next/next/no-img-element -- Provider URLs must be hotlinked, not optimized or proxied.
    <img
      src={src}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="size-full object-contain"
    />
  );
}

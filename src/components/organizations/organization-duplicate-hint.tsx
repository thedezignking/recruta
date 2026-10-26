"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { companyDomain } from "@/lib/organization";

export function OrganizationDuplicateHint({
  agencyId,
  name,
  website,
  onUse,
}: {
  agencyId: string;
  name: string;
  website?: string;
  onUse: (organization: { id: string; name: string }) => void;
}) {
  const domain = companyDomain(website);
  const query = domain || name.trim();
  const [result, setResult] = useState<{
    query: string;
    items: { id: string; name: string }[];
  } | null>(null);
  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/v1/clients/search?q=${encodeURIComponent(query)}`,
          {
            headers: { "x-agency-id": agencyId },
            signal: controller.signal,
            cache: "no-store",
          },
        );
        if (!response.ok) return;
        const body = await response.json();
        const items = body.data.items.filter(
          (item: { name: string; website?: string }) =>
            domain
              ? companyDomain(item.website) === domain
              : item.name.trim().toLowerCase() === name.trim().toLowerCase(),
        );
        if (!controller.signal.aborted) setResult({ query, items });
      } catch {
        /* The picker reports search failures; saving still uses transactional duplicate checks. */
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [agencyId, domain, name, query]);
  if (result?.query !== query || !result.items.length) return null;
  return (
    <div role="status" className="rounded-lg border p-4 text-sm">
      <p>
        An organization with this {domain ? "website" : "name"} already exists.
      </p>
      {result.items.map((item) => (
        <Button
          type="button"
          key={item.id}
          variant="link"
          className="h-auto min-h-9 px-0"
          onClick={() => onUse(item)}
        >
          Use {item.name}
        </Button>
      ))}
    </div>
  );
}

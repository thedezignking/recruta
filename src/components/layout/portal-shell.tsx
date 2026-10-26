"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { RecrutaLogo } from "@/components/shared/recruta-mark";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from "@/components/ui/select";
export function PortalShell({
  children,
  clientId,
  clientName,
  agencyName,
  email,
  organizations,
}: {
  children: React.ReactNode;
  clientId: string;
  clientName: string;
  agencyName: string;
  email: string;
  organizations: { id: string; name: string }[];
}) {
  const pathname = usePathname();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function select(id: string) {
    setPending(true);
    setError("");
    try {
      const r = await fetch("/api/v1/portal/context", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ clientId: id }),
      });
      if (!r.ok) throw new Error("Organization access could not be changed.");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Discard previous organization client state on tenant selection.
      window.location.assign("/portal");
    } catch (e) {
      setError((e as Error).message);
      setPending(false);
    }
  }
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/portal" aria-label="Recruta portal">
            <RecrutaLogo size="sm" />
          </Link>
          <div className="flex items-center gap-3">
            <Select
              value={clientId}
              items={organizations.map((o) => ({ value: o.id, label: o.name }))}
              disabled={pending}
              onValueChange={(id) => {
                if (id && id !== clientId) void select(id);
              }}
            >
              <SelectTrigger aria-label="Organization" className="max-w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {organizations.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <form action="/auth/logout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Log out
              </Button>
            </form>
          </div>
          <nav aria-label="Client portal" className="flex w-full gap-5 text-sm">
            {[
              { href: "/portal", label: "Overview" },
              { href: "/portal/jobs", label: "Jobs" },
              { href: "/portal/requests", label: "Requests" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={
                  (
                    item.href === "/portal"
                      ? pathname === item.href
                      : pathname.startsWith(item.href)
                  )
                    ? "page"
                    : undefined
                }
                className="rounded-md py-1 text-muted-foreground aria-[current=page]:font-medium aria-[current=page]:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-6xl px-4 py-7 sm:px-6">
        {error && (
          <p role="alert" className="mb-4 text-sm text-destructive">
            {error}
          </p>
        )}
        {children}
      </main>
      <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
        <span>
          {clientName} · {agencyName}
        </span>
        <span>{email}</span>
      </footer>
    </div>
  );
}

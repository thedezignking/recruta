import Link from "next/link";
import { getPublicEnv } from "@/lib/env";
import { workspaceLogoSrc } from "@/lib/workspace-logo";

export function publicAgencyLogoUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/agency-logos/${path}`;
}

export function PublicSiteHeader({
  agency,
  back,
}: {
  agency: { name: string; slug: string; logo_path?: string | null };
  back?:
    | { href: string; label: string }
    | { href: string; external: true; label: string };
}) {
  const logoUrl = workspaceLogoSrc(
    publicAgencyLogoUrl(agency.logo_path),
    agency.slug,
  );
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={`/careers/${agency.slug}`}
          className="flex min-w-0 items-center gap-2.5 rounded-md text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {logoUrl ? (
            // Agency logos are public, immutable Storage objects.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="size-8 shrink-0 rounded-md border border-border bg-white object-contain p-0.5"
            />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-md bg-[#5C5AED] text-sm font-semibold text-white"
            >
              {agency.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate">{agency.name}</span>
        </Link>
        {back &&
          ("external" in back ? (
            <a
              href={back.href}
              className="shrink-0 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {back.label}
            </a>
          ) : (
            <Link
              href={back.href}
              className="shrink-0 rounded-md text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              {back.label}
            </Link>
          ))}
      </div>
    </header>
  );
}

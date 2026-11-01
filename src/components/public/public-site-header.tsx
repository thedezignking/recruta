import Link from "next/link";
import { ArrowLeftIcon } from "@solar-icons/react/linear";
import { getPublicEnv } from "@/lib/env";
import { workspaceLogoSrc } from "@/lib/workspace-logo";
import { careerRails, careerRule } from "@/components/public/careers-layout";
import { cn } from "cn";

export function publicAgencyLogoUrl(path: string | null | undefined) {
  if (!path) return null;
  const base = getPublicEnv().NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/agency-logos/${path}`;
}

export function AgencyMark({
  agency,
  className,
}: {
  agency: { name: string; slug: string; logo_path?: string | null };
  className?: string;
}) {
  const logoUrl = workspaceLogoSrc(
    publicAgencyLogoUrl(agency.logo_path),
    agency.slug,
  );
  return logoUrl ? (
    // Agency logos are public, immutable Storage objects.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      className={cn(
        "size-8 shrink-0 rounded-lg border border-[#EBEBEB] bg-white object-contain p-0.5",
        className,
      )}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-lg bg-[#5C5AED] text-sm font-semibold text-white",
        className,
      )}
    >
      {agency.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const linkClass =
  "mk-press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[#E4E4E7] bg-white px-3.5 text-sm font-medium shadow-[0_1px_2px_rgb(17_17_17_/_0.05)] outline-none hover:bg-[#F8F8F8] focus-visible:ring-2 focus-visible:ring-[#5C5AED]";

export function PublicSiteHeader({
  agency,
  back,
}: {
  agency: { name: string; slug: string; logo_path?: string | null };
  back?:
    | { href: string; label: string }
    | { href: string; external: true; label: string };
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b bg-white/85 backdrop-blur-md",
        careerRule,
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center justify-between gap-4 px-5",
          careerRails,
          careerRule,
        )}
      >
        <Link
          href={`/careers/${agency.slug}`}
          className="flex min-w-0 items-center gap-2.5 rounded-md text-[15px] font-semibold tracking-[-0.01em] outline-none focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
        >
          <AgencyMark agency={agency} />
          <span className="truncate">{agency.name}</span>
        </Link>
        {back &&
          ("external" in back ? (
            <a href={back.href} className={linkClass}>
              {back.label}
            </a>
          ) : (
            <Link href={back.href} className={linkClass}>
              <ArrowLeftIcon aria-hidden="true" size={15} />
              {back.label}
            </Link>
          ))}
      </div>
    </header>
  );
}

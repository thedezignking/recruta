import { cn } from "cn";

/**
 * Top-level page title. In the agency workspace the desktop toolbar already
 * renders the page title as the h1, so this heading only appears below `lg`.
 * Shells without a toolbar title (the client portal) pass `standalone`.
 */
export function PageHeader({
  title,
  actions,
  standalone = false,
  className,
}: {
  title: string;
  actions?: React.ReactNode;
  standalone?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex items-center justify-between gap-3",
        !standalone && "lg:hidden",
        className,
      )}
    >
      <h1 className="min-w-0 text-balance text-2xl font-semibold tracking-[-0.045em]">
        {title}
      </h1>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/**
 * Header for a single record (job, application, organization, request).
 * Pair it with ToolbarBreadcrumb so the toolbar shows where the record lives.
 */
export function DetailHeader({
  media,
  title,
  meta,
  status,
  actions,
  divided = false,
  className,
}: {
  media?: React.ReactNode;
  title: string;
  meta?: React.ReactNode[];
  status?: React.ReactNode;
  actions?: React.ReactNode;
  /** Draw a rule under the header. */
  divided?: boolean;
  className?: string;
}) {
  const metaItems = meta?.filter(Boolean) ?? [];
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        divided && "border-b border-border pb-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3.5">
        {media && <div className="shrink-0">{media}</div>}
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1 className="min-w-0 text-balance text-xl font-semibold leading-7 tracking-[-0.03em]">
              {title}
            </h1>
            {status}
          </div>
          {metaItems.length > 0 && (
            <ul className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {metaItems.map((item, index) => (
                <li
                  key={index}
                  className="inline-flex min-w-0 items-center gap-1.5 [&_svg]:shrink-0"
                >
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </header>
  );
}

/** The compact 13px section heading used across Overview and Jobs. */
export function SectionHeader({
  title,
  id,
  count,
  countLabel,
  actions,
  className,
}: {
  title: string;
  id?: string;
  count?: number;
  countLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-9 flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <h2
          id={id}
          className="text-[13px] font-semibold tracking-[-0.01em] text-foreground"
        >
          {title}
        </h2>
        {count !== undefined && (
          <span
            className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground"
            aria-label={countLabel}
          >
            {count}
          </span>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/** A titled, bordered panel for detail pages. */
export function Panel({
  title,
  id,
  anchorId,
  count,
  actions,
  children,
  divided = false,
  className,
  bodyClassName,
}: {
  title: string;
  id?: string;
  /** In-page anchor for the whole panel (e.g. settings section links). */
  anchorId?: string;
  count?: number;
  actions?: React.ReactNode;
  children: React.ReactNode;
  /** Draw a rule between the title row and the body. */
  divided?: boolean;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId =
    id ?? `panel-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <section
      id={anchorId}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-20 overflow-hidden rounded-[10px] border border-border bg-card",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 px-4",
          divided ? "min-h-12 border-b border-border py-2" : "min-h-11 pt-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <h2 id={headingId} className="text-[13px] font-semibold">
            {title}
          </h2>
          {count !== undefined && (
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {count}
            </span>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-1">{actions}</div>
        )}
      </div>
      <div className={cn(divided ? "p-4" : "px-4 pt-2 pb-4", bodyClassName)}>
        {children}
      </div>
    </section>
  );
}

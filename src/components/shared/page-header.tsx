import { cn } from "cn";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  inlineActions = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  inlineActions?: boolean;
}) {
  return (
    <div>
      {eyebrow && (
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <div
        className={cn(
          "flex gap-4",
          inlineActions
            ? "items-center justify-between"
            : "flex-col sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <h1 className="min-w-0 text-balance text-2xl font-semibold tracking-[-0.045em] sm:text-[30px] sm:leading-10">
          {title}
        </h1>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {description && (
        <p className="mt-1 max-w-2xl text-pretty text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}

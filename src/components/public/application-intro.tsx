export function ApplicationIntro({
  title,
  organization,
  location,
  intro,
}: {
  title: string;
  organization?: string | null;
  location?: string | null;
  intro?: string | null;
}) {
  const subtitle = [organization, location].filter(Boolean).join(" · ");
  return (
    <header className="mb-10">
      <h1 className="text-balance text-[32px] leading-tight font-semibold tracking-[-0.04em]">
        Apply for {title}
      </h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
      {intro && (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{intro}</p>
      )}
    </header>
  );
}

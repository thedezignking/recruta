import { PageHeader } from "@/components/shared/page-header";

/** Section-nav layout shared by agency Settings and My account. */
export function SettingsLayout({
  title,
  sections,
  children,
}: {
  title: string;
  sections: { id: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="pb-20 lg:pb-0">
      <PageHeader title={title} />
      <div className="grid items-start gap-6 lg:grid-cols-[180px_minmax(0,1fr)] xl:gap-10">
        <nav
          aria-label={`${title} sections`}
          className="hidden lg:sticky lg:top-20 lg:block"
        >
          <ul className="flex flex-col gap-0.5 text-xs">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-md px-2.5 py-2 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex max-w-4xl min-w-0 flex-col gap-5">{children}</div>
      </div>
    </div>
  );
}

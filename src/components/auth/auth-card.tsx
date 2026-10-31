import Link from "next/link";
import { RecrutaLogo } from "@/components/shared/recruta-mark";
import { EvidenceMock } from "@/components/marketing/feature-mocks";

// Deterministic so server and client render the same field.
const bars = Array.from({ length: 64 }, (_, i) => {
  const wave = Math.sin(i * 0.25) * 0.2 + Math.sin(i * 0.8) * 0.1;
  return Math.max(0.5, Math.min(1, 0.7 + wave + (i % 5) * 0.03));
});
const tints = ["#5C5AED", "#6B69F0", "#7D7BF2", "#9290F5", "#A8A6F8"];

/**
 * Split auth layout shared by sign-in, sign-up, password and invitation
 * screens: the form on white, the product story on the brand panel.
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
  switchLink,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Top-right shortcut to the other auth screen. */
  switchLink?: { prompt: string; label: string; href: string };
}) {
  return (
    <div className="mk grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-dvh flex-col px-6 py-5 sm:px-10">
        <header className="flex h-10 items-center justify-between gap-4">
          <Link
            href="/"
            className="rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
          >
            <RecrutaLogo size="sm" />
          </Link>
          {switchLink && (
            <p className="text-sm text-muted-foreground">
              <span className="hidden sm:inline">{switchLink.prompt} </span>
              <Link
                href={switchLink.href}
                className="mk-press ml-1 inline-flex h-9 items-center rounded-lg border border-[#E4E4E7] px-3.5 font-medium text-foreground outline-none hover:bg-[#F8F8F8] focus-visible:ring-2 focus-visible:ring-[#5C5AED]"
              >
                {switchLink.label}
              </Link>
            </p>
          )}
        </header>
        <main
          id="main-content"
          className="mx-auto flex w-full max-w-[360px] flex-1 flex-col justify-center py-14 [&_[data-slot=input]]:h-10 [&_button[type=submit]]:h-10"
        >
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.04em]">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-[15px] leading-6 text-muted-foreground">
              {description}
            </p>
          )}
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-8 text-sm text-muted-foreground">{footer}</p>
          )}
        </main>
        <footer className="text-xs text-muted-foreground">
          © 2026 Evenkore
        </footer>
      </div>

      <aside
        aria-label="About Recruta"
        className="relative m-3 hidden overflow-hidden rounded-[16px] bg-[#23217A] text-white lg:flex lg:flex-col"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255_/_0.13)_1px,transparent_1.2px)] [background-size:10px_10px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_35%,#000,transparent)]"
        />
        <div className="relative px-12 pt-16 xl:px-16">
          <p className="font-mono text-xs text-[#C9C8FA]">
            automation prepares · people decide
          </p>
          <p className="mt-4 max-w-md text-[36px] leading-[1.08] font-semibold tracking-[-0.045em] text-balance">
            Turn every job into a placement.
          </p>
          <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/70">
            Publish jobs, screen CVs with evidence and send clients a shortlist,
            all from one workspace.
          </p>
        </div>

        <div className="relative mt-auto h-[58%] min-h-[340px]">
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 flex h-full items-end gap-[2px] px-[2px] [mask-image:linear-gradient(to_bottom,transparent,#000_40%)]"
          >
            {bars.map((height, i) => (
              <div
                key={i}
                className="mk-bar flex flex-1 flex-col-reverse gap-[2px]"
                style={
                  {
                    height: `${height * 100}%`,
                    "--mk-delay": `${i * 12}ms`,
                  } as React.CSSProperties
                }
              >
                {tints.map((tint) => (
                  <span
                    key={tint}
                    className="flex-1 rounded-[2px]"
                    style={{ background: tint, opacity: 0.55 }}
                  />
                ))}
              </div>
            ))}
          </div>
          <div className="relative flex h-full items-center justify-center px-10 text-foreground">
            <div className="w-full max-w-[460px] [&>div]:w-full">
              <EvidenceMock />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}

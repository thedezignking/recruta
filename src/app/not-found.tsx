import { ButtonLink } from "@/components/shared/button-link";
import { RecrutaLogo } from "@/components/shared/recruta-mark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center">
        <div className="flex justify-center">
          <RecrutaLogo />
        </div>
        <p className="mt-8 font-mono text-xs font-medium text-primary">404</p>
        <h1 className="mt-2 text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The page may have moved, or your account may not have access.
        </p>
        <ButtonLink className="mt-5" href="/app">
          Return to overview
        </ButtonLink>
      </div>
    </main>
  );
}
